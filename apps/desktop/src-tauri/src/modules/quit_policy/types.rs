use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QuitRequestSource {
    AppMenu,
    ProcessSignal(ProcessQuitSignal),
    Tray,
}

impl QuitRequestSource {
    pub(super) fn label(&self) -> &'static str {
        return match self {
            Self::AppMenu => "app menu",
            Self::ProcessSignal(signal) => signal.label(),
            Self::Tray => "tray",
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProcessQuitSignal {
    Interrupt,
    Terminate,
}

impl ProcessQuitSignal {
    fn label(&self) -> &'static str {
        return match self {
            Self::Interrupt => "process signal SIGINT",
            Self::Terminate => "process signal SIGTERM",
        };
    }
}

// MARK: - State

pub struct QuitPolicyState {
    // Note: Tauri emits `ExitRequested` after `app.exit(0)`, so policy-approved exits need one handoff
    next_exit_request_approved: AtomicBool,
}

impl QuitPolicyState {
    pub fn init() -> Self {
        return Self {
            next_exit_request_approved: AtomicBool::new(false),
        };
    }

    pub fn approve_next_exit_request(&self) {
        self.next_exit_request_approved
            .store(true, Ordering::SeqCst);
    }

    pub fn consume_next_exit_request_approval(&self) -> bool {
        return self
            .next_exit_request_approved
            .swap(false, Ordering::SeqCst);
    }
}

// MARK: - Events

#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type, tauri_specta::Event,
)]
#[serde(tag = "reason", rename_all = "camelCase")]
pub enum QuitPreventedEvent {
    ActiveBalancedBlock {
        #[serde(rename = "durationMs")]
        duration_ms: i64,
    },
    ActiveStrictBlock,
}

impl QuitPreventedEvent {
    pub fn active_balanced_block(duration_ms: i64) -> Self {
        return Self::ActiveBalancedBlock { duration_ms };
    }

    pub fn active_strict_block() -> Self {
        return Self::ActiveStrictBlock;
    }
}
