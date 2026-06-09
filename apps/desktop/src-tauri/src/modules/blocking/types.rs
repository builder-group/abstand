use super::runtime::BlockingRuntime;
use serde::{Deserialize, Serialize};
use std::{ops::Deref, sync::Mutex};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BlockingDecision {
    Allowed,
    Blocked(BlockingViolation),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BlockingViolation {
    pub intention_id: i64,
    pub intention_name: String,
    pub blocked_target: BlockedTarget,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum BlockedTarget {
    #[serde(rename = "app", rename_all = "camelCase")]
    App { bundle_id: String },
    #[serde(rename = "website", rename_all = "camelCase")]
    Website { hostname: String },
    #[serde(rename = "device")]
    Device,
}

// MARK: - State

pub struct BlockingRuntimeState(Mutex<BlockingRuntime>);

impl BlockingRuntimeState {
    pub fn init() -> Self {
        return Self(Mutex::new(BlockingRuntime::new()));
    }
}

impl Deref for BlockingRuntimeState {
    type Target = Mutex<BlockingRuntime>;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}

// MARK: - Events

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
pub struct BlockingViolationChangedEvent(pub Option<BlockingViolation>);
