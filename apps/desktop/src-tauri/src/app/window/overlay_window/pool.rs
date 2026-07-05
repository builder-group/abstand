use super::types::{OverlayWindow, OverlayWindowOwner};

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
}

struct PooledOverlayWindow {
    window: OverlayWindow,
    owner: Option<OverlayWindowOwner>,
    is_release_pending: bool,
}

const MAX_OVERLAY_WINDOWS: usize = 5;
