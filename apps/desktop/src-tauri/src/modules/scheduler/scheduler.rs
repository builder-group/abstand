use super::types::{
    ScheduledJobDto, ScheduledJobFiredEvent, ScheduledJobFiredPayload, ScheduledJobId,
    ScheduledJobTiming,
};
use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::AppHandle;
use tauri_specta::Event;
use tokio::{sync::watch, time::Instant};

type ScheduledJobAction = Box<dyn FnOnce(AppHandle) + Send + 'static>;

pub struct Scheduler {
    jobs: Mutex<HashMap<ScheduledJobId, ScheduledJob>>,
    next_job_id: AtomicU64,
    wake_tx: watch::Sender<()>,
}

impl Scheduler {
    pub fn new() -> Self {
        let (wake_tx, _) = watch::channel(());

        return Self {
            jobs: Mutex::new(HashMap::new()),
            next_job_id: AtomicU64::new(1),
            wake_tx,
        };
    }

    /// Starts the background scheduler loop for this shared instance.
    pub fn spawn(self: &Arc<Self>, app: AppHandle) {
        let scheduler = Arc::clone(self);

        tauri::async_runtime::spawn(async move {
            scheduler.run(app).await;
        });
    }

    /// Schedules a one-shot callback to run after the provided delay.
    pub fn schedule_after<F>(
        &self,
        label: impl Into<String>,
        delay: Duration,
        action: F,
    ) -> ScheduledJobId
    where
        F: FnOnce(AppHandle) + Send + 'static,
    {
        return self
            .insert_job(ScheduledJobDefinition {
                label: label.into(),
                timing: ScheduledJobTiming::After {
                    delay_ms: delay.as_millis() as u64,
                },
                event_payload: None,
                action: Some(Box::new(action)),
            })
            .id;
    }

    /// Schedules a one-shot callback to run at the provided Unix timestamp in milliseconds.
    pub fn schedule_at_unix_ms<F>(
        &self,
        label: impl Into<String>,
        unix_ms: i64,
        action: F,
    ) -> ScheduledJobId
    where
        F: FnOnce(AppHandle) + Send + 'static,
    {
        return self
            .insert_job(ScheduledJobDefinition {
                label: label.into(),
                timing: ScheduledJobTiming::AtUnixMs { unix_ms },
                event_payload: None,
                action: Some(Box::new(action)),
            })
            .id;
    }

    /// Schedules a one-shot event job to run after the provided delay.
    pub fn schedule_event_after(
        &self,
        label: impl Into<String>,
        delay: Duration,
        payload: Option<String>,
    ) -> ScheduledJobDto {
        return self.insert_job(ScheduledJobDefinition {
            label: label.into(),
            timing: ScheduledJobTiming::After {
                delay_ms: delay.as_millis() as u64,
            },
            event_payload: payload,
            action: None,
        });
    }

    /// Schedules a one-shot event job to run at the provided Unix timestamp in milliseconds.
    pub fn schedule_event_at_unix_ms(
        &self,
        label: impl Into<String>,
        unix_ms: i64,
        payload: Option<String>,
    ) -> ScheduledJobDto {
        return self.insert_job(ScheduledJobDefinition {
            label: label.into(),
            timing: ScheduledJobTiming::AtUnixMs { unix_ms },
            event_payload: payload,
            action: None,
        });
    }

    /// Cancels a scheduled job by id if it has not fired yet.
    pub fn cancel(&self, job_id: ScheduledJobId) -> bool {
        let removed_job = self.jobs.lock().unwrap().remove(&job_id);
        if removed_job.is_none() {
            return false;
        }

        self.notify_runner();
        return true;
    }

    /// Returns the currently scheduled in-memory jobs ordered by their scheduled time.
    pub fn list_jobs(&self) -> Vec<ScheduledJobDto> {
        let mut jobs = self
            .jobs
            .lock()
            .unwrap()
            .values()
            .map(ScheduledJob::to_dto)
            .collect::<Vec<_>>();

        jobs.sort_by_key(|job| job.scheduled_for_unix_ms);
        return jobs;
    }

    fn insert_job(&self, definition: ScheduledJobDefinition) -> ScheduledJobDto {
        let scheduled_at = Self::resolve_scheduled_at(&definition.timing);
        let job_id = self.next_job_id();
        let job = ScheduledJob {
            id: job_id,
            label: definition.label,
            timing: definition.timing,
            scheduled_for_unix_ms: scheduled_at.scheduled_for_unix_ms,
            relative_deadline: scheduled_at.relative_deadline,
            event_payload: definition.event_payload,
            action: definition.action,
        };
        let job_dto = job.to_dto();

        self.jobs.lock().unwrap().insert(job_id, job);
        self.notify_runner();

        return job_dto;
    }

