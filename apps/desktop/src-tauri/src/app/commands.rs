use super::window::AppWindow;
#[cfg(target_os = "macos")]
use crate::environment::{
    configs::app::{AppConfig, AppDistribution},
    logger::Logger,
    path::get_app_data_dir,
};
use crate::modules::quit_policy::policy::request_restart;
#[cfg(target_os = "macos")]
use crate::modules::quit_policy::types::QuitPreventedEvent;
#[cfg(target_os = "macos")]
use crate::modules::recovery_agent::cli;
use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
#[cfg(target_os = "macos")]
use tauri_specta::Event;

#[tauri::command]
#[specta::specta]
pub fn get_app_info() -> AppInfoDto {
    let base_version = env!("CARGO_PKG_VERSION");
    let (stage, suffix) = if cfg!(debug_assertions) {
        (Stage::Dev, "d")
    } else {
        (Stage::Prod, "p")
    };

    return AppInfoDto {
        version: format!("v{}{}", base_version, suffix),
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
pub fn notify_frontend_ready(app: AppHandle) {
    // If the watchdog relaunched the app, wait until the frontend has mounted before
    // emitting the existing quit-prevented event so the toast listener can receive it
    #[cfg(target_os = "macos")]
    if cli::consume_relaunched_by_agent_arg() {
        let _ = QuitPreventedEvent::active_strict_block().emit(&app);
    }
}

#[tauri::command]
#[specta::specta]
pub fn restart_app(app: AppHandle) -> Result<(), String> {
    return request_restart(&app);
}

#[tauri::command]
#[specta::specta]
pub fn show_intention_in_main_window(app: AppHandle, intention_id: i64) -> Result<(), String> {
    AppWindow::Main
        .show_at(&app, &format!("/intentions/{}", intention_id))
        .map_err(|error| error.to_string())?;

    return Ok(());
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
