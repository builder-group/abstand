use crate::{
    app::window::AppWindow,
    modules::{db::types::DatabaseState, intentions::repository::IntentionSessionRepository},
};
use tauri::{AppHandle, ExitRequestApi, Manager};

pub fn request_quit(app: &AppHandle, source: QuitRequestSource) {
    log::debug!(target: LOG_TARGET, "quit requested from {}", source.label());

    match assess_quit(app) {
        QuitDecision::Allowed => {
            app.exit(0);
        }
        QuitDecision::Denied { reason } => {
            handle_quit_denial(app, reason);
        }
    }
}

pub fn handle_exit_requested(app: &AppHandle, api: &ExitRequestApi) {
    match assess_quit(app) {
        QuitDecision::Allowed => {}
        QuitDecision::Denied { reason } => {
            api.prevent_exit();
            handle_quit_denial(app, reason);
        }
    }
}

fn assess_quit(app: &AppHandle) -> QuitDecision {
    let Some(db_state) = app.try_state::<DatabaseState>() else {
        log::warn!(target: LOG_TARGET, "database state unavailable, allowing quit");
        return QuitDecision::Allowed;
    };

    // Note: Quit events are synchronous; keep this check limited to a tiny local query
    let has_active_strict_block_session = tauri::async_runtime::block_on(
        IntentionSessionRepository::has_active_strict_block_session(&db_state.pool),
    );

    return match has_active_strict_block_session {
        Ok(true) => QuitDecision::Denied {
            reason: QuitDenialReason::ActiveStrictBlock,
        },
        Ok(false) => QuitDecision::Allowed,
        Err(error) => {
            log::error!(target: LOG_TARGET, "failed to assess quit policy: {}", error);
            QuitDecision::Allowed
        }
    };
}

fn handle_quit_denial(app: &AppHandle, reason: QuitDenialReason) {
    log::warn!(target: LOG_TARGET, "quit prevented: {}", reason.message());
    let _ = AppWindow::Main.show(app);
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QuitRequestSource {
    AppMenu,
    Tray,
}

impl QuitRequestSource {
    fn label(&self) -> &'static str {
        return match self {
            Self::AppMenu => "app menu",
            Self::Tray => "tray",
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum QuitDecision {
    Allowed,
    Denied { reason: QuitDenialReason },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum QuitDenialReason {
    ActiveStrictBlock,
}

impl QuitDenialReason {
    fn message(&self) -> &'static str {
        return match self {
            Self::ActiveStrictBlock => "Strict Enforcement is active",
        };
    }
}

const LOG_TARGET: &str = "app::quit_policy";
