use super::{
    persistence,
    types::{AppSettings, AppSettingsChangedEvent, AppSettingsState},
};
use crate::{common::time::unix_ms_now, modules::activity::recorder::ForegroundActivityRecorder};
use tauri::{AppHandle, State};
use tauri_specta::Event;

#[tauri::command]
#[specta::specta]
pub fn get_settings(settings_state: State<'_, AppSettingsState>) -> AppSettings {
    return settings_state.lock().unwrap().clone();
}

#[tauri::command]
#[specta::specta]
pub fn set_settings(
    app: AppHandle,
    settings_state: State<'_, AppSettingsState>,
    mut settings: AppSettings,
) -> Result<(), String> {
    // Normalize dependent activity flags so child trackers cannot be enabled without their parent
    settings.activity = settings.activity.normalized();

    // Normalize shortcuts: remove overrides that match the action's default (absent key = use default)
    settings
        .shortcuts
        .retain(|action, shortcut| match shortcut {
            None => true,
            Some(s) => s != &action.default_shortcut(),
        });

    let previous_activity = settings_state.lock().unwrap().activity.clone().normalized();
    let should_close_active_activity = previous_activity.records_foreground_activity()
        && !settings.activity.records_foreground_activity();

    persistence::save_settings(&app, &settings)?;
    *settings_state.lock().unwrap() = settings.clone();
    if should_close_active_activity {
        close_active_activity_after_recording_stopped(&app);
    }
    let _ = AppSettingsChangedEvent(settings).emit(&app);
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn reset_settings(
    app: AppHandle,
    settings_state: State<'_, AppSettingsState>,
) -> Result<AppSettings, String> {
    let settings = AppSettings::default();

    let previous_activity = settings_state.lock().unwrap().activity.clone().normalized();
    let should_close_active_activity = previous_activity.records_foreground_activity()
        && !settings.activity.records_foreground_activity();

    persistence::save_settings(&app, &settings)?;
    *settings_state.lock().unwrap() = settings.clone();
    if should_close_active_activity {
        close_active_activity_after_recording_stopped(&app);
    }
    let _ = AppSettingsChangedEvent(settings.clone()).emit(&app);
    return Ok(settings);
}

fn close_active_activity_after_recording_stopped(app: &AppHandle) {
    let result = tauri::async_runtime::block_on(ForegroundActivityRecorder::close_active(
        app,
        unix_ms_now(),
    ));
    if let Err(error) = result {
        log::warn!(
            target: LOG_TARGET,
            "failed to close active activity after disabling tracking: {}",
            error
        );
    }
}

const LOG_TARGET: &str = "modules::settings::commands";
