use serde::{Deserialize, Serialize};

// Note: Each variant must have a matching field in `settings::types::ShortcutsSettings`
// with the same camelCase name, otherwise the action will never fire.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum ShortcutAction {
    Search,
    ToggleSidebar,
}

// MARK: - Events

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutTriggeredEvent(pub ShortcutAction);
