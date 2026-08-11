use super::types::{QuitPolicyState, QuitPreventedEvent, QuitRequestSource};
use crate::{
    app::window::AppWindow,
    common::time::unix_ms_now,
    modules::{
        activity::recorder::ForegroundActivityRecorder,
        db::types::DatabaseState,
        intentions::{
            intention::IntentionEnforcementMode, repository::IntentionSessionRepository,
            types::IntentionRuntimeState,
        },
    },
};
use tauri::{AppHandle, ExitRequestApi, Manager};
use tauri_specta::Event;

pub async fn request_quit(app: &AppHandle, source: QuitRequestSource) {
    log::debug!(target: LOG_TARGET, "quit requested from {}", source.label());

    match assess_quit(app, QuitAssessmentMode::Unconfirmed).await {
        QuitDecision::Allowed => {
            if let Err(error) = approve_next_exit_request(app) {
                log::error!(target: LOG_TARGET, "failed to request quit: {}", error);
                return;
            }

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

pub fn request_restart(app: &AppHandle) -> Result<(), String> {
    log::debug!(target: LOG_TARGET, "restart requested");

    // Note: Restart is a controlled relaunch, not a quit. Approve the Tauri exit
    // handoff so ExitRequested does not assess it as a normal quit.
    if let Err(error) = approve_next_exit_request(app) {
        log::error!(target: LOG_TARGET, "failed to request restart: {}", error);
        return Err(error);
    }

    app.restart();
}

pub async fn confirm_balanced_quit(app: &AppHandle) -> Result<(), String> {
    match assess_quit(app, QuitAssessmentMode::ConfirmedBalanced).await {
        QuitDecision::Allowed => {
            // Note: Quitting is app-wide, so confirmation ends every active Balanced Abstand
            stop_active_balanced_intentions(app).await?;

            // Note: Reassess because each stop reevaluates schedules and may start another Intention
            if let QuitDecision::Denied { reason } =
                assess_quit(app, QuitAssessmentMode::Unconfirmed).await
            {
                handle_quit_denial(app, reason);
                return Err(reason.message().to_string());
            }

            approve_next_exit_request(app)?;
            app.exit(0);
            return Ok(());
        }
        QuitDecision::Denied { reason } => {
            handle_quit_denial(app, reason);
            return Err(reason.message().to_string());
        }
    }
}

async fn stop_active_balanced_intentions(app: &AppHandle) -> Result<(), String> {
    let database_state = app
        .try_state::<DatabaseState>()
        .ok_or_else(|| "Database state unavailable".to_string())?;
    let runtime_state = app
        .try_state::<IntentionRuntimeState>()
        .ok_or_else(|| "Intention runtime state unavailable".to_string())?;
    let intention_ids =
        IntentionSessionRepository::get_active_block_intention_ids_with_enforcement(
            &database_state.pool,
            IntentionEnforcementMode::Balanced,
        )
        .await
        .map_err(|error| error.to_string())?;

    for intention_id in intention_ids {
        runtime_state
            .stop_intention(app, intention_id)
            .await
            .map_err(|error| error.to_string())?;
    }

    return Ok(());
}

pub async fn handle_recovery_relaunch(app: &AppHandle) {
    log::debug!(target: LOG_TARGET, "handling recovery-agent relaunch");

    if let QuitDecision::Denied { reason } = assess_quit(app, QuitAssessmentMode::Unconfirmed).await
    {
        handle_quit_denial(app, reason);
    }
}

pub fn handle_exit_requested(app: &AppHandle, api: &ExitRequestApi) {
    // App-initiated exits are assessed before `app.exit(0)` and approved for this callback
    let decision = if consume_next_exit_request_approval(app) {
        QuitDecision::Allowed
    } else {
        // Note: RunEvent::ExitRequested is synchronous, so prevent_exit must be decided before returning
        tauri::async_runtime::block_on(assess_quit(app, QuitAssessmentMode::Unconfirmed))
    };

    match decision {
        QuitDecision::Allowed => {
            let _ = tauri::async_runtime::block_on(ForegroundActivityRecorder::close_active(
                app,
                unix_ms_now(),
            ));
        }
        QuitDecision::Denied { reason } => {
            api.prevent_exit();
            handle_quit_denial(app, reason);
        }
    };
}

fn approve_next_exit_request(app: &AppHandle) -> Result<(), String> {
    let Some(quit_policy_state) = app.try_state::<QuitPolicyState>() else {
        log::error!(target: LOG_TARGET, "quit policy state unavailable");
        return Err("Quit policy state unavailable".to_string());
    };

    quit_policy_state.approve_next_exit_request();
    return Ok(());
}

fn consume_next_exit_request_approval(app: &AppHandle) -> bool {
    let Some(quit_policy_state) = app.try_state::<QuitPolicyState>() else {
        log::error!(target: LOG_TARGET, "quit policy state unavailable");
        return false;
    };

    return quit_policy_state.consume_next_exit_request_approval();
}

async fn assess_quit(app: &AppHandle, mode: QuitAssessmentMode) -> QuitDecision {
    let Some(database_state) = app.try_state::<DatabaseState>() else {
        log::warn!(target: LOG_TARGET, "database state unavailable, allowing quit");
        return QuitDecision::Allowed;
    };
    let pool = database_state.pool.clone();

    match IntentionSessionRepository::get_active_block_intention_ids_with_enforcement(
        &pool,
        IntentionEnforcementMode::Strict,
    )
    .await
    {
        Ok(intention_ids) if !intention_ids.is_empty() => {
            return QuitDecision::Denied {
                reason: QuitPreventedReason::ActiveStrictBlock,
            };
        }
        Ok(_) => {}
        Err(error) => {
            log::error!(target: LOG_TARGET, "failed to assess quit policy: {}", error);
            return QuitDecision::Allowed;
        }
    };

    match IntentionSessionRepository::get_max_active_balanced_block_delay_ms(&pool).await {
        Ok(Some(duration_ms)) => {
            return match mode {
                QuitAssessmentMode::ConfirmedBalanced => QuitDecision::Allowed,
                QuitAssessmentMode::Unconfirmed => QuitDecision::Denied {
                    reason: QuitPreventedReason::ActiveBalancedBlock { duration_ms },
                },
            };
        }
        Ok(None) => {}
        Err(error) => {
            log::error!(target: LOG_TARGET, "failed to assess quit policy: {}", error);
            return QuitDecision::Allowed;
        }
    }

    return QuitDecision::Allowed;
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum QuitAssessmentMode {
    Unconfirmed,
    ConfirmedBalanced,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum QuitDecision {
    Allowed,
    Denied { reason: QuitPreventedReason },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum QuitPreventedReason {
    ActiveBalancedBlock { duration_ms: i64 },
    ActiveStrictBlock,
}

impl QuitPreventedReason {
    fn message(&self) -> &'static str {
        return match self {
            Self::ActiveBalancedBlock { .. } => "Balanced Enforcement is active",
            Self::ActiveStrictBlock => "Strict Enforcement is active",
        };
    }

    fn to_event(&self) -> QuitPreventedEvent {
        return match self {
            Self::ActiveBalancedBlock { duration_ms } => {
                QuitPreventedEvent::active_balanced_block(*duration_ms)
            }
            Self::ActiveStrictBlock => QuitPreventedEvent::active_strict_block(),
        };
    }
}

fn handle_quit_denial(app: &AppHandle, reason: QuitPreventedReason) {
    log::warn!(target: LOG_TARGET, "quit prevented: {}", reason.message());
    let _ = reason.to_event().emit(app);
    let _ = AppWindow::Main.show(app);
}

const LOG_TARGET: &str = "modules::quit_policy";
