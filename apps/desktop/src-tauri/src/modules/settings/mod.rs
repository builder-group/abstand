//! Manages app settings persistence, state, and commands.

pub mod commands;
pub mod persistence;
pub mod types;

use tauri::{App, Manager};
use types::AppSettingsState;

pub fn setup(app: &App) {
    app.manage(AppSettingsState::init(app));
}
