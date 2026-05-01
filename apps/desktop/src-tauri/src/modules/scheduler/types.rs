use super::scheduler::Scheduler;
use std::sync::Arc;

// MARK: - State

pub struct SchedulerState(pub Arc<Scheduler>);
