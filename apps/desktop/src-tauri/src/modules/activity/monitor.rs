use super::recorder;
use crate::{common::time::unix_ms_now, modules::blocking};
use mado::{MonitorConfig, WindowEvent, WindowListener, WindowMonitor as MadoWindowMonitor};
use tauri::AppHandle;

pub fn start_monitoring(app: AppHandle) {
    let tracks_window_changes = !cfg!(feature = "app-store");
    let listener = ActivityWindowListener::new(app);
    let monitor = MadoWindowMonitor::with_config(
        listener,
        MonitorConfig {
            // Note: Reconciliation recovers missed AX events and newly granted permission
            reconcile_interval_ms: 2_000,
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
                "Activity monitor started with window tracking {} (requires Accessibility access)",
                if tracks_window_changes { "enabled" } else { "disabled" }
            );

            if !tracks_window_changes {
                log::warn!(target: LOG_TARGET, "App Store builds support app activity only");
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
    blocking_events: tokio::sync::mpsc::UnboundedSender<WindowEvent>,
}

impl ActivityWindowListener {
    fn new(app: AppHandle) -> Self {
        let (blocking_events, mut events) = tokio::sync::mpsc::unbounded_channel();
        let blocking_app = app.clone();
        tauri::async_runtime::spawn(async move {
            // Note: Preserve native event order across asynchronous policy checks
            while let Some(event) = events.recv().await {
                blocking::runtime::handle_window_event(&blocking_app, event).await;
            }
        });
        return Self {
            app,
            blocking_events,
        };
    }
}

impl WindowListener for ActivityWindowListener {
    fn on_focus_change(&self, event: WindowEvent) {
        if self.blocking_events.send(event.clone()).is_err() {
            log::error!(target: LOG_TARGET, "Blocking event consumer stopped");
        }

        // Note: Queue activity recording so async database writes do not reorder foreground intervals
        recorder::ForegroundActivityRecorder::enqueue_window_event(&self.app, event, unix_ms_now());
    }
}

const LOG_TARGET: &str = "modules::activity::monitor";
