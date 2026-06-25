use super::{
    persistence,
    types::{AppSettings, AppSettingsChangedEvent, AppSettingsState},
};
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
    // Normalize dependent activity flags so child trackers cannot be enabled without their parent.
    settings.activity = settings.activity.normalized();

    // Normalize shortcuts: remove overrides that match the action's default (absent key = use default)
    settings
        .shortcuts
        .retain(|action, shortcut| match shortcut {
            None => true,
            Some(s) => s != &action.default_shortcut(),
        });

    persistence::save_settings(&app, &settings)?;
    *settings_state.lock().unwrap() = settings.clone();
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
    persistence::save_settings(&app, &settings)?;
    *settings_state.lock().unwrap() = settings.clone();
    let _ = AppSettingsChangedEvent(settings.clone()).emit(&app);
    return Ok(settings);
}
