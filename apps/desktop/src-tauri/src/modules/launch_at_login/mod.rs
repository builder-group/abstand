//! Controls whether Abstand starts automatically when the user signs in.

pub mod cli;
pub mod commands;

use tauri::{plugin::TauriPlugin, Runtime};
use tauri_plugin_autostart::MacosLauncher;

pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    return tauri_plugin_autostart::init(
        MacosLauncher::LaunchAgent,
        Some(vec![cli::LAUNCHED_AT_LOGIN_ARG]),
    );
}
