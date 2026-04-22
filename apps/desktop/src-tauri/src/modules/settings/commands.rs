use super::{
    persistence,
    types::{AppSettings, AppSettingsChangedEvent, AppSettingsState},
};
use tauri::{AppHandle, State};
use tauri_specta::Event;

#[tauri::command]
#[specta::specta]
pub fn get_settings(state: State<'_, AppSettingsState>) -> AppSettings {
    return state.lock().unwrap().clone();
}

#[tauri::command]
#[specta::specta]
pub fn set_settings(
    app: AppHandle,
    state: State<'_, AppSettingsState>,
    settings: AppSettings,
) -> Result<(), String> {
    persistence::save_settings(&app, &settings)?;
    *state.lock().unwrap() = settings.clone();
    let _ = AppSettingsChangedEvent(settings).emit(&app);
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn reset_settings(
    app: AppHandle,
    state: State<'_, AppSettingsState>,
) -> Result<AppSettings, String> {
    let settings = AppSettings::default();
    persistence::save_settings(&app, &settings)?;
    *state.lock().unwrap() = settings.clone();
    let _ = AppSettingsChangedEvent(settings.clone()).emit(&app);
    return Ok(settings);
}
