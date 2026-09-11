use super::types::{OverlayWindow, OverlayWindowBounds, OverlayWindowOwner};

pub struct OverlayWindowPool {
    next_id: u32,
    windows: Vec<PooledOverlayWindow>,
}

impl OverlayWindowPool {
    pub fn new() -> Self {
        return Self {
            next_id: 0,
            windows: Vec::new(),
        };
    }

    pub fn acquire(&mut self, owner: OverlayWindowOwner) -> OverlayWindow {
        if let Some(window) = self
            .windows
            .iter()
            .find(|window| window.owner.as_ref() == Some(&owner))
        {
            return window.window;
        }

        if let Some(window) = self
            .windows
            .iter_mut()
            .find(|window| window.owner.is_none() && !window.is_release_pending)
        {
            window.owner = Some(owner);
            window.intended_bounds = None;
            return window.window;
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
        return overlay_window;
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn every_active_owner_gets_a_distinct_overlay() {
        let mut pool = OverlayWindowPool::new();
        let windows = (0..12)
            .map(|id| pool.acquire(OverlayWindowOwner::new(format!("window-{id}"))))
            .collect::<HashSet<_>>();
        assert_eq!(windows.len(), 12);
    }

    #[test]
    fn reuses_only_after_the_previous_hide_finishes() {
        let mut pool = OverlayWindowPool::new();
        let owner = OverlayWindowOwner::new("first");
        let first = pool.acquire(owner.clone());
        assert_eq!(pool.acquire(owner.clone()), first);
        assert_eq!(pool.release(&owner), Some(first));
        assert_ne!(pool.acquire(OverlayWindowOwner::new("second")), first);
        pool.finish_release(first);
        assert_eq!(pool.acquire(OverlayWindowOwner::new("third")), first);
    }

    #[test]
    fn reacquiring_owner_does_not_reclaim_a_window_waiting_to_hide() {
        let mut pool = OverlayWindowPool::new();
        let owner = OverlayWindowOwner::new("target");
        let first = pool.acquire(owner.clone());
        pool.release(&owner);
        assert_eq!(pool.window_for_owner(&owner), None);

        let next = pool.acquire(owner.clone());
        assert_ne!(next, first);
        pool.finish_release(first);
        assert_eq!(pool.window_for_owner(&owner), Some(next));
    }

    #[test]
    fn released_windows_no_longer_restore_their_previous_bounds() {
        let mut pool = OverlayWindowPool::new();
        let owner = OverlayWindowOwner::new("target");
        let window = pool.acquire(owner.clone());
        let bounds = OverlayWindowBounds {
            x: 10.0,
            y: 20.0,
            width: 300.0,
            height: 200.0,
        };
        pool.set_intended_bounds(window, Some(bounds));
        assert_eq!(
            pool.intended_bounds_for_label(&window.label()),
            Some(bounds)
        );
        pool.release(&owner);
        assert_eq!(pool.intended_bounds_for_label(&window.label()), None);
        pool.finish_release(window);
        assert_eq!(pool.acquire(owner), window);
        assert_eq!(pool.intended_bounds_for_label(&window.label()), None);
    }
}
