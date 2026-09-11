use super::types::{KeyboardShortcut, ShortcutAction};
use crate::modules::settings::types::AppSettingsState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[tauri::command]
#[specta::specta]
pub fn get_shortcut_configs(
    settings_state: State<'_, AppSettingsState>,
) -> Vec<ShortcutActionConfigDto> {
    let settings = settings_state.lock().unwrap();

    return ShortcutAction::all()
        .iter()
        .map(|action| {
            let shortcut = match settings.shortcuts.get(action) {
                None => Some(action.default_shortcut()),
                Some(override_shortcut) => override_shortcut.clone(),
            };

            return ShortcutActionConfigDto {
                action: action.clone(),
                is_global: action.is_global(),
                shortcut,
            };
        })
        .collect();
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutActionConfigDto {
    pub action: ShortcutAction,
    pub is_global: bool,
    pub shortcut: Option<KeyboardShortcut>,
}
