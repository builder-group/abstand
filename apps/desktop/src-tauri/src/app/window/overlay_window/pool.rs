use super::types::{OverlayWindow, OverlayWindowBounds, OverlayWindowOwner};

pub struct OverlayWindowPool {
    max_windows: usize,
    next_id: u32,
    windows: Vec<PooledOverlayWindow>,
}

impl OverlayWindowPool {
    pub fn new() -> Self {
        return Self {
            max_windows: MAX_OVERLAY_WINDOWS,
            next_id: 0,
            windows: Vec::new(),
        };
    }

    pub fn acquire(&mut self, owner: OverlayWindowOwner) -> Option<OverlayWindow> {
        if let Some(window) = self
            .windows
            .iter()
            .find(|window| window.owner.as_ref() == Some(&owner))
        {
            return Some(window.window);
        }

        if let Some(window) = self
            .windows
            .iter_mut()
            .find(|window| window.owner.is_none() && !window.is_release_pending)
        {
            window.owner = Some(owner);
            window.intended_bounds = None;
            return Some(window.window);
        }

        if self.windows.len() >= self.max_windows {
            return None;
        }

        let id = self.next_id;
        self.next_id = self.next_id.wrapping_add(1);
        let window = PooledOverlayWindow {
            window: OverlayWindow::new(id),
            owner: Some(owner),
            is_release_pending: false,
            intended_bounds: None,
        };
        let overlay_window = window.window;
        self.windows.push(window);
        return Some(overlay_window);
    }

    pub fn window_for_owner(&self, owner: &OverlayWindowOwner) -> Option<OverlayWindow> {
        return self
            .windows
            .iter()
            .find(|window| window.owner.as_ref() == Some(owner))
            .map(|window| window.window);
    }

    pub fn release(&mut self, owner: &OverlayWindowOwner) -> Option<OverlayWindow> {
        let window = self
            .windows
            .iter_mut()
            .find(|window| window.owner.as_ref() == Some(owner))?;

        window.owner = None;
        window.is_release_pending = true;
        window.intended_bounds = None;
        return Some(window.window);
    }

    pub fn finish_release(&mut self, overlay_window: OverlayWindow) {
        let Some(window) = self
            .windows
            .iter_mut()
            .find(|window| window.window == overlay_window)
        else {
            return;
        };

        if window.owner.is_none() {
            window.is_release_pending = false;
        }
    }

    pub fn set_intended_bounds(
        &mut self,
        overlay_window: OverlayWindow,
        bounds: Option<OverlayWindowBounds>,
    ) {
        let Some(window) = self
            .windows
            .iter_mut()
            .find(|window| window.window == overlay_window)
        else {
            return;
        };

        window.intended_bounds = bounds;
    }

    pub fn intended_bounds_for_label(&self, label: &str) -> Option<OverlayWindowBounds> {
        return self
            .windows
            .iter()
            .find(|window| window.owner.is_some() && window.window.label() == label)
            .and_then(|window| window.intended_bounds);
    }
}

struct PooledOverlayWindow {
    window: OverlayWindow,
    owner: Option<OverlayWindowOwner>,
    is_release_pending: bool,
    // Last bounds assigned by the app for this overlay window.
    // Needed because external window managers can still move overlays through Accessibility APIs, so move/resize
    // events use these bounds to restore the intended frame.
    intended_bounds: Option<OverlayWindowBounds>,
}

const MAX_OVERLAY_WINDOWS: usize = 5;
