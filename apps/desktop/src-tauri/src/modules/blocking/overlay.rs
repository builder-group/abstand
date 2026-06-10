use super::types::{BlockedTarget, BlockingViolation};
use crate::{app::window::AppWindow, modules::activity::types::ActivityFocus};
use tauri::{AppHandle, LogicalPosition, LogicalSize};

pub fn show(app: &AppHandle, focus: &ActivityFocus, violation: &BlockingViolation) {
    let bounds = resolve_bounds_for_violation(app, focus, violation);
    let app = app.clone();

    // Note: Focus handling is driven by mado outside Tauri's main thread, but
    // native window mutations must run on it
    if let Err(error) = app.clone().run_on_main_thread(move || {
        let window = match AppWindow::Overlay.get_or_build_at(&app, BLOCKING_OVERLAY_ROUTE) {
            Ok(window) => window,
            Err(error) => {
                log::error!(target: LOG_TARGET, "failed to build blocking overlay: {}", error);
                return;
            }
        };

        if let Some(bounds) = bounds {
            if let Err(error) = window.set_position(LogicalPosition::new(bounds.x, bounds.y)) {
                log::warn!(
                    target: LOG_TARGET,
                    "failed to position blocking overlay: {}",
                    error
                );
            }
            if let Err(error) = window.set_size(LogicalSize::new(bounds.width, bounds.height)) {
                log::warn!(target: LOG_TARGET, "failed to size blocking overlay: {}", error);
            }
        }

        if let Err(error) = window.show() {
            log::error!(target: LOG_TARGET, "failed to show blocking overlay: {}", error);
            return;
        }

        if let Err(error) = window.set_focus() {
            log::warn!(
                target: LOG_TARGET,
                "failed to focus blocking overlay: {}",
                error
            );
        }

        if let Err(error) = window.set_always_on_top(true) {
            log::warn!(
                target: LOG_TARGET,
                "failed to keep blocking overlay above other windows: {}",
                error
            );
        }
    }) {
        log::error!(
            target: LOG_TARGET,
            "failed to schedule blocking overlay show: {}",
            error
        );
    }
}

pub fn hide(app: &AppHandle) {
    let app = app.clone();

    // Note: Focus handling is driven by mado outside Tauri's main thread, but
    // native window mutations must run on it
    if let Err(error) = app.clone().run_on_main_thread(move || {
        let Some(window) = AppWindow::Overlay.get(&app) else {
            return;
        };

        if let Err(error) = window.hide() {
            log::error!(target: LOG_TARGET, "failed to hide blocking overlay: {}", error);
        }
    }) {
        log::error!(
            target: LOG_TARGET,
            "failed to schedule blocking overlay hide: {}",
            error
        );
    }
}

fn resolve_bounds_for_violation(
    app: &AppHandle,
    focus: &ActivityFocus,
    violation: &BlockingViolation,
) -> Option<BlockingOverlayBounds> {
    if matches!(&violation.blocked_target, BlockedTarget::Device) {
        return resolve_monitor_bounds_for_focus(app, focus);
    }

    return focus
        .window_bounds
        .map(|bounds| BlockingOverlayBounds {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
        })
        .or_else(|| resolve_monitor_bounds_for_focus(app, focus));
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

#[derive(Debug, Clone, Copy)]
struct BlockingOverlayBounds {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

const LOG_TARGET: &str = "modules::blocking::overlay";
const BLOCKING_OVERLAY_ROUTE: &str = "/blocking";
