//! Manages intentions persistence and commands.

pub mod commands;
pub mod intention;
pub mod repository;
pub mod runtime;
pub mod types;

use tauri::{App, Manager};
use types::IntentionRuntimeState;

pub fn setup(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    app.manage(IntentionRuntimeState::init(app)?);
    return Ok(());
}
