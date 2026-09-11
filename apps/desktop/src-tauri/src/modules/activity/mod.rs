//! Observes app and window changes and records foreground activity.

pub mod foreground;
mod heartbeat;
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
