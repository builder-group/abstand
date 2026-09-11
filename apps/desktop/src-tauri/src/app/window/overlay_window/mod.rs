//! Manages reusable overlay windows and their native presentation.

mod pool;
pub mod types;

use self::types::{OverlayWindow, OverlayWindowConfig, OverlayWindowOwner, OverlayWindowPoolState};
use super::AppWindow;
use tauri::{
    App, AppHandle, CloseRequestApi, LogicalPosition, LogicalSize, Manager, WebviewWindow, Window,
};

pub fn setup(app: &mut App) {
    app.manage(OverlayWindowPoolState::new());
}

pub fn handle_close(api: &CloseRequestApi) {
    api.prevent_close();
}

pub fn handle_move_or_resize(window: &Window) {
    let label = window.label();
    let pool_state = window.app_handle().state::<OverlayWindowPoolState>();
    let Some(bounds) = pool_state.intended_bounds_for_label(label) else {
        return;
    };

    if window_matches_bounds(window, bounds) {
        return;
    }

    if let Err(error) = window.set_position(LogicalPosition::new(bounds.x, bounds.y)) {
        log::warn!(
            target: LOG_TARGET,
            "failed to restore overlay window {} position: {}",
            label,
            error
        );
    }
    if let Err(error) = window.set_size(LogicalSize::new(bounds.width, bounds.height)) {
        log::warn!(
            target: LOG_TARGET,
            "failed to restore overlay window {} size: {}",
            label,
            error
        );
    }
}

pub fn show(app: &AppHandle, owner: OverlayWindowOwner, config: OverlayWindowConfig) {
    let pool_state = app.state::<OverlayWindowPoolState>();
    let overlay_window = pool_state.acquire(owner.clone());

    let app = app.clone();
    if let Err(error) = app.clone().run_on_main_thread(move || {
        // Note: The owner may have released this window while the main-thread task was queued
        if app
            .state::<OverlayWindowPoolState>()
            .window_for_owner(&owner)
            != Some(overlay_window)
        {
            return;
        }
        let app_window = AppWindow::Overlay(overlay_window);
        let window_label = overlay_window.label();
        let result: tauri::Result<()> = (|| {
            let window = app_window.get_or_build_at(
                &app,
                config
                    .local_route
                    .as_deref()
                    .unwrap_or(DEFAULT_OVERLAY_LOCAL_ROUTE),
            )?;

            let pool_state = app.state::<OverlayWindowPoolState>();
            pool_state.set_intended_bounds(
                overlay_window,
                if config.target.is_some() {
                    None
                } else {
                    config.bounds
                },
            );
            apply_config(&app_window, &window, &config, false, &window_label)?;

            // Note: Tauri's show makes the window key. Native attachment shows it without stealing browser focus.
            if config.target.is_none() {
                window.show()?;
            }
            return Ok(());
        })();

        if let Err(error) = result {
            log::error!(
                target: LOG_TARGET,
                "failed to show overlay window {}: {}",
                window_label,
                error
            );
        }
    }) {
        log::error!(
            target: LOG_TARGET,
            "failed to schedule overlay window show: {}",
            error
        );
    }
}

pub fn update(app: &AppHandle, owner: OverlayWindowOwner, config: OverlayWindowConfig) {
    let pool_state = app.state::<OverlayWindowPoolState>();
    let Some(overlay_window) = pool_state.window_for_owner(&owner) else {
        return;
    };

    let app = app.clone();
    if let Err(error) = app.clone().run_on_main_thread(move || {
        if app
            .state::<OverlayWindowPoolState>()
            .window_for_owner(&owner)
            != Some(overlay_window)
        {
            return;
        }
        let app_window = AppWindow::Overlay(overlay_window);
        let window_label = overlay_window.label();
        let result: tauri::Result<()> = (|| {
            let Some(window) = app_window.get(&app) else {
                return Ok(());
            };

            let pool_state = app.state::<OverlayWindowPoolState>();
            pool_state.set_intended_bounds(
                overlay_window,
                if config.target.is_some() {
                    None
                } else {
                    config.bounds
                },
            );
            apply_config(&app_window, &window, &config, true, &window_label)?;

            return Ok(());
        })();

        if let Err(error) = result {
            log::warn!(
                target: LOG_TARGET,
                "failed to update overlay window {}: {}",
                window_label,
                error
            );
        }
    }) {
        log::error!(
            target: LOG_TARGET,
            "failed to schedule overlay window update: {}",
            error
        );
    }
}

