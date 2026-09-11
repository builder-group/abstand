#[cfg(target_os = "macos")]
use crate::cli;
#[cfg(target_os = "macos")]
use crate::environment::{
    configs::app::{AppConfig, AppDistribution},
    logger::Logger,
    path::get_app_data_dir,
};
#[cfg(target_os = "macos")]
use crate::modules::quit_policy::policy::handle_recovery_relaunch;
use crate::modules::quit_policy::policy::request_restart;
use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
#[specta::specta]
pub fn get_app_info() -> AppInfoDto {
    let stage = if cfg!(debug_assertions) {
        Stage::Dev
    } else {
        Stage::Prod
    };

    return AppInfoDto {
        version: AppConfig::display_version(),
        stage,
        distribution: AppConfig::distribution(),
    };
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppInfoDto {
    pub version: String,
    pub stage: Stage,
    pub distribution: AppDistribution,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum Stage {
    Dev,
    Prod,
}

#[tauri::command]
#[specta::specta]
pub fn get_system_typography() -> SystemTypographyDto {
    let font_sizes = abstand_macos::get_system_font_sizes();

    return SystemTypographyDto {
        base_font_size: font_sizes.base,
        small_font_size: font_sizes.small,
    };
}

#[derive(Debug, Clone, Copy, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SystemTypographyDto {
    // Note: macOS reports finite point sizes; export the frontend type as `number`
    #[specta(type = specta_typescript::Number)]
    pub base_font_size: f64,
    #[specta(type = specta_typescript::Number)]
    pub small_font_size: f64,
}

#[tauri::command]
#[specta::specta]
pub async fn notify_frontend_ready(app: AppHandle) {
    // If the watchdog relaunched the app, wait until the frontend has mounted before
    // reassessing the quit policy so any resulting event reaches the toast listener
    #[cfg(target_os = "macos")]
    if cli::subcommands::recovery_agent::consume_relaunched_by_agent_arg() {
        handle_recovery_relaunch(&app).await;
    }
}

#[tauri::command]
#[specta::specta]
pub fn restart_app(app: AppHandle) -> Result<(), String> {
    return request_restart(&app);
}

#[tauri::command]
#[specta::specta]
pub fn open_data_directory(app: AppHandle) -> Result<(), String> {
    let data_dir = get_app_data_dir(&app)?;
    return app
        .opener()
        .open_path(data_dir.to_string_lossy().as_ref(), None::<&str>)
        .map_err(|e| e.to_string());
}

#[tauri::command]
#[specta::specta]
pub fn reveal_log_file(app: AppHandle) -> Result<(), String> {
    let log_file_path = Logger::ensure_log_file(&app)?;
    return app
        .opener()
        .reveal_item_in_dir(log_file_path)
        .map_err(|e| e.to_string());
}
