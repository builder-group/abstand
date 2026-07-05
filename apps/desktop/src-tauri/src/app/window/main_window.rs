use tauri::{CloseRequestApi, Window};

pub fn handle_focus(window: &Window, is_focused: bool) {
    apply_focus_level(window, is_focused);
}

pub fn handle_close(window: &Window, api: &CloseRequestApi) {
    api.prevent_close();
    apply_focus_level(window, false);
    let _ = window.hide();
}

fn apply_focus_level(window: &Window, is_focused: bool) {
    #[cfg(target_os = "macos")]
    {
        use super::macos;

        // Note: Abstand floats while focused so it can sit above app and website blocking overlays
        let level = if is_focused {
            macos::WindowLevel::Floating
        } else {
            macos::WindowLevel::Normal
        };
        macos::apply_window_level(window, level);
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window;
        let _ = is_focused;
    }
}
