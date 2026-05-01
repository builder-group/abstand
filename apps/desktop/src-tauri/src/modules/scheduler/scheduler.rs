use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::AppHandle;
use tokio::{sync::watch, time::Instant};

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

    /// Schedules a one-shot callback to run after the provided delay in wall-clock time.
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
            .insert_job(
                label.into(),
                Self::unix_ms_now() + delay.as_millis() as i64,
                Box::new(action),
            )
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
        return self.insert_job(label.into(), unix_ms, Box::new(action)).id;
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
    pub fn list_jobs(&self) -> Vec<ScheduledJobSummary> {
        let mut jobs = self
            .jobs
            .lock()
            .unwrap()
            .values()
            .map(ScheduledJobSummary::from)
            .collect::<Vec<_>>();

        jobs.sort_by_key(|job| job.scheduled_for_unix_ms);
        return jobs;
    }

    fn insert_job(
        &self,
        label: String,
        scheduled_for_unix_ms: i64,
        action: ScheduledJobAction,
    ) -> ScheduledJobSummary {
        let job_id = self.next_job_id.fetch_add(1, Ordering::Relaxed);
        let job = ScheduledJob {
            id: job_id,
            label,
            scheduled_for_unix_ms,
            action,
        };
        let job_summary = ScheduledJobSummary::from(&job);

        self.jobs.lock().unwrap().insert(job_id, job);
        self.notify_runner();

        return job_summary;
    }

    async fn run(self: Arc<Self>, app: AppHandle) {
        let mut wake_rx = self.wake_tx.subscribe();

        loop {
            let now = Self::now();
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
        for job in jobs {
            // Dispatch callbacks off the scheduler loop so one slow job does not delay the next one
            let app = app.clone();
            tokio::task::spawn_blocking(move || {
                let action = job.action;
                action(app);
            });
        }
    }

    fn pop_due_jobs(&self, now: &SchedulerNow) -> Vec<ScheduledJob> {
        let mut jobs = self.jobs.lock().unwrap();
        let due_job_ids = jobs
            .iter()
            .filter(|(_, job)| job.is_due(now))
            .map(|(job_id, _)| *job_id)
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
            .map(|job| job.next_deadline(now, Self::MAX_SLEEP))
            .min();
    }

    fn notify_runner(&self) {
        let _ = self.wake_tx.send(());
    }

    fn now() -> SchedulerNow {
        return SchedulerNow {
            instant: Instant::now(),
            unix_ms: Self::unix_ms_now(),
        };
    }

    fn unix_ms_now() -> i64 {
        let duration = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or(Duration::ZERO);

        return duration.as_millis() as i64;
    }

    // Tokio's monotonic clock pauses during system sleep, so without periodic wall-clock re-checks
    // a job could fire late after wake. 5 s is imperceptible for Intention scheduling.
    const MAX_SLEEP: Duration = Duration::from_millis(5_000);
}

struct ScheduledJob {
    id: ScheduledJobId,
    label: String,
    scheduled_for_unix_ms: i64,
    action: ScheduledJobAction,
}

impl ScheduledJob {
    fn is_due(&self, now: &SchedulerNow) -> bool {
        return self.scheduled_for_unix_ms <= now.unix_ms;
    }

    fn next_deadline(&self, now: &SchedulerNow, max_sleep: Duration) -> Instant {
        let remaining_ms = if self.scheduled_for_unix_ms <= now.unix_ms {
            0
        } else {
            (self.scheduled_for_unix_ms - now.unix_ms) as u64
        };

        if remaining_ms == 0 {
            return now.instant;
        }

        // Without the cap, a job with hours remaining would sleep through system sleep/wake and fire late
        let sleep_ms = remaining_ms.min(max_sleep.as_millis() as u64);
        return now.instant + Duration::from_millis(sleep_ms);
    }
}

struct SchedulerNow {
    instant: Instant,
    unix_ms: i64,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ScheduledJobSummary {
    pub id: ScheduledJobId,
    pub label: String,
    pub scheduled_for_unix_ms: i64,
}

impl From<&ScheduledJob> for ScheduledJobSummary {
    fn from(job: &ScheduledJob) -> Self {
        return ScheduledJobSummary {
            id: job.id,
            label: job.label.clone(),
            scheduled_for_unix_ms: job.scheduled_for_unix_ms,
        };
    }
}

type ScheduledJobAction = Box<dyn FnOnce(AppHandle) + Send + 'static>;
pub type ScheduledJobId = u64;

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
    }

    #[test]
    fn schedule_after_targets_wall_clock_time() {
        let scheduler = Scheduler::new();
        let before = Scheduler::unix_ms_now();

        scheduler.schedule_after("wall-clock", Duration::from_secs(5), |_app| {});
        let jobs = scheduler.list_jobs();

        assert!(jobs[0].scheduled_for_unix_ms >= before + 5_000);
        assert!(jobs[0].scheduled_for_unix_ms <= before + 6_000);
    }

    #[test]
    fn schedule_at_unix_ms_adds_absolute_job_to_public_list() {
        let scheduler = Scheduler::new();
        let unix_ms = Scheduler::unix_ms_now() + 10_000;

        let job_id = scheduler.schedule_at_unix_ms("absolute", unix_ms, |_app| {});
        let jobs = scheduler.list_jobs();

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].id, job_id);
        assert_eq!(jobs[0].label, "absolute");
        assert_eq!(jobs[0].scheduled_for_unix_ms, unix_ms);
    }

    #[test]
    fn cancel_removes_job_before_it_fires() {
        let scheduler = Scheduler::new();
        let job_id = scheduler.schedule_after("cancel", Duration::from_secs(30), |_app| {});

        assert!(scheduler.cancel(job_id));
        assert!(scheduler.list_jobs().is_empty());
    }

    #[test]
    fn list_jobs_returns_jobs_ordered_by_scheduled_time() {
        let scheduler = Scheduler::new();
        let now_unix_ms = Scheduler::unix_ms_now();

        scheduler.schedule_at_unix_ms("later", now_unix_ms + 20_000, |_app| {});
        scheduler.schedule_after("earlier", Duration::from_secs(1), |_app| {});

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
