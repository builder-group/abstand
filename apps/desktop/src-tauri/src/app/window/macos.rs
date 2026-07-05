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

    if abstand_macos::apply_window_liquid_glass(window_ptr) {
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
        WindowLevel::Normal => abstand_macos::apply_window_normal_level(window_ptr, false),
        WindowLevel::Floating => abstand_macos::apply_window_floating_level(window_ptr, true),
        WindowLevel::ScreenSaver => {
            abstand_macos::apply_window_screen_saver_level(window_ptr, true)
        }
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
        WindowLevel::Normal => abstand_macos::apply_window_normal_level(window_ptr, false),
        WindowLevel::Floating => abstand_macos::apply_window_floating_level(window_ptr, true),
        WindowLevel::ScreenSaver => {
            abstand_macos::apply_window_screen_saver_level(window_ptr, true)
        }
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

    let applied_level = match config.level {
        OverlayWindowLevel::Normal => {
            abstand_macos::apply_window_normal_overlay_behavior(window_ptr, config.order_front)
        }
        OverlayWindowLevel::Floating => {
            abstand_macos::apply_window_floating_overlay_behavior(window_ptr, config.order_front)
        }
        OverlayWindowLevel::ScreenSaver => {
            abstand_macos::apply_window_screen_overlay_behavior(window_ptr)
        }
    };
    if !applied_level {
        log::debug!(
            target: LOG_TARGET,
            "failed to apply overlay window level for {}",
            window_label
        );
    }

    if abstand_macos::apply_window_liquid_glass(window_ptr) {
        return;
    }

    if abstand_macos::apply_window_transparency(window_ptr) {
        return;
    }

    log::debug!(
        target: LOG_TARGET,
        "failed to apply native window transparency for {}",
        window_label
    );
}

const LOG_TARGET: &str = "app::window::macos";
