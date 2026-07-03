use super::types::{BlockedTarget, BlockingViolation};
use crate::{
    app::window::overlay_window::{
        self,
        types::{OverlayWindowBounds, OverlayWindowConfig, OverlayWindowLevel, OverlayWindowOwner},
    },
    common::url::extract_website_target,
    modules::{
        activity::focus::{ActivityFocus, ActivityWindowBounds},
        scheduler,
    },
};
use mado::{QueryConfig, WindowBounds, WindowBoundsChange};
use std::time::Duration;
use tauri::AppHandle;

pub fn show(app: &AppHandle, focus: &ActivityFocus, violation: &BlockingViolation) {
    let placement = resolve_placement_for_violation(app, focus, violation);

    let should_retry_browser_content_bounds =
        matches!(&violation.blocked_target, BlockedTarget::Website { .. })
            && matches!(
                placement.source,
                BlockingOverlayPlacementSource::WindowBounds
            );
    if should_retry_browser_content_bounds {
        schedule_browser_content_bounds_retries(app, focus);
    }

    overlay_window::show(
        app,
        OverlayWindowOwner::new(BLOCKING_OVERLAY_OWNER_ID),
        placement.config(),
    );
}

pub fn hide(app: &AppHandle) {
    overlay_window::hide(app, OverlayWindowOwner::new(BLOCKING_OVERLAY_OWNER_ID));
}

pub fn hide_for_temporary_pause(app: &AppHandle, triggering_process_id: i32) {
    let app = app.clone();
    if let Err(error) = app.clone().run_on_main_thread(move || {
        // Note: Hide immediately in this main-thread operation so app reactivation happens after
        // the overlay is hidden
        overlay_window::hide_immediately(&app, OverlayWindowOwner::new(BLOCKING_OVERLAY_OWNER_ID));

        if !abstand_macos::activate_app_by_pid(triggering_process_id) {
            log::warn!(
                target: LOG_TARGET,
                "failed to reactivate blocked app: pid={}",
                triggering_process_id
            );
        }
    }) {
        log::error!(
            target: LOG_TARGET,
            "failed to schedule blocked app reactivation: {}",
            error
        );
    }
}

pub fn handle_window_bounds_change(
    app: &AppHandle,
    window: &WindowBoundsChange,
    violation: &BlockingViolation,
) {
    let (bounds, local_route) = match &violation.blocked_target {
        BlockedTarget::Website { hostname, .. } => {
            if let Some(bounds) = get_active_browser_content_bounds(window.app.pid, Some(hostname))
            {
                (
                    BlockingOverlayBounds::from(bounds),
                    Some(BLOCKING_OVERLAY_ROUTE),
                )
            } else if let Some(bounds) = window.bounds.as_ref() {
                (
                    BlockingOverlayBounds::from(bounds),
                    Some(BLOCKING_OVERLAY_MANUAL_CLOSE_ROUTE),
                )
            } else {
                return;
            }
        }
        BlockedTarget::App { .. } => {
            let Some(bounds) = window.bounds.as_ref() else {
                return;
            };
            (BlockingOverlayBounds::from(bounds), None)
        }
        BlockedTarget::Device { .. } => return,
    };

    overlay_window::update(
        app,
        OverlayWindowOwner::new(BLOCKING_OVERLAY_OWNER_ID),
        OverlayWindowConfig::normal(
            local_route.map(str::to_string),
            Some(OverlayWindowBounds::from(bounds)),
        ),
    );
}

// MARK: - Placement

