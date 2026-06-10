use super::types::{BlockingRuntimeState, BlockingViolation};
use tauri::Manager;

#[tauri::command]
#[specta::specta]
pub fn get_blocking_violation(app: tauri::AppHandle) -> Option<BlockingViolation> {
    let runtime_state = app.state::<BlockingRuntimeState>();
    return runtime_state.lock().unwrap().active_violation();
}
