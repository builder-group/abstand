use super::{
    observation::ObservedActivity,
    types::{BlockedTarget, BlockingViolation},
};
use crate::app::window::overlay_window::{
    self,
    types::{
        OverlayWindowBounds, OverlayWindowConfig, OverlayWindowLevel, OverlayWindowOwner,
        OverlayWindowTarget,
    },
};
use mado::{WindowBounds, WindowBoundsChange};
use tauri::AppHandle;

pub fn show(
    app: &AppHandle,
    owner: OverlayWindowOwner,
    observation: &ObservedActivity,
    violation: &BlockingViolation,
) {
    let placement = resolve_placement_for_violation(app, observation, violation);

    let mut config = placement.config(&owner);
    if !matches!(violation.blocked_target, BlockedTarget::Device { .. }) {
        config.target = observation
            .window_id
            .zip(observation.window_bounds.as_ref())
            .map(|(window_id, bounds)| OverlayWindowTarget {
                process_id: observation.pid,
                window_id,
                bounds: OverlayWindowBounds::from(bounds),
            });
    }
    overlay_window::show(app, owner.clone(), config);
}

pub fn hide(app: &AppHandle, owner: OverlayWindowOwner) {
    overlay_window::hide(app, owner);
}

pub fn hide_for_temporary_pause(
    app: &AppHandle,
    owner: OverlayWindowOwner,
    triggering_process_id: i32,
) {
    // Note: Release the current overlay before queuing activation so a later violation keeps its own window
    overlay_window::hide(app, owner);
    let app = app.clone();
    if let Err(error) = app.clone().run_on_main_thread(move || {
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
    owner: OverlayWindowOwner,
    window: &WindowBoundsChange,
    violation: &BlockingViolation,
) {
    let (bounds, show_manual_close) = match &violation.blocked_target {
        // Note: Native attachment preserves browser insets while mado refreshes the content bounds
        BlockedTarget::Website { .. } => return,
        BlockedTarget::App { .. } => {
            let Some(bounds) = window.bounds.as_ref() else {
                return;
            };
            (OverlayWindowBounds::from(bounds), false)
        }
        BlockedTarget::Device { .. } => return,
    };

    let mut config = OverlayWindowConfig::floating(
        Some(blocking_overlay_route(&owner, show_manual_close)),
        Some(bounds),
    );
    config.target = window
        .window_id
        .zip(window.bounds.as_ref())
        .map(|(window_id, bounds)| OverlayWindowTarget {
            process_id: window.app.pid,
            window_id,
            bounds: OverlayWindowBounds::from(bounds),
        });
    overlay_window::update(app, owner, config);
}

// MARK: - Placement

fn resolve_placement_for_violation(
    app: &AppHandle,
    observation: &ObservedActivity,
    violation: &BlockingViolation,
) -> BlockingOverlayPlacement {
    match &violation.blocked_target {
        BlockedTarget::Device { .. } => BlockingOverlayPlacement {
            bounds: resolve_monitor_bounds(app, observation),
            show_manual_close: false,
            level: OverlayWindowLevel::ScreenSaver,
        },
        BlockedTarget::Website { .. } => {
            if let Some(bounds) = observation.browser_content_bounds.as_ref() {
                BlockingOverlayPlacement {
                    bounds: Some(OverlayWindowBounds::from(bounds)),
                    show_manual_close: false,
                    level: OverlayWindowLevel::Floating,
                }
            } else if let Some(bounds) = observation.window_bounds.as_ref() {
                BlockingOverlayPlacement {
                    bounds: Some(OverlayWindowBounds::from(bounds)),
                    show_manual_close: true,
                    level: OverlayWindowLevel::Floating,
                }
            } else {
                BlockingOverlayPlacement {
                    bounds: resolve_monitor_bounds(app, observation),
                    show_manual_close: true,
                    level: OverlayWindowLevel::Floating,
                }
            }
        }
        BlockedTarget::App { .. } => {
            if let Some(bounds) = observation.window_bounds.as_ref() {
                BlockingOverlayPlacement {
                    bounds: Some(OverlayWindowBounds::from(bounds)),
                    show_manual_close: false,
                    level: OverlayWindowLevel::Floating,
                }
            } else {
                BlockingOverlayPlacement {
                    bounds: resolve_monitor_bounds(app, observation),
                    show_manual_close: false,
                    level: OverlayWindowLevel::Floating,
                }
            }
        }
    }
}

#[derive(Debug, Clone, Copy)]
struct BlockingOverlayPlacement {
    bounds: Option<OverlayWindowBounds>,
    show_manual_close: bool,
    level: OverlayWindowLevel,
}

impl BlockingOverlayPlacement {
    fn config(&self, owner: &OverlayWindowOwner) -> OverlayWindowConfig {
        let route = Some(blocking_overlay_route(owner, self.show_manual_close));
        let bounds = self.bounds;
        return match self.level {
            OverlayWindowLevel::Normal => OverlayWindowConfig::normal(route, bounds),
            OverlayWindowLevel::Floating => OverlayWindowConfig::floating(route, bounds),
            OverlayWindowLevel::ScreenSaver => OverlayWindowConfig::screen_saver(route, bounds),
        };
    }
}

impl From<&WindowBounds> for OverlayWindowBounds {
    fn from(bounds: &WindowBounds) -> Self {
        return Self {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
        };
    }
}

fn resolve_monitor_bounds(
    app: &AppHandle,
    observation: &ObservedActivity,
) -> Option<OverlayWindowBounds> {
    let monitor = observation
        .window_bounds
        .as_ref()
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

    return Some(OverlayWindowBounds {
        x: f64::from(position.x) / scale_factor,
        y: f64::from(position.y) / scale_factor,
        width: f64::from(size.width) / scale_factor,
        height: f64::from(size.height) / scale_factor,
    });
}

fn blocking_overlay_route(owner: &OverlayWindowOwner, manual_close: bool) -> String {
    let manual_close_query = if manual_close {
        "manualClose=true&"
    } else {
        ""
    };
    return format!(
        "{BLOCKING_OVERLAY_ROUTE}?{manual_close_query}key={}",
        owner.as_str()
    );
}

const LOG_TARGET: &str = "modules::blocking::overlay";
const BLOCKING_OVERLAY_ROUTE: &str = "/blocking";
