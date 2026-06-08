#[cfg(all(desktop, not(debug_assertions), not(feature = "app-store")))]
use tauri_plugin_updater::UpdaterExt;

use serde::Serialize;
use tauri::AppHandle;

#[tauri::command]
#[specta::specta]
pub async fn check_for_update(app: AppHandle) -> Result<UpdateCheckResult, String> {
    #[cfg(all(desktop, not(debug_assertions), not(feature = "app-store")))]
    {
        let update = app
            .updater()
            .map_err(|error| error.to_string())?
            .check()
            .await
            .map_err(|error| error.to_string())?;

        let Some(update) = update else {
            return Ok(UpdateCheckResult::UpToDate);
        };

        return Ok(UpdateCheckResult::Available {
            update: UpdateInfo {
                version: update.version,
                current_version: update.current_version,
            },
        });
    }

    #[cfg(not(all(desktop, not(debug_assertions), not(feature = "app-store"))))]
    {
        let _ = app;
        return Ok(UpdateCheckResult::Unsupported);
    }
}

#[tauri::command]
#[specta::specta]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    #[cfg(all(desktop, not(debug_assertions), not(feature = "app-store")))]
    {
        let update = app
            .updater()
            .map_err(|error| error.to_string())?
            .check()
            .await
            .map_err(|error| error.to_string())?
            .ok_or_else(|| "No update available".to_string())?;

        update
            .download_and_install(|_, _| {}, || {})
            .await
            .map_err(|error| error.to_string())?;

        app.restart();
    }

    #[cfg(not(all(desktop, not(debug_assertions), not(feature = "app-store"))))]
    {
        let _ = app;
        return Err(unsupported_updates_error());
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum UpdateCheckResult {
    Unsupported,
    UpToDate,
    Available { update: UpdateInfo },
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version: String,
    pub current_version: String,
}

#[cfg(not(all(desktop, not(debug_assertions), not(feature = "app-store"))))]
fn unsupported_updates_error() -> String {
    return "Updates are only supported in production direct-distribution builds".to_string();
}