    async fn run(self: Arc<Self>, app: AppHandle) {
        let mut wake_rx = self.subscribe();

        loop {
            let now = Self::capture_now();
            let due_jobs = self.pop_due_jobs(&now);
            if !due_jobs.is_empty() {
                self.fire_jobs(&app, due_jobs);
                continue;
            }

            match self.next_deadline(&now) {
                Some(deadline) => {
                    let mut sleep = std::pin::pin!(tokio::time::sleep_until(deadline));

                    tokio::select! {
                        _ = sleep.as_mut() => {}
                        result = wake_rx.changed() => {
                            if result.is_err() {
                                return;
                            }
                        }
                    }
                }
                None => {
                    if wake_rx.changed().await.is_err() {
                        return;
                    }
                }
            }
        }
    }

    fn fire_jobs(&self, app: &AppHandle, jobs: Vec<ScheduledJob>) {
        let fired_at_unix_ms = Self::unix_timestamp_ms_now();

        for mut job in jobs {
            let event = ScheduledJobFiredEvent(ScheduledJobFiredPayload {
                job: job.to_dto(),
                fired_at_unix_ms,
                payload: job.event_payload.clone(),
            });
            let _ = event.emit(app);

            if let Some(action) = job.action.take() {
                // Dispatch callbacks off the scheduler loop so one slow job does not delay the next one
                let app = app.clone();
                tokio::task::spawn_blocking(move || {
                    action(app);
                });
            }
        }
    }

    fn pop_due_jobs(&self, now: &SchedulerNow) -> Vec<ScheduledJob> {
        let mut jobs = self.jobs.lock().unwrap();
        let due_job_ids = jobs
            .iter()
            .filter_map(|(job_id, job)| {
                if job.is_due(now) {
                    return Some(*job_id);
                }

                return None;
            })
            .collect::<Vec<_>>();

        return due_job_ids
            .into_iter()
            .filter_map(|job_id| jobs.remove(&job_id))
            .collect();
    }

    fn next_deadline(&self, now: &SchedulerNow) -> Option<Instant> {
        return self
            .jobs
            .lock()
            .unwrap()
            .values()
            .filter_map(|job| {
                job.next_deadline(
                    now,
                    Duration::from_millis(Self::ABSOLUTE_JOB_RECONCILE_INTERVAL_MS),
                )
            })
            .min();
    }

    fn next_job_id(&self) -> ScheduledJobId {
        return self.next_job_id.fetch_add(1, Ordering::Relaxed);
    }

    fn notify_runner(&self) {
        let _ = self.wake_tx.send(());
    }

    fn subscribe(&self) -> watch::Receiver<()> {
        return self.wake_tx.subscribe();
    }

    fn resolve_scheduled_at(timing: &ScheduledJobTiming) -> ResolvedScheduledAt {
        let now_unix_ms = Self::unix_timestamp_ms_now();

        return match timing {
            ScheduledJobTiming::After { delay_ms } => ResolvedScheduledAt {
                scheduled_for_unix_ms: now_unix_ms + *delay_ms as i64,
                relative_deadline: Some(Instant::now() + Duration::from_millis(*delay_ms)),
            },
            ScheduledJobTiming::AtUnixMs { unix_ms } => ResolvedScheduledAt {
                // Tokio's monotonic clock pauses during system sleep, so a deadline computed once
                // at schedule time would fire late if the Mac sleeps during the window. The runner
                // re-checks SystemTime::now() on a short cadence instead.
                scheduled_for_unix_ms: *unix_ms,
                relative_deadline: None,
            },
        };
    }

    fn capture_now() -> SchedulerNow {
        return SchedulerNow {
            instant: Instant::now(),
            unix_ms: Self::unix_timestamp_ms_now(),
        };
    }

    fn unix_timestamp_ms_now() -> i64 {
        let duration = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or(Duration::ZERO);

        return duration.as_millis() as i64;
    }

    // Absolute-time jobs re-evaluate against wall clock on this cadence.
    // Caps the latency after system wake; 5 s is imperceptible for Intention scheduling.
    const ABSOLUTE_JOB_RECONCILE_INTERVAL_MS: u64 = 5_000;
}

struct ScheduledJob {
    id: ScheduledJobId,
    label: String,
    timing: ScheduledJobTiming,
    scheduled_for_unix_ms: i64,
    // Relative jobs use a monotonic deadline; absolute jobs stay anchored to scheduled_for_unix_ms
    relative_deadline: Option<Instant>,
    event_payload: Option<String>,
    action: Option<ScheduledJobAction>,
}

impl ScheduledJob {
    fn to_dto(&self) -> ScheduledJobDto {
        return ScheduledJobDto {
            id: self.id,
            label: self.label.clone(),
            timing: self.timing.clone(),
            scheduled_for_unix_ms: self.scheduled_for_unix_ms,
        };
    }

    fn is_due(&self, now: &SchedulerNow) -> bool {
        return match self.timing {
            ScheduledJobTiming::After { .. } => self
                .relative_deadline
                .map(|deadline| deadline <= now.instant)
                .unwrap_or(false),
            ScheduledJobTiming::AtUnixMs { .. } => self.scheduled_for_unix_ms <= now.unix_ms,
        };
    }

