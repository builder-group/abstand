use super::AppTray;
use crate::modules::{
    db::types::DatabaseState, intentions::repository::IntentionSessionRepository,
};
use tauri::{AppHandle, Manager};

pub struct TrayStatusItem;

impl TrayStatusItem {
    pub async fn refresh(app: &AppHandle) {
        let Some(tray) = AppTray::get(app) else {
            return;
        };

        let database_state = app.state::<DatabaseState>();
        let has_active_sessions = match IntentionSessionRepository::has_active_sessions(
            &database_state.pool,
        )
        .await
        {
            Ok(has_active_sessions) => has_active_sessions,
            Err(error) => {
                log::warn!(target: LOG_TARGET, "tray status item appearance build failed: {}", error);
                return;
            }
        };

        let appearance = abstand_macos::TrayStatusItemAppearance {
            active_dot_visible: has_active_sessions,
        };

        let did_apply = match Self::apply_appearance_to_tray(&tray, appearance) {
            Ok(did_apply) => did_apply,
            Err(error) => {
                log::debug!(
                    target: LOG_TARGET,
                    "tray status item appearance native apply failed: {}",
                    error
                );
                return;
            }
        };

        let Some(did_apply) = did_apply else {
            log::debug!(target: LOG_TARGET, "native tray status item is unavailable");
            return;
        };

        if !did_apply {
            log::debug!(
                target: LOG_TARGET,
                "failed to apply native tray status item appearance"
            );
        }
    }

    fn apply_appearance_to_tray(
        tray: &tauri::tray::TrayIcon<tauri::Wry>,
        appearance: abstand_macos::TrayStatusItemAppearance,
    ) -> tauri::Result<Option<bool>> {
        return tray.with_inner_tray_icon(move |inner| {
            return inner.ns_status_item().map(|status_item| {
                // SAFETY: `ns_status_item` returns Tauri's borrowed native `NSStatusItem` for this tray,
                // and the pointer is only used during the synchronous FFI call.
                unsafe { abstand_macos::apply_status_item_appearance(&*status_item, appearance) }
            });
        });
    }
}

const LOG_TARGET: &str = "app::tray::status_item";
