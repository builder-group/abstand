//! Evaluates and applies block intention decisions from activity focus events.

pub mod commands;
mod policy;
pub mod runtime;
pub mod types;

use tauri::{App, Manager};
use types::BlockingRuntimeState;

pub fn setup(app: &App) {
    app.manage(BlockingRuntimeState::init());
}
