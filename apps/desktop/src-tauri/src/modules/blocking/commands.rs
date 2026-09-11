use super::{
    runtime,
    types::{BlockedAppQuitTimedOutEvent, BlockedTarget, BlockingRuntimeState, BlockingViolation},
};
use crate::{
    app::window::main_window::{self, types::MainWindowFocusedLevel},
    environment::configs::app::AppConfig,
};
use serde::Serialize;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

#[tauri::command]
#[specta::specta]
pub async fn get_blocking_violation(app: AppHandle, key: String) -> Option<BlockingViolation> {
    let key = key.trim();
    if key.is_empty() {
        return None;
    }

    let runtime_state = app.state::<BlockingRuntimeState>();
    return runtime_state.lock().unwrap().violation(key);
}

#[tauri::command]
#[specta::specta]
pub async fn pause_blocking_overlay(
    app: AppHandle,
    key: String,
    duration_ms: u64,
) -> Result<(), String> {
    if key.trim().is_empty() {
        return Err("Blocking overlay key is required".to_string());
    }

    let pause_duration = Duration::from_millis(duration_ms);
    let runtime_state = app.state::<BlockingRuntimeState>();
    let mut blocking_runtime = runtime_state.lock().unwrap();
    return blocking_runtime.pause_overlay(&app, &key, pause_duration);
}

#[tauri::command]
#[specta::specta]
pub async fn show_blocking_intention(app: AppHandle, key: String) -> Result<(), String> {
    return tauri::async_runtime::spawn_blocking(move || {
        let key = key.trim();
        if key.is_empty() {
            return Err("Blocking overlay key is required".to_string());
        }

        let violation = {
            let runtime_state = app.state::<BlockingRuntimeState>();
            let runtime = runtime_state.lock().unwrap();
            runtime.violation(key)
        };
        let Some(violation) = violation else {
            return Err("Blocking overlay not found".to_string());
        };

        let focused_level = match &violation.blocked_target {
            // Note: Device blocks use screen-saver overlays, so Abstand must match that level while users edit the intention
            #[cfg(target_os = "macos")]
            BlockedTarget::Device { .. } => MainWindowFocusedLevel::ScreenSaver,
            // Note: Floating while focused keeps Intention controls above ordinary target overlays
            _ => MainWindowFocusedLevel::Floating,
        };
        main_window::show_intention(&app, violation.intention_id, focused_level)
            .map_err(|error| error.to_string())?;

        return Ok(());
    })
    .await
    .map_err(|error| error.to_string())?;
}

#[tauri::command]
#[specta::specta]
pub async fn quit_blocked_app_by_bundle_id(
    app: AppHandle,
    bundle_id: String,
) -> Result<QuitBlockedAppByBundleIdResult, String> {
    return tauri::async_runtime::spawn_blocking(move || {
        let bundle_id = bundle_id.trim();
        if bundle_id.is_empty() {
            return Err("Bundle id is required".to_string());
        }

        if bundle_id == AppConfig::bundle_identifier() {
            return Err("Cannot quit Abstand".to_string());
        }

        let result = abstand_macos::request_app_quit(bundle_id);
        if matches!(
            result,
            abstand_macos::AppQuitRequestResult::NotRunning
                | abstand_macos::AppQuitRequestResult::Requested { .. }
        ) {
            // Note: terminate() only confirms the quit request was accepted.
            // Clear the overlay after the process actually exits.
            watch_blocked_app_quit(app, bundle_id.to_string());
        }

        return Ok(result.into());
    })
    .await
    .map_err(|error| error.to_string())?;
}

fn watch_blocked_app_quit(app: AppHandle, bundle_id: String) {
    tauri::async_runtime::spawn(async move {
        let own_pid = std::process::id();
        let started_at = Instant::now();

        loop {
            if !abstand_macos::is_app_running(&bundle_id, own_pid) {
                runtime::clear_violations_for_bundle_id(&app, &bundle_id);
                return;
            }

            if started_at.elapsed() >= APP_QUIT_WATCH_TIMEOUT {
                log::warn!(
                    target: LOG_TARGET,
                    "timed out waiting for app quit: {}",
                    bundle_id
                );
                let _ = BlockedAppQuitTimedOutEvent { bundle_id }.emit(&app);
                return;
            }

            tokio::time::sleep(APP_QUIT_WATCH_INTERVAL).await;
        }
    });
}

const APP_QUIT_WATCH_INTERVAL: Duration = Duration::from_millis(100);
const APP_QUIT_WATCH_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase", tag = "status")]
pub enum QuitBlockedAppByBundleIdResult {
    NotRunning,
    Requested {
        #[serde(rename = "processCount")]
        process_count: u32,
    },
    Failed,
    Unsupported,
}

impl From<abstand_macos::AppQuitRequestResult> for QuitBlockedAppByBundleIdResult {
    fn from(result: abstand_macos::AppQuitRequestResult) -> Self {
        return match result {
            abstand_macos::AppQuitRequestResult::NotRunning => Self::NotRunning,
            abstand_macos::AppQuitRequestResult::Requested { process_count } => {
                Self::Requested { process_count }
            }
            abstand_macos::AppQuitRequestResult::Failed => Self::Failed,
            abstand_macos::AppQuitRequestResult::Unsupported => Self::Unsupported,
        };
    }
}

const LOG_TARGET: &str = "modules::blocking::commands";
