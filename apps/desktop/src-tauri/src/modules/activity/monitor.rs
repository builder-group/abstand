use super::types::{ActivityFocus, ActivityFocusSource, ActivityTarget, ActivityWindowBounds};
use crate::{common::url::extract_hostname, modules::blocking};
use mado::{MonitorConfig, WindowEvent, WindowListener, WindowMonitor as MadoWindowMonitor};
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

    fn handle_focus_change(&self, focus: ActivityFocus) {
        let app = self.app.clone();
        tauri::async_runtime::spawn(async move {
            blocking::runtime::handle_activity_focus(&app, focus).await;
        });
    }
}

impl WindowListener for ActivityWindowListener {
    fn on_focus_change(&self, event: WindowEvent) {
        match event {
            WindowEvent::AppActivated { app } => {
                self.handle_focus_change(ActivityFocus {
                    source: ActivityFocusSource::AppActivated {
                        expects_window_update: self.tracks_window_changes,
                    },
                    pid: app.pid,
                    app_name: app.name,
                    target: ActivityTarget {
                        app_bundle_id: app.bundle_id,
                        website_hostname: None,
                    },
                    window_bounds: None,
                });
            }
            WindowEvent::WindowChanged { window } => {
                self.handle_focus_change(ActivityFocus {
                    source: ActivityFocusSource::WindowChanged,
                    pid: window.app.pid,
                    app_name: window.app.name,
                    target: ActivityTarget {
                        app_bundle_id: window.app.bundle_id,
                        website_hostname: window
                            .browser
                            .as_ref()
                            .and_then(|browser| browser.url.as_deref())
                            .and_then(extract_hostname),
                    },
                    window_bounds: window.bounds.map(|bounds| ActivityWindowBounds {
                        x: bounds.x,
                        y: bounds.y,
                        width: bounds.width,
                        height: bounds.height,
                    }),
                });
            }
        }
    }
}

const LOG_TARGET: &str = "modules::activity::monitor";
