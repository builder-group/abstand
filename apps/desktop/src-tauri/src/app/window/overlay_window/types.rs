use super::pool::OverlayWindowPool;
use std::sync::Mutex;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct OverlayWindow {
    id: u32,
}

impl OverlayWindow {
    pub fn new(id: u32) -> Self {
        return Self { id };
    }

    pub fn label(&self) -> String {
        return format!("{OVERLAY_WINDOW_LABEL_PREFIX}{}", self.id);
    }
}

pub const OVERLAY_WINDOW_LABEL_PREFIX: &str = "overlay-";

#[derive(Debug, Clone)]
pub struct OverlayWindowConfig {
    pub local_route: Option<String>,
    pub bounds: Option<OverlayWindowBounds>,
    pub level: OverlayWindowLevel,
    pub order_front: bool,
}

impl OverlayWindowConfig {
    pub fn normal(local_route: Option<String>, bounds: Option<OverlayWindowBounds>) -> Self {
        return Self {
            local_route,
            bounds,
            level: OverlayWindowLevel::Normal,
            order_front: true,
        };
    }

    pub fn floating(local_route: Option<String>, bounds: Option<OverlayWindowBounds>) -> Self {
        return Self {
            local_route,
            bounds,
            level: OverlayWindowLevel::Floating,
            order_front: true,
        };
    }

    pub fn screen_saver(local_route: Option<String>, bounds: Option<OverlayWindowBounds>) -> Self {
        return Self {
            local_route,
            bounds,
            level: OverlayWindowLevel::ScreenSaver,
            order_front: false,
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OverlayWindowLevel {
    Normal,
    Floating,
    ScreenSaver,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct OverlayWindowBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Logical claim for one reusable overlay window.
///
/// Use one owner per simultaneously visible overlay. Reusing an owner updates the same window.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct OverlayWindowOwner(String);

impl OverlayWindowOwner {
    pub fn new(owner: impl Into<String>) -> Self {
        return Self(owner.into());
    }

    pub fn as_str(&self) -> &str {
        return &self.0;
    }
}

// MARK: - State

pub struct OverlayWindowPoolState(Mutex<OverlayWindowPool>);

impl OverlayWindowPoolState {
    pub fn new() -> Self {
        return Self(Mutex::new(OverlayWindowPool::new()));
    }

    pub fn acquire(&self, owner: OverlayWindowOwner) -> Option<OverlayWindow> {
        let mut pool = self.0.lock().unwrap();
        return pool.acquire(owner);
    }

    pub fn window_for_owner(&self, owner: &OverlayWindowOwner) -> Option<OverlayWindow> {
        let pool = self.0.lock().unwrap();
        return pool.window_for_owner(owner);
    }

    pub fn release(&self, owner: &OverlayWindowOwner) -> Option<OverlayWindow> {
        let mut pool = self.0.lock().unwrap();
        return pool.release(owner);
    }

    pub fn finish_release(&self, overlay_window: OverlayWindow) {
        let mut pool = self.0.lock().unwrap();
        pool.finish_release(overlay_window);
    }

    pub fn set_intended_bounds(
        &self,
        overlay_window: OverlayWindow,
        bounds: Option<OverlayWindowBounds>,
    ) {
        let mut pool = self.0.lock().unwrap();
        pool.set_intended_bounds(overlay_window, bounds);
    }

    pub fn intended_bounds_for_label(&self, label: &str) -> Option<OverlayWindowBounds> {
        let pool = self.0.lock().unwrap();
        return pool.intended_bounds_for_label(label);
    }
}
