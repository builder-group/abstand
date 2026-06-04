use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
#[specta::specta]
pub fn get_launch_at_login_status(app: AppHandle) -> Result<LaunchAtLoginStatus, String> {
    return status(&app);
}

#[tauri::command]
#[specta::specta]
pub fn enable_launch_at_login(app: AppHandle) -> Result<LaunchAtLoginStatus, String> {
    app.autolaunch()
        .enable()
        .map_err(|error| error.to_string())?;
    return status(&app);
}

#[tauri::command]
#[specta::specta]
pub fn disable_launch_at_login(app: AppHandle) -> Result<LaunchAtLoginStatus, String> {
    app.autolaunch()
        .disable()
        .map_err(|error| error.to_string())?;
    return status(&app);
}

fn status(app: &AppHandle) -> Result<LaunchAtLoginStatus, String> {
    return Ok(LaunchAtLoginStatus {
        is_enabled: app
            .autolaunch()
            .is_enabled()
            .map_err(|error| error.to_string())?,
    });
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct LaunchAtLoginStatus {
    pub is_enabled: bool,
}