fn resolve_placement_for_violation(
    app: &AppHandle,
    focus: &ActivityFocus,
    violation: &BlockingViolation,
) -> BlockingOverlayPlacement {
    match &violation.blocked_target {
        BlockedTarget::Device { .. } => BlockingOverlayPlacement {
            bounds: resolve_monitor_bounds_for_focus(app, focus),
            show_manual_close: false,
            level: OverlayWindowLevel::ScreenSaver,
            source: BlockingOverlayPlacementSource::MonitorBounds,
        },
        BlockedTarget::Website { .. } => {
            if let Some(bounds) = focus.browser_content_bounds {
                BlockingOverlayPlacement {
                    bounds: Some(BlockingOverlayBounds::from(bounds)),
                    show_manual_close: false,
                    level: OverlayWindowLevel::Normal,
                    source: BlockingOverlayPlacementSource::BrowserContentBounds,
                }
            } else if let Some(bounds) = get_active_browser_content_bounds(
                focus.pid,
                focus.target.website_hostname.as_deref(),
            ) {
                BlockingOverlayPlacement {
                    bounds: Some(BlockingOverlayBounds::from(bounds)),
                    show_manual_close: false,
                    level: OverlayWindowLevel::Normal,
                    source: BlockingOverlayPlacementSource::BrowserContentBounds,
                }
            } else if let Some(bounds) = focus.window_bounds {
                BlockingOverlayPlacement {
                    bounds: Some(BlockingOverlayBounds::from(bounds)),
                    show_manual_close: true,
                    level: OverlayWindowLevel::Normal,
                    source: BlockingOverlayPlacementSource::WindowBounds,
                }
            } else {
                BlockingOverlayPlacement {
                    bounds: resolve_monitor_bounds_for_focus(app, focus),
                    show_manual_close: true,
                    level: OverlayWindowLevel::Normal,
                    source: BlockingOverlayPlacementSource::MonitorBounds,
                }
            }
        }
        BlockedTarget::App { .. } => {
            if let Some(bounds) = focus.window_bounds {
                BlockingOverlayPlacement {
                    bounds: Some(BlockingOverlayBounds::from(bounds)),
                    show_manual_close: false,
                    level: OverlayWindowLevel::Normal,
                    source: BlockingOverlayPlacementSource::WindowBounds,
                }
            } else {
                BlockingOverlayPlacement {
                    bounds: resolve_monitor_bounds_for_focus(app, focus),
                    show_manual_close: false,
                    level: OverlayWindowLevel::Normal,
                    source: BlockingOverlayPlacementSource::MonitorBounds,
                }
            }
        }
    }
}

#[derive(Debug, Clone, Copy)]
struct BlockingOverlayPlacement {
    bounds: Option<BlockingOverlayBounds>,
    show_manual_close: bool,
    level: OverlayWindowLevel,
    source: BlockingOverlayPlacementSource,
}

impl BlockingOverlayPlacement {
    fn config(&self) -> OverlayWindowConfig {
        let route = if self.show_manual_close {
            BLOCKING_OVERLAY_MANUAL_CLOSE_ROUTE
        } else {
            BLOCKING_OVERLAY_ROUTE
        };
        let route = Some(route.to_string());
        let bounds = self.bounds.map(OverlayWindowBounds::from);
        return match self.level {
            OverlayWindowLevel::Normal => OverlayWindowConfig::normal(route, bounds),
            OverlayWindowLevel::ScreenSaver => OverlayWindowConfig::screen_saver(route, bounds),
        };
    }
}

#[derive(Debug, Clone, Copy)]
enum BlockingOverlayPlacementSource {
    BrowserContentBounds,
    WindowBounds,
    MonitorBounds,
}