    fn next_deadline(
        &self,
        now: &SchedulerNow,
        absolute_time_reconciliation_interval: Duration,
    ) -> Option<Instant> {
        return match self.timing {
            ScheduledJobTiming::After { .. } => self.relative_deadline,
            ScheduledJobTiming::AtUnixMs { .. } => {
                let remaining_delay_ms = if self.scheduled_for_unix_ms <= now.unix_ms {
                    0
                } else {
                    (self.scheduled_for_unix_ms - now.unix_ms) as u64
                };
                if remaining_delay_ms == 0 {
                    return Some(now.instant);
                }

                // Without the cap, a job with hours remaining would sleep through system sleep/wake and fire late
                let reconcile_delay = remaining_delay_ms
                    .min(absolute_time_reconciliation_interval.as_millis() as u64);
                return Some(now.instant + Duration::from_millis(reconcile_delay));
            }
        };
    }
}

struct ScheduledJobDefinition {
    label: String,
    timing: ScheduledJobTiming,
    event_payload: Option<String>,
    action: Option<ScheduledJobAction>,
}

struct ResolvedScheduledAt {
    scheduled_for_unix_ms: i64,
    relative_deadline: Option<Instant>,
}

struct SchedulerNow {
    instant: Instant,
    unix_ms: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schedule_after_adds_callback_job_to_public_list() {
        let scheduler = Scheduler::new();

        let job_id = scheduler.schedule_after("callback", Duration::from_secs(5), |_app| {});
        let jobs = scheduler.list_jobs();

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].id, job_id);
        assert_eq!(jobs[0].label, "callback");
        assert!(matches!(
            jobs[0].timing,
            ScheduledJobTiming::After { delay_ms: 5_000 }
        ));
    }

    #[test]
    fn schedule_at_unix_ms_adds_absolute_job_to_public_list() {
        let scheduler = Scheduler::new();
        let unix_ms = Scheduler::unix_timestamp_ms_now() + 10_000;

        let job_id = scheduler.schedule_at_unix_ms("absolute", unix_ms, |_app| {});
        let jobs = scheduler.list_jobs();

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].id, job_id);
        assert_eq!(jobs[0].label, "absolute");
        assert!(
            matches!(jobs[0].timing, ScheduledJobTiming::AtUnixMs { unix_ms: value } if value == unix_ms)
        );
        assert_eq!(jobs[0].scheduled_for_unix_ms, unix_ms);
    }

    #[test]
    fn schedule_event_after_adds_event_job_to_public_list() {
        let scheduler = Scheduler::new();

        let job = scheduler.schedule_event_after(
            "event",
            Duration::from_secs(30),
            Some("payload".to_string()),
        );
        let jobs = scheduler.list_jobs();

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].id, job.id);
        assert_eq!(jobs[0].label, "event");
        assert!(matches!(
            jobs[0].timing,
            ScheduledJobTiming::After { delay_ms: 30_000 }
        ));
    }

    #[test]
    fn schedule_event_at_unix_ms_adds_absolute_event_job_to_public_list() {
        let scheduler = Scheduler::new();
        let unix_ms = Scheduler::unix_timestamp_ms_now() + 15_000;

        let job = scheduler.schedule_event_at_unix_ms("absolute-event", unix_ms, None);
        let jobs = scheduler.list_jobs();

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].id, job.id);
        assert_eq!(jobs[0].label, "absolute-event");
        assert!(
            matches!(jobs[0].timing, ScheduledJobTiming::AtUnixMs { unix_ms: value } if value == unix_ms)
        );
        assert_eq!(jobs[0].scheduled_for_unix_ms, unix_ms);
    }

    #[test]
    fn cancel_removes_job_before_it_fires() {
        let scheduler = Scheduler::new();
        let job_id = scheduler
            .schedule_event_after("cancel", Duration::from_secs(30), None)
            .id;

        assert!(scheduler.cancel(job_id));
        assert!(scheduler.list_jobs().is_empty());
    }

    #[test]
    fn list_jobs_returns_jobs_ordered_by_scheduled_time() {
        let scheduler = Scheduler::new();
        let now_unix_ms = Scheduler::unix_timestamp_ms_now();

        scheduler.schedule_event_at_unix_ms("later", now_unix_ms + 20_000, None);
        scheduler.schedule_event_after("earlier", Duration::from_secs(1), None);

        let jobs = scheduler.list_jobs();

        assert_eq!(jobs.len(), 2);
        assert_eq!(jobs[0].label, "earlier");
        assert_eq!(jobs[1].label, "later");
        assert!(jobs[0].scheduled_for_unix_ms <= jobs[1].scheduled_for_unix_ms);
    }

    #[test]
    fn cancel_returns_false_for_unknown_job() {
        let scheduler = Scheduler::new();

        assert!(!scheduler.cancel(999));
    }
}
