use super::overlay_window::types::{OverlayWindowConfig, OverlayWindowLevel};
use tauri::{
    window::{Effect, EffectsBuilder},
    WebviewWindow, Window,
};

pub fn apply_liquid_glass(window: &WebviewWindow) {
    let window_label = window.label();
    let Ok(window_ptr) = window.ns_window() else {
        log::debug!(target: LOG_TARGET, "failed to access NSWindow for {}", window_label);
        return;
    };

    if unsafe { abstand_macos::apply_window_liquid_glass(window_ptr) } {
        return;
    }

    // Fall back to the built-in macOS window material when Liquid Glass is unavailable
    let _ = window.set_effects(
        EffectsBuilder::new()
            .effect(Effect::WindowBackground)
            .build(),
    );

    log::debug!(
        target: LOG_TARGET,
        "falling back to native window background for {}",
        window_label
    );
}

pub fn apply_window_level(window: &Window, level: WindowLevel) {
    let window_label = window.label();
    let Ok(window_ptr) = window.ns_window() else {
        log::debug!(target: LOG_TARGET, "failed to access NSWindow for {}", window_label);
        return;
    };

    let applied_level = match level {
        WindowLevel::Normal => unsafe {
            abstand_macos::apply_window_normal_level(window_ptr, false)
        },
        WindowLevel::Floating => unsafe {
            abstand_macos::apply_window_floating_level(window_ptr, true)
        },
        WindowLevel::ScreenSaver => unsafe {
            abstand_macos::apply_window_screen_saver_level(window_ptr, true)
        },
    };
    if !applied_level {
        log::debug!(
            target: LOG_TARGET,
            "failed to apply window level for {}",
            window_label
        );
    }
}

pub fn apply_webview_window_level(window: &WebviewWindow, level: WindowLevel) {
    let window_label = window.label();
    let Ok(window_ptr) = window.ns_window() else {
        log::debug!(target: LOG_TARGET, "failed to access NSWindow for {}", window_label);
        return;
    };

    let applied_level = match level {
        WindowLevel::Normal => unsafe {
            abstand_macos::apply_window_normal_level(window_ptr, false)
        },
        WindowLevel::Floating => unsafe {
            abstand_macos::apply_window_floating_level(window_ptr, true)
        },
        WindowLevel::ScreenSaver => unsafe {
            abstand_macos::apply_window_screen_saver_level(window_ptr, true)
        },
    };
    if !applied_level {
        log::debug!(
            target: LOG_TARGET,
            "failed to apply window level for {}",
            window_label
        );
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WindowLevel {
    Normal,
    Floating,
    ScreenSaver,
}

pub fn apply_overlay_behavior(window: &WebviewWindow, config: &OverlayWindowConfig) {
    let window_label = window.label();
    let Ok(window_ptr) = window.ns_window() else {
        log::debug!(target: LOG_TARGET, "failed to access NSWindow for {}", window_label);
        return;
    };

    let applied_level = if config.target.is_some() {
        attach_overlay(window, config)
    } else {
        unsafe { abstand_macos::detach_overlay(window_ptr) };
        match config.level {
            OverlayWindowLevel::Normal => unsafe {
                abstand_macos::apply_window_normal_overlay_behavior(window_ptr, config.order_front)
            },
            OverlayWindowLevel::Floating => unsafe {
                abstand_macos::apply_window_floating_overlay_behavior(
                    window_ptr,
                    config.order_front,
                )
            },
            OverlayWindowLevel::ScreenSaver => unsafe {
                abstand_macos::apply_window_screen_overlay_behavior(window_ptr)
            },
        }
    };
    if !applied_level {
        log::debug!(
            target: LOG_TARGET,
            "failed to apply overlay window level for {}",
            window_label
        );
    }

    if unsafe { abstand_macos::apply_window_liquid_glass(window_ptr) } {
        return;
    }

    if unsafe { abstand_macos::apply_window_opaque_background(window_ptr) } {
        return;
    }

    log::debug!(
        target: LOG_TARGET,
        "failed to apply native overlay background for {}",
        window_label
    );
}

fn attach_overlay(window: &WebviewWindow, config: &OverlayWindowConfig) -> bool {
    let Ok(window_ptr) = window.ns_window() else {
        return false;
    };
    let (Some(target), Some(bounds)) = (config.target, config.bounds) else {
        unsafe { abstand_macos::detach_overlay(window_ptr) };
        return false;
    };
    // Note: Use frames from one observation to avoid drift while the target moves
    return unsafe {
        abstand_macos::order_overlay_above_target(
            window_ptr,
            target.window_id,
            target.process_id,
            bounds.y - target.bounds.y,
            bounds.x - target.bounds.x,
            target.bounds.y + target.bounds.height - bounds.y - bounds.height,
            target.bounds.x + target.bounds.width - bounds.x - bounds.width,
        )
    };
}

const LOG_TARGET: &str = "app::window::macos";