#[derive(Debug, Clone, Copy)]
struct BlockingOverlayBounds {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

impl From<ActivityWindowBounds> for BlockingOverlayBounds {
    fn from(bounds: ActivityWindowBounds) -> Self {
        return Self {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
        };
    }
}

impl From<&WindowBounds> for BlockingOverlayBounds {
    fn from(bounds: &WindowBounds) -> Self {
        return Self {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
        };
    }
}

impl From<BlockingOverlayBounds> for OverlayWindowBounds {
    fn from(bounds: BlockingOverlayBounds) -> Self {
        return Self {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
        };
    }
}

fn resolve_monitor_bounds_for_focus(
    app: &AppHandle,
    focus: &ActivityFocus,
) -> Option<BlockingOverlayBounds> {
    let monitor = focus
        .window_bounds
        .and_then(|bounds| {
            let x = bounds.x + (bounds.width / 2.0);
            let y = bounds.y + (bounds.height / 2.0);
            return app.monitor_from_point(x, y).unwrap_or(None);
        })
        .or_else(|| match app.primary_monitor() {
            Ok(Some(monitor)) => Some(monitor),
            Ok(None) => {
                log::warn!(
                    target: LOG_TARGET,
                    "no primary monitor found for blocking overlay"
                );
                None
            }
            Err(error) => {
                log::warn!(
                    target: LOG_TARGET,
                    "failed to resolve primary monitor for blocking overlay: {}",
                    error
                );
                None
            }
        })?;

    let position = monitor.position();
    let size = monitor.size();
    let scale_factor = monitor.scale_factor();

    return Some(BlockingOverlayBounds {
        x: f64::from(position.x) / scale_factor,
        y: f64::from(position.y) / scale_factor,
        width: f64::from(size.width) / scale_factor,
        height: f64::from(size.height) / scale_factor,
    });
}

// MARK: - Browser Content

fn schedule_browser_content_bounds_retries(app: &AppHandle, focus: &ActivityFocus) {
    if focus.browser_content_bounds.is_some() {
        return;
    }

    for delay in BROWSER_CONTENT_BOUNDS_RETRY_DELAYS {
        let focus = focus.clone();
        scheduler::schedule_after(
            app,
            "blocking overlay browser content bounds retry",
            delay,
            move |app| {
                let Some(bounds) = get_active_browser_content_bounds(
                    focus.pid,
                    focus.target.website_hostname.as_deref(),
                ) else {
                    return;
                };
                let bounds = OverlayWindowBounds::from(BlockingOverlayBounds::from(bounds));

                overlay_window::update(
                    &app,
                    OverlayWindowOwner::new(BLOCKING_OVERLAY_OWNER_ID),
                    OverlayWindowConfig::normal(
                        Some(BLOCKING_OVERLAY_ROUTE.to_string()),
                        Some(bounds),
                    ),
                );
            },
        );
    }
}

fn get_active_browser_content_bounds(
    pid: i32,
    expected_hostname: Option<&str>,
) -> Option<ActivityWindowBounds> {
    let window = match mado::get_active_window_with_config(QueryConfig {
        include_browser_info: true,
        ..Default::default()
    }) {
        Ok(window) => window,
        Err(error) => {
            log::warn!(
                target: LOG_TARGET,
                "failed to query active window for browser content bounds: {}",
                error
            );
            return None;
        }
    };

    if window.app.pid != pid {
        return None;
    }

    let browser = window.browser?;
    if !matches_browser_hostname(browser.url.as_deref(), expected_hostname) {
        return None;
    }

    return browser.content_bounds.map(ActivityWindowBounds::from);
}

fn matches_browser_hostname(url: Option<&str>, expected_hostname: Option<&str>) -> bool {
    let Some(expected_hostname) = expected_hostname else {
        return true;
    };
    let Some(url) = url else {
        return false;
    };
    let Some(target) = extract_website_target(url) else {
        return false;
    };
    return target.hostname == expected_hostname;
}

const LOG_TARGET: &str = "modules::blocking::overlay";
const BLOCKING_OVERLAY_OWNER_ID: &str = "blocking";
const BLOCKING_OVERLAY_ROUTE: &str = "/blocking";
const BLOCKING_OVERLAY_MANUAL_CLOSE_ROUTE: &str = "/blocking?manualClose=true";
const BROWSER_CONTENT_BOUNDS_RETRY_DELAYS: [Duration; 3] = [
    Duration::from_millis(400),
    Duration::from_millis(800),
    Duration::from_millis(1_200),
];
