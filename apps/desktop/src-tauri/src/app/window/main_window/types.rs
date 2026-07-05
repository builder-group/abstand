use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MainWindowFocusedLevel {
    Floating,
    ScreenSaver,
}

impl Default for MainWindowFocusedLevel {
    fn default() -> Self {
        return Self::Floating;
    }
}

#[cfg(target_os = "macos")]
impl From<MainWindowFocusedLevel> for crate::app::window::macos::WindowLevel {
    fn from(focused_level: MainWindowFocusedLevel) -> Self {
        return match focused_level {
            MainWindowFocusedLevel::Floating => Self::Floating,
            MainWindowFocusedLevel::ScreenSaver => Self::ScreenSaver,
        };
    }
}

// MARK: - State

pub struct MainWindowState {
    focused_level_policy: Mutex<MainWindowFocusedLevel>,
}

impl MainWindowState {
    pub fn new() -> Self {
        return Self {
            focused_level_policy: Mutex::new(MainWindowFocusedLevel::default()),
        };
    }

    pub fn focused_level_policy(app: &AppHandle) -> MainWindowFocusedLevel {
        return *app.state::<Self>().focused_level_policy.lock().unwrap();
    }

    pub fn set_focused_level_policy(app: &AppHandle, focused_level: MainWindowFocusedLevel) {
        *app.state::<Self>().focused_level_policy.lock().unwrap() = focused_level;
    }

    pub fn reset_focused_level_policy(app: &AppHandle) {
        Self::set_focused_level_policy(app, MainWindowFocusedLevel::default());
    }
}
