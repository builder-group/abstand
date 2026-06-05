use super::types::{QuitPreventedEvent, QuitPreventedReason, QuitRequestSource};
use crate::{
    app::window::AppWindow,
    modules::{db::types::DatabaseState, intentions::repository::IntentionSessionRepository},
};
use tauri::{AppHandle, ExitRequestApi, Manager};
use tauri_specta::Event;

pub async fn request_quit(app: &AppHandle, source: QuitRequestSource) {
    log::debug!(target: LOG_TARGET, "quit requested from {}", source.label());

    match assess_quit(app).await {
        QuitDecision::Allowed => {
            app.exit(0);
        }
        QuitDecision::Denied { reason } => {
            handle_quit_denial(app, reason);
        }
    }
}

pub fn request_quit_blocking(app: &AppHandle, source: QuitRequestSource) {
    tauri::async_runtime::block_on(request_quit(app, source));
}

pub fn handle_exit_requested(app: &AppHandle, api: &ExitRequestApi) {
    // Note: RunEvent::ExitRequested is synchronous, so prevent_exit must be decided before returning
    match tauri::async_runtime::block_on(assess_quit(app)) {
        QuitDecision::Allowed => {}
        QuitDecision::Denied { reason } => {
            api.prevent_exit();
            handle_quit_denial(app, reason);
        }
    }
}

fn handle_quit_denial(app: &AppHandle, reason: QuitPreventedReason) {
    log::warn!(target: LOG_TARGET, "quit prevented: {}", reason.message());
    let _ = QuitPreventedEvent { reason }.emit(app);
    let _ = AppWindow::Main.show(app);
}

async fn assess_quit(app: &AppHandle) -> QuitDecision {
    let Some(db_state) = app.try_state::<DatabaseState>() else {
        log::warn!(target: LOG_TARGET, "database state unavailable, allowing quit");
        return QuitDecision::Allowed;
    };
    let pool = db_state.pool.clone();

    let has_active_strict_block_session =
        IntentionSessionRepository::has_active_strict_block_session(&pool).await;

    return match has_active_strict_block_session {
        Ok(true) => QuitDecision::Denied {
            reason: QuitPreventedReason::ActiveStrictBlock,
        },
        Ok(false) => QuitDecision::Allowed,
        Err(error) => {
            log::error!(target: LOG_TARGET, "failed to assess quit policy: {}", error);
            QuitDecision::Allowed
        }
    };
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum QuitDecision {
    Allowed,
    Denied { reason: QuitPreventedReason },
}

const LOG_TARGET: &str = "modules::quit_policy";
