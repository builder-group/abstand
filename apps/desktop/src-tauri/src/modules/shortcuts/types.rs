use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum ShortcutAction {
    Search,
    NewIntention,
    ToggleSidebar,
}

impl ShortcutAction {
    pub fn all() -> &'static [Self] {
        return &[Self::Search, Self::NewIntention, Self::ToggleSidebar];
    }

    pub fn is_global(&self) -> bool {
        return match self {
            Self::Search | Self::NewIntention | Self::ToggleSidebar => false,
        };
    }

    pub fn default_shortcut(&self) -> KeyboardShortcut {
        return match self {
            Self::Search => KeyboardShortcut {
                modifiers: vec![ShortcutModifier::Meta],
                code: "KeyK".to_string(),
            },
            Self::NewIntention => KeyboardShortcut {
                modifiers: vec![ShortcutModifier::Meta],
                code: "KeyN".to_string(),
            },
            Self::ToggleSidebar => KeyboardShortcut {
                modifiers: vec![ShortcutModifier::Meta],
                code: "KeyB".to_string(),
            },
        };
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct KeyboardShortcut {
    pub modifiers: Vec<ShortcutModifier>,
    /// A browser KeyboardEvent.code value, e.g. "KeyK", "KeyB".
    pub code: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum ShortcutModifier {
    Meta,
    Ctrl,
    Alt,
    Shift,
}

// MARK: - Events

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutTriggeredEvent(pub ShortcutAction);