pub fn hide(app: &AppHandle, owner: OverlayWindowOwner) {
    let pool_state = app.state::<OverlayWindowPoolState>();
    let Some(overlay_window) = pool_state.release(&owner) else {
        return;
    };

    let app_for_hide = app.clone();
    if let Err(error) = app.run_on_main_thread(move || {
        detach_overlay(&app_for_hide, overlay_window);
        if let Err(error) = AppWindow::Overlay(overlay_window).hide(&app_for_hide) {
            log::warn!(
                target: LOG_TARGET,
                "failed to hide overlay window {}: {}",
                overlay_window.label(),
                error
            );
        }
        app_for_hide
            .state::<OverlayWindowPoolState>()
            .finish_release(overlay_window);
    }) {
        log::error!(
            target: LOG_TARGET,
            "failed to schedule overlay window hide: {}",
            error
        );
    }
}

pub fn is_overlay_window_label(label: &str) -> bool {
    return label.starts_with(types::OVERLAY_WINDOW_LABEL_PREFIX);
}

fn detach_overlay(app: &AppHandle, overlay_window: OverlayWindow) {
    #[cfg(target_os = "macos")]
    if let Some(window) = AppWindow::Overlay(overlay_window).get(app) {
        if let Ok(window_ptr) = window.ns_window() {
            unsafe { abstand_macos::detach_overlay(window_ptr) };
        }
    }
}

fn apply_config(
    app_window: &AppWindow,
    window: &WebviewWindow,
    config: &OverlayWindowConfig,
    replace_route: bool,
    window_label: &str,
) -> tauri::Result<()> {
    // Note: Attached overlays use current native geometry with insets derived from observed bounds
    if let Some(bounds) = config.bounds.filter(|_| config.target.is_none()) {
        if let Err(error) = window.set_position(LogicalPosition::new(bounds.x, bounds.y)) {
            log::warn!(
                target: LOG_TARGET,
                "failed to position overlay window {}: {}",
                window_label,
                error
            );
        }

        if let Err(error) = window.set_size(LogicalSize::new(bounds.width, bounds.height)) {
            log::warn!(
                target: LOG_TARGET,
                "failed to size overlay window {}: {}",
                window_label,
                error
            );
        }
    }

    if replace_route {
        if let Some(local_route) = config.local_route.as_deref() {
            let full_route = app_window.resolve_full_route(local_route);
            app_window.navigate_to_route(window, &full_route, true)?;
        }
    }

    #[cfg(target_os = "macos")]
    super::macos::apply_overlay_behavior(window, config);

    return Ok(());
}

fn window_matches_bounds(window: &Window, bounds: types::OverlayWindowBounds) -> bool {
    let Ok(scale_factor) = window.scale_factor() else {
        return false;
    };
    let Ok(position) = window.outer_position() else {
        return false;
    };
    let Ok(size) = window.outer_size() else {
        return false;
    };

    let actual_x = f64::from(position.x) / scale_factor;
    let actual_y = f64::from(position.y) / scale_factor;
    let actual_width = f64::from(size.width) / scale_factor;
    let actual_height = f64::from(size.height) / scale_factor;

    return (actual_x - bounds.x).abs() <= BOUNDS_MATCH_TOLERANCE
        && (actual_y - bounds.y).abs() <= BOUNDS_MATCH_TOLERANCE
        && (actual_width - bounds.width).abs() <= BOUNDS_MATCH_TOLERANCE
        && (actual_height - bounds.height).abs() <= BOUNDS_MATCH_TOLERANCE;
}

const LOG_TARGET: &str = "app::window::overlay_window";
const DEFAULT_OVERLAY_LOCAL_ROUTE: &str = "/";
const BOUNDS_MATCH_TOLERANCE: f64 = 2.0;
