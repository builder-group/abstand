//! Manages intentions persistence and commands.

pub mod commands;
pub mod intention;
pub mod repository;
pub mod runtime;
pub mod scheduled_runtime;
pub mod types;

use tauri::{App, Manager};
use types::IntentionRuntimeState;

pub fn setup(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    // Note: manage before resync so scheduled callbacks can resolve runtime state
    app.manage(IntentionRuntimeState::init());

    let runtime = app.state::<IntentionRuntimeState>();
    // Note: blocks intentionally so the runtime is fully synced before the app accepts commands
    tauri::async_runtime::block_on(runtime.resync_all(app.handle()))?;

    return Ok(());
}
