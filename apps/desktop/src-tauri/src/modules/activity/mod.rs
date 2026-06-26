//! Observes focused app, window, and browser activity.

pub mod focus;
pub mod foreground;
pub mod monitor;
pub mod recorder;
pub mod repository;
pub mod types;

use tauri::App;

pub fn setup(app: &App) {
    recorder::ForegroundActivityRecorder::setup(app);

    #[cfg(target_os = "macos")]
    monitor::start_monitoring(app.handle().clone());
}
