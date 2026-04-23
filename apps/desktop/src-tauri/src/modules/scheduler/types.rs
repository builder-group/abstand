use super::scheduler::Scheduler;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub type ScheduledJobId = u64;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledJobDto {
    pub id: ScheduledJobId,
    pub label: String,
    pub scheduled_for_unix_ms: i64,
}

// MARK: - State

pub struct SchedulerState(pub Arc<Scheduler>);
