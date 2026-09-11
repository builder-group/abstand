pub mod types;

use self::types::{MainWindowFocusedLevel, MainWindowState};
use super::AppWindow;
use tauri::{App, AppHandle, CloseRequestApi, Manager, WebviewWindow, Window};

pub fn setup(app: &mut App) {
    app.manage(MainWindowState::new());
}

pub fn handle_focus(window: &Window, is_focused: bool) {
    if !is_focused {
        MainWindowState::reset_focused_level_policy(window.app_handle());
        #[cfg(target_os = "macos")]
        super::macos::apply_window_level(window, super::macos::WindowLevel::Normal);
        return;
    }

    #[cfg(target_os = "macos")]
    super::macos::apply_window_level(
        window,
        MainWindowState::focused_level_policy(window.app_handle()).into(),
    );
}

pub fn handle_close(window: &Window, api: &CloseRequestApi) {
    api.prevent_close();
    MainWindowState::reset_focused_level_policy(window.app_handle());
    #[cfg(target_os = "macos")]
    super::macos::apply_window_level(window, super::macos::WindowLevel::Normal);
    let _ = window.hide();
}

pub fn show_intention(
    app: &AppHandle,
    intention_id: i64,
    focused_level: MainWindowFocusedLevel,
) -> tauri::Result<WebviewWindow> {
    // Note: macOS can send focus events while the window is being raised, so store the focused-window level first
    MainWindowState::set_focused_level_policy(app, focused_level);

    let window = match AppWindow::Main.show_at(app, &format!("/intentions/{}", intention_id)) {
        Ok(window) => window,
        Err(error) => {
            MainWindowState::reset_focused_level_policy(app);
            return Err(error);
        }
    };

    #[cfg(target_os = "macos")]
    super::macos::apply_webview_window_level(&window, focused_level.into());
    #[cfg(not(target_os = "macos"))]
    let _ = focused_level;

    return Ok(window);
}
