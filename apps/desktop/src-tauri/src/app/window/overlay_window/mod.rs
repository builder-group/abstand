//! Manages reusable overlay windows and their native presentation.

mod pool;
pub mod types;

use self::types::{OverlayWindow, OverlayWindowConfig, OverlayWindowOwner, OverlayWindowPoolState};
use super::AppWindow;
use tauri::{App, AppHandle, LogicalPosition, LogicalSize, Manager, WebviewWindow};

pub fn setup(app: &mut App) {
    app.manage(OverlayWindowPoolState::new());
}

pub fn show(app: &AppHandle, owner: OverlayWindowOwner, config: OverlayWindowConfig) {
    let pool_state = app.state::<OverlayWindowPoolState>();
    let Some(overlay_window) = pool_state.acquire(owner.clone()) else {
        log::warn!(
            target: LOG_TARGET,
            "no overlay window available for owner {}",
            owner.as_str()
        );
        return;
    };

    let app = app.clone();
    if let Err(error) = app.clone().run_on_main_thread(move || {
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
            apply_config(&app_window, &window, &config, false, &window_label)?;
            window.show()?;
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
        let app_window = AppWindow::Overlay(overlay_window);
        let window_label = overlay_window.label();
        let result: tauri::Result<()> = (|| {
            let Some(window) = app_window.get(&app) else {
                return Ok(());
            };

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

    hide_windows(app, vec![overlay_window]);
}

/// Hides the owner's overlay window immediately without scheduling another main-thread task.
///
/// Call this only from work already running on the main thread when the next operation must happen
/// after the native hide attempt.
pub fn hide_immediately(app: &AppHandle, owner: OverlayWindowOwner) {
    let pool_state = app.state::<OverlayWindowPoolState>();
    let Some(overlay_window) = pool_state.release(&owner) else {
        return;
    };

    if let Err(error) = AppWindow::Overlay(overlay_window).hide(app) {
        log::warn!(
            target: LOG_TARGET,
            "failed to hide overlay window {}: {}",
            overlay_window.label(),
            error
        );
    }
    pool_state.finish_release(overlay_window);
}

pub fn hide_all(app: &AppHandle) {
    let Some(pool_state) = app.try_state::<OverlayWindowPoolState>() else {
        return;
    };
    let overlay_windows = pool_state.release_all();
    hide_windows(app, overlay_windows);
}

pub fn is_any_focused(app: &AppHandle) -> bool {
    let Some(pool_state) = app.try_state::<OverlayWindowPoolState>() else {
        return false;
    };

    return pool_state.labels().into_iter().any(|label| {
        app.get_webview_window(&label)
            .and_then(|window| window.is_focused().ok())
            .unwrap_or(false)
    });
}

pub fn is_overlay_window_label(label: &str) -> bool {
    return label.starts_with(types::OVERLAY_WINDOW_LABEL_PREFIX);
}

fn hide_windows(app: &AppHandle, overlay_windows: Vec<OverlayWindow>) {
    if overlay_windows.is_empty() {
        return;
    }

    let released_windows = overlay_windows.clone();
    let app_for_hide = app.clone();
    let app_for_schedule = app.clone();
    if let Err(error) = app_for_schedule.run_on_main_thread(move || {
        let pool_state = app_for_hide.state::<OverlayWindowPoolState>();
        for overlay_window in overlay_windows {
            if let Err(error) = AppWindow::Overlay(overlay_window).hide(&app_for_hide) {
                log::warn!(
                    target: LOG_TARGET,
                    "failed to hide overlay window {}: {}",
                    overlay_window.label(),
                    error
                );
            }
            pool_state.finish_release(overlay_window);
        }
    }) {
        let pool_state = app.state::<OverlayWindowPoolState>();
        for overlay_window in released_windows {
            pool_state.finish_release(overlay_window);
        }
        log::error!(
            target: LOG_TARGET,
            "failed to schedule overlay window hide: {}",
            error
        );
    }
}

fn apply_config(
    app_window: &AppWindow,
    window: &WebviewWindow,
    config: &OverlayWindowConfig,
    replace_route: bool,
    window_label: &str,
) -> tauri::Result<()> {
    if let Some(bounds) = config.bounds {
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
    super::macos::apply_overlay_behavior(window, config, window_label);

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window_label;
    }

    return Ok(());
}

const LOG_TARGET: &str = "app::window::overlay_window";
const DEFAULT_OVERLAY_LOCAL_ROUTE: &str = "/";
