use super::persistence::load_settings;
use serde::{Deserialize, Serialize};
use std::{ops::Deref, sync::Mutex};
use tauri::App;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", default)]
pub struct AppSettings {
    pub version: SettingsVersion,
    pub appearance: AppearanceSettings,
    pub developer: DeveloperSettings,
    pub shortcuts: ShortcutsSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        return Self {
            version: SettingsVersion::current(),
            appearance: AppearanceSettings::default(),
            developer: DeveloperSettings::default(),
            shortcuts: ShortcutsSettings::default(),
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum SettingsVersion {
    #[serde(rename = "0.0.1")]
    V0_0_1,
}

impl SettingsVersion {
    pub fn current() -> Self {
        return Self::V0_0_1;
    }
}

impl Default for SettingsVersion {
    fn default() -> Self {
        return Self::current();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct AppearanceSettings {
    pub theme: Theme,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    #[default]
    Auto,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct DeveloperSettings {
    pub enabled: bool,
}

// Note: Each field name must have a matching variant in `shortcuts::types::ShortcutAction`
// with the same camelCase name, otherwise the shortcut will have no effect.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", default)]
pub struct ShortcutsSettings {
    pub search: KeyboardShortcut,
    pub toggle_sidebar: KeyboardShortcut,
}

impl Default for ShortcutsSettings {
    fn default() -> Self {
        return Self {
            search: KeyboardShortcut {
                modifiers: vec![ShortcutModifier::Meta],
                code: "KeyK".to_string(),
                global: false,
            },
            toggle_sidebar: KeyboardShortcut {
                modifiers: vec![ShortcutModifier::Meta],
                code: "KeyB".to_string(),
                global: false,
            },
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct KeyboardShortcut {
    pub modifiers: Vec<ShortcutModifier>,
    /// A browser KeyboardEvent.code value, e.g. "KeyK", "KeyB".
    pub code: String,
    /// Whether the shortcut is registered globally with the OS (true) or only active when the app is focused (false).
    pub global: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum ShortcutModifier {
    Meta,
    Ctrl,
    Alt,
    Shift,
}

// MARK: - State

pub struct AppSettingsState(Mutex<AppSettings>);

impl AppSettingsState {
    pub fn init(app: &App) -> Self {
        let settings = load_settings(app);
        return Self(Mutex::new(settings));
    }
}

impl Deref for AppSettingsState {
    type Target = Mutex<AppSettings>;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}

// MARK: - Events

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsChangedEvent(pub AppSettings);
