//! Observes focused app, window, and browser activity.

#[cfg(target_os = "macos")]
mod monitor;
pub mod types;

use tauri::App;

pub fn setup(app: &App) {
    #[cfg(target_os = "macos")]
    monitor::start_monitoring(app.handle().clone());
}
