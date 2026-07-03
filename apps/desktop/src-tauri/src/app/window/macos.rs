use super::overlay_window::types::{OverlayWindowConfig, OverlayWindowLevel};
use tauri::{
    window::{Effect, EffectsBuilder},
    WebviewWindow,
};

pub fn apply_liquid_glass(window: &WebviewWindow, window_label: &str) {
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

pub fn apply_overlay_behavior(
    window: &WebviewWindow,
    config: &OverlayWindowConfig,
    window_label: &str,
) {
    let Ok(window_ptr) = window.ns_window() else {
        log::debug!(target: LOG_TARGET, "failed to access NSWindow for {}", window_label);
        return;
    };

    let applied_level = match config.level {
        OverlayWindowLevel::Normal => {
            abstand_macos::apply_window_normal_overlay_behavior(window_ptr, config.order_front)
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
