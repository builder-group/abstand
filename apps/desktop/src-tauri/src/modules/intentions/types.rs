use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum IntentionBehaviorType {
    Block,
    Break,
}

impl IntentionBehaviorType {
    pub fn as_str(&self) -> &'static str {
        return match self {
            Self::Block => "block",
            Self::Break => "break",
        };
    }

    pub fn from_str(value: &str) -> Result<Self, String> {
        return match value {
            "block" => Ok(Self::Block),
            "break" => Ok(Self::Break),
            _ => Err(format!("Unknown intention behavior type: {}", value)),
        };
    }
}

// MARK: - Events

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct IntentionCreatedEvent {
    pub intention_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct IntentionUpdatedEvent {
    pub intention_id: i64,
}
