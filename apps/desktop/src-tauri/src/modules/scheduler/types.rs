use super::scheduler::Scheduler;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub type ScheduledJobId = u64;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum ScheduledJobTiming {
    After { delay_ms: u64 },
    AtUnixMs { unix_ms: i64 },
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledJobDto {
    pub id: ScheduledJobId,
    pub label: String,
    pub timing: ScheduledJobTiming,
    pub scheduled_for_unix_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledJobFiredPayload {
    pub job: ScheduledJobDto,
    pub fired_at_unix_ms: i64,
    pub payload: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledJobFiredEvent(pub ScheduledJobFiredPayload);

// MARK: - State

pub struct SchedulerState(pub Arc<Scheduler>);
