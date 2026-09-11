use super::{focus::ActivityFocus, recorder};
use crate::{common::time::unix_ms_now, modules::blocking};
use mado::{
    MonitorConfig, QueryConfig, WindowEvent, WindowListener, WindowMonitor as MadoWindowMonitor,
};
use tauri::AppHandle;

pub fn start_monitoring(app: AppHandle) {
    let tracks_window_changes = !cfg!(feature = "app-store") && mado::is_accessibility_trusted();
    let listener = ActivityWindowListener::new(app, tracks_window_changes);
    let monitor = MadoWindowMonitor::with_config(
        listener,
        MonitorConfig {
            // Note: mado fails without Accessibility here. If permission is granted later,
            // window tracking starts after the monitor is rebuilt, which currently
            // requires app restart.
            track_window_changes: tracks_window_changes,
            track_window_bounds_changes: tracks_window_changes,
            include_browser_info: tracks_window_changes,
            include_website_info: false,
            ..Default::default()
        },
    );

    // Note: mado::WindowMonitor::run blocks for the app lifetime, so keep it
    // off the async runtime
    if let Err(error) = std::thread::Builder::new()
        .name("activity-window-monitor".to_string())
        .spawn(move || {
            log::info!(
                target: LOG_TARGET,
                "Activity monitor started with window tracking {}",
                if tracks_window_changes { "enabled" } else { "disabled" }
            );

            if !tracks_window_changes {
                let reason = if cfg!(feature = "app-store") {
                    "Activity monitor cannot track focused windows or browser URLs in app-store builds"
                } else {
                    "Activity monitor cannot track focused windows or browser URLs without Accessibility permission"
                };
                log::warn!(target: LOG_TARGET, "{}", reason);
            }

            match monitor.run() {
                Ok(()) => {
                    log::warn!(target: LOG_TARGET, "Activity monitor exited unexpectedly");
                }
                Err(error) => {
                    log::error!(target: LOG_TARGET, "Activity monitor failed: {}", error);
                }
            }
        })
    {
        log::error!(target: LOG_TARGET, "Failed to start activity monitor thread: {}", error);
    }
}

struct ActivityWindowListener {
    app: AppHandle,
    tracks_window_changes: bool,
}

impl ActivityWindowListener {
    fn new(app: AppHandle, tracks_window_changes: bool) -> Self {
        return Self {
            app,
            tracks_window_changes,
        };
    }
}

impl WindowListener for ActivityWindowListener {
    fn on_focus_change(&self, event: WindowEvent) {
        let app = self.app.clone();
        let blocking_event = event.clone();
        let expects_window_update = self.tracks_window_changes;
        tauri::async_runtime::spawn(async move {
            blocking::runtime::handle_window_event(&app, blocking_event, expects_window_update)
                .await;
        });

        // Note: Queue activity recording so async database writes do not reorder foreground intervals
        recorder::ForegroundActivityRecorder::enqueue_window_event(&self.app, event, unix_ms_now());
    }
}

pub fn get_current_focus() -> Result<ActivityFocus, mado::Error> {
    let window = mado::get_active_window_with_config(QueryConfig {
        include_browser_info: true,
        ..Default::default()
    })?;

    return Ok(ActivityFocus::from_window_info(window));
}

const LOG_TARGET: &str = "modules::activity::monitor";
