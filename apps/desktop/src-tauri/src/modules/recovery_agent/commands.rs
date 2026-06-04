use super::agent::{RecoveryAgent, RecoveryAgentStatus};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
#[specta::specta]
pub async fn get_recovery_agent_status() -> Result<RecoveryAgentStatus, String> {
    return tauri::async_runtime::spawn_blocking(|| {
        let agent = RecoveryAgent::for_current_app().map_err(|error| error.to_string())?;
        return agent.status().map_err(|error| error.to_string());
    })
    .await
    .map_err(|error| error.to_string())?;
}

#[tauri::command]
#[specta::specta]
pub async fn install_recovery_agent() -> Result<RecoveryAgentStatus, String> {
    return tauri::async_runtime::spawn_blocking(|| {
        let agent = RecoveryAgent::for_current_app().map_err(|error| error.to_string())?;
        agent.enable().map_err(|error| error.to_string())?;
        return agent.status().map_err(|error| error.to_string());
    })
    .await
    .map_err(|error| error.to_string())?;
}

#[tauri::command]
#[specta::specta]
pub async fn uninstall_recovery_agent() -> Result<RecoveryAgentStatus, String> {
    return tauri::async_runtime::spawn_blocking(|| {
        let agent = RecoveryAgent::for_current_app().map_err(|error| error.to_string())?;
        agent.disable().map_err(|error| error.to_string())?;
        return agent.status().map_err(|error| error.to_string());
    })
    .await
    .map_err(|error| error.to_string())?;
}

#[tauri::command]
#[specta::specta]
pub fn reveal_recovery_agent_plist(app: AppHandle) -> Result<(), String> {
    let agent = RecoveryAgent::for_current_app().map_err(|error| error.to_string())?;
    let plist_path = agent.plist_path();

    if plist_path.exists() {
        return app
            .opener()
            .reveal_item_in_dir(plist_path)
            .map_err(|error| error.to_string());
    }

    let parent = plist_path
        .parent()
        .ok_or_else(|| "recovery agent plist parent unavailable".to_string())?;
    return app
        .opener()
        .open_path(parent.to_string_lossy().as_ref(), None::<&str>)
        .map_err(|error| error.to_string());
}
