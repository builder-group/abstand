use super::types::{BlockingRuntimeState, BlockingViolation};
use std::time::Duration;
use tauri::{AppHandle, Manager};

#[tauri::command]
#[specta::specta]
pub fn get_blocking_violation(app: AppHandle) -> Option<BlockingViolation> {
    let runtime_state = app.state::<BlockingRuntimeState>();
    return runtime_state.lock().unwrap().active_violation();
}

#[tauri::command]
#[specta::specta]
pub fn pause_blocking_overlay(app: AppHandle, duration_ms: u64) -> Result<(), String> {
    let pause_duration = Duration::from_millis(duration_ms);
    let runtime_state = app.state::<BlockingRuntimeState>();
    let mut blocking_runtime = runtime_state.lock().unwrap();
    blocking_runtime.pause_overlay(app.clone(), pause_duration);

    return Ok(());
}
