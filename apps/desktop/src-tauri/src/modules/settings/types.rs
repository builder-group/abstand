use super::persistence::load_settings;
use crate::modules::shortcuts::types::{KeyboardShortcut, ShortcutAction};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, ops::Deref, sync::Mutex};
use tauri::App;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub version: SettingsVersion,
    pub appearance: AppearanceSettings,
    pub developer: DeveloperSettings,
    pub onboarding: OnboardingSettings,
    pub updates: UpdateSettings,
    /// User overrides per action. Absent key = use default. None value = shortcut cleared.
    pub shortcuts: HashMap<ShortcutAction, Option<KeyboardShortcut>>,
}

impl Default for AppSettings {
    fn default() -> Self {
        return Self {
            version: SettingsVersion::current(),
            appearance: AppearanceSettings::default(),
            developer: DeveloperSettings::default(),
            onboarding: OnboardingSettings::default(),
            updates: UpdateSettings::default(),
            shortcuts: HashMap::new(),
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
pub enum SettingsVersion {
    #[serde(rename = "0.0.1")]
    V0_0_1,
    #[serde(rename = "0.0.2")]
    V0_0_2,
}

impl SettingsVersion {
    pub fn current() -> Self {
        return Self::V0_0_2;
    }
}

impl Default for SettingsVersion {
    fn default() -> Self {
        return Self::current();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppearanceSettings {
    pub theme: Theme,
    // Note: Font scale is app-controlled and finite; export the frontend type as `number`
    #[specta(type = specta_typescript::Number)]
    pub font_scale: f64,
}

impl Default for AppearanceSettings {
    fn default() -> Self {
        return Self {
            theme: Theme::default(),
            font_scale: 1.0,
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "camelCase")]
pub enum Theme {
    Light,
    Dark,
    #[default]
    Auto,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct DeveloperSettings {
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct OnboardingSettings {
    pub completed_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettings {
    pub automatically_check: bool,
    pub release_channel: ReleaseChannel,
}

impl Default for UpdateSettings {
    fn default() -> Self {
        return Self {
            automatically_check: true,
            release_channel: ReleaseChannel::default(),
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "camelCase")]
pub enum ReleaseChannel {
    #[default]
    Stable,
    Beta,
    Nightly,
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
