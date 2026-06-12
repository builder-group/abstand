use super::runtime::BlockingRuntime;
use serde::{Deserialize, Serialize};
use std::{ops::Deref, sync::Mutex};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BlockingViolation {
    pub intention_id: i64,
    pub intention_name: String,
    pub session_id: i64,
    pub session_started_at: i64,
    pub session_automatic_end_at: Option<i64>,
    pub blocked_target: BlockedTarget,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum BlockedTarget {
    #[serde(rename = "app", rename_all = "camelCase")]
    App {
        bundle_id: String,
        display_name: String,
        icon: Option<String>,
        color: Option<String>,
    },
    #[serde(rename = "website", rename_all = "camelCase")]
    Website {
        hostname: String,
        display_name: String,
        icon: Option<String>,
        color: Option<String>,
    },
    #[serde(rename = "device", rename_all = "camelCase")]
    Device { display_name: String },
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

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct BlockedAppQuitTimedOutEvent {
    pub bundle_id: String,
}
