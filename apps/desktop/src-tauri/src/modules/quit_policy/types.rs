use serde::{Deserialize, Serialize};

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

// MARK: - Events

#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type, tauri_specta::Event,
)]
#[serde(rename_all = "camelCase")]
pub struct QuitPreventedEvent {
    pub reason: QuitPreventedReason,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum QuitPreventedReason {
    ActiveStrictBlock,
}

impl QuitPreventedReason {
    pub(super) fn message(&self) -> &'static str {
        return match self {
            Self::ActiveStrictBlock => "Strict Enforcement is active",
        };
    }
}
