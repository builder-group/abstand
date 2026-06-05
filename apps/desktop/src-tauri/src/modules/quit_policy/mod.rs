//! Manages quit prevention while protected Abstands are active.

pub mod commands;
pub mod policy;
pub mod types;

use self::types::QuitPolicyState;
use tauri::{App, Manager};

pub fn setup(app: &App) {
    app.manage(QuitPolicyState::init());
}
