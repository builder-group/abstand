use super::types::{BlockingRuntimeState, BlockingViolation};
use tauri::Manager;

#[tauri::command]
#[specta::specta]
pub fn get_blocking_violation(app: tauri::AppHandle) -> Option<BlockingViolation> {
    return app
        .state::<BlockingRuntimeState>()
        .lock()
        .unwrap()
        .active_violation();
}
