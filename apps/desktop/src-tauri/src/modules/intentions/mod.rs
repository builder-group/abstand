//! Manages intentions persistence, commands, and runtime activation.

pub mod block_policy;
pub mod commands;
pub mod condition_timing;
mod edit_policy;
pub mod intention;
pub mod repository;
pub mod runtime;
pub mod session;
pub mod timed_evaluator;
pub mod timed_runtime;
pub mod today;
pub mod types;

use tauri::{App, Manager};
use types::IntentionRuntimeState;

pub fn setup(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    // Note: manage before reevaluate so scheduled callbacks can resolve runtime state
    app.manage(IntentionRuntimeState::init());

    let runtime_state = app.state::<IntentionRuntimeState>();
    // Note: blocks intentionally so the runtime is fully reevaluated before the app accepts commands
    tauri::async_runtime::block_on(runtime_state.reevaluate(app.handle()))?;

    return Ok(());
}
