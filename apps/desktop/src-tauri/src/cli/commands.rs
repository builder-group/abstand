use super::installer::{CliInstallStatus, CliInstaller};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
#[specta::specta]
pub async fn get_cli_status() -> Result<CliInstallStatus, String> {
    return tauri::async_runtime::spawn_blocking(|| {
        let installer = CliInstaller::for_current_app().map_err(|error| error.to_string())?;
        return Ok(installer.status());
    })
    .await
    .map_err(|error| error.to_string())?;
}

#[tauri::command]
#[specta::specta]
pub async fn install_cli() -> Result<CliInstallStatus, String> {
    return tauri::async_runtime::spawn_blocking(|| {
        let installer = CliInstaller::for_current_app().map_err(|error| error.to_string())?;
        installer.install().map_err(|error| error.to_string())?;
        return Ok(installer.status());
    })
    .await
    .map_err(|error| error.to_string())?;
}

#[tauri::command]
#[specta::specta]
pub async fn uninstall_cli() -> Result<CliInstallStatus, String> {
    return tauri::async_runtime::spawn_blocking(|| {
        let installer = CliInstaller::for_current_app().map_err(|error| error.to_string())?;
        installer.uninstall().map_err(|error| error.to_string())?;
        return Ok(installer.status());
    })
    .await
    .map_err(|error| error.to_string())?;
}

#[tauri::command]
#[specta::specta]
pub fn reveal_cli_binary(app: AppHandle) -> Result<(), String> {
    let installer = CliInstaller::for_current_app().map_err(|error| error.to_string())?;
    let bin_path = installer.bin_path();

    if std::fs::symlink_metadata(bin_path).is_ok() {
        return app
            .opener()
            .reveal_item_in_dir(bin_path)
            .map_err(|error| error.to_string());
    }

    let parent = bin_path
        .parent()
        .ok_or_else(|| "command line tool parent directory unavailable".to_string())?;
    return app
        .opener()
        .open_path(parent.to_string_lossy().as_ref(), None::<&str>)
        .map_err(|error| error.to_string());
}
