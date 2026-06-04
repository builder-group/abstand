use crate::environment::path::get_user_launch_agents_dir;
use serde::Serialize;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_opener::OpenerExt;

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

#[tauri::command]
#[specta::specta]
pub fn reveal_launch_at_login_plist(app: AppHandle) -> Result<(), String> {
    let plist_path = launch_at_login_plist_path(&app)?;

    if plist_path.exists() {
        return app
            .opener()
            .reveal_item_in_dir(plist_path)
            .map_err(|error| error.to_string());
    }

    let parent = plist_path
        .parent()
        .ok_or_else(|| "launch at login plist parent unavailable".to_string())?;
    return app
        .opener()
        .open_path(parent.to_string_lossy().as_ref(), None::<&str>)
        .map_err(|error| error.to_string());
}

fn launch_at_login_plist_path(app: &AppHandle) -> Result<PathBuf, String> {
    return Ok(get_user_launch_agents_dir()
        .map_err(|error| error.to_string())?
        .join(format!("{}.plist", app.package_info().name)));
}
