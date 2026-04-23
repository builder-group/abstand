//! Runs in-memory scheduled jobs while the app process is alive.

pub mod scheduler;
pub mod types;

use scheduler::Scheduler;
use std::sync::Arc;
use std::time::Duration;
use tauri::{App, AppHandle, Manager};
use types::{ScheduledJobDto, ScheduledJobId, SchedulerState};

pub fn setup(app: &App) {
    let scheduler = Arc::new(Scheduler::new());
    scheduler.spawn(app.handle().clone());
    app.manage(SchedulerState(scheduler));
}

/// Schedules a one-shot callback to run after the provided delay in wall-clock time.
#[allow(dead_code)]
pub fn schedule_after<F>(
    app: &AppHandle,
    label: impl Into<String>,
    delay: Duration,
    action: F,
) -> ScheduledJobId
where
    F: FnOnce(AppHandle) + Send + 'static,
{
    let state = app.state::<SchedulerState>();
    return state.0.schedule_after(label, delay, action);
}

/// Schedules a one-shot callback to run at the provided Unix timestamp in milliseconds.
#[allow(dead_code)]
pub fn schedule_at_unix_ms<F>(
    app: &AppHandle,
    label: impl Into<String>,
    unix_ms: i64,
    action: F,
) -> ScheduledJobId
where
    F: FnOnce(AppHandle) + Send + 'static,
{
    let state = app.state::<SchedulerState>();
    return state.0.schedule_at_unix_ms(label, unix_ms, action);
}

/// Cancels a scheduled job by id if it has not fired yet.
#[allow(dead_code)]
pub fn cancel_job(app: &AppHandle, job_id: ScheduledJobId) -> bool {
    let state = app.state::<SchedulerState>();
    return state.0.cancel(job_id);
}

/// Returns the currently scheduled in-memory jobs ordered by their scheduled time.
#[allow(dead_code)]
pub fn list_jobs(app: &AppHandle) -> Vec<ScheduledJobDto> {
    let state = app.state::<SchedulerState>();
    return state.0.list_jobs();
}
