use super::policy;
use tauri::AppHandle;

#[tauri::command]
#[specta::specta]
pub async fn confirm_balanced_quit(app: AppHandle) -> Result<(), String> {
    return policy::confirm_balanced_quit(&app).await;
}
