use super::installer::{CliInstallStatus, CliInstaller};

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
