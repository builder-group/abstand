use super::persistence::load_settings;
use crate::modules::shortcuts::types::{KeyboardShortcut, ShortcutAction};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, ops::Deref, sync::Mutex};
use tauri::App;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub version: SettingsVersion,
    pub activity: ActivitySettings,
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
            activity: ActivitySettings::default(),
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
    #[serde(rename = "0.0.3")]
    V0_0_3,
}

impl SettingsVersion {
    pub fn current() -> Self {
        return Self::V0_0_3;
    }
}

impl Default for SettingsVersion {
    fn default() -> Self {
        return Self::current();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ActivitySettings {
    pub enabled: bool,
    pub foreground: ActivityForegroundSettings,
}

impl ActivitySettings {
    pub fn normalized(mut self) -> Self {
        self.foreground = self.foreground.normalized();
        return self;
    }
}

impl Default for ActivitySettings {
    fn default() -> Self {
        return Self {
            enabled: false,
            foreground: ActivityForegroundSettings::default(),
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ActivityForegroundSettings {
    pub track_apps: bool,
    pub track_windows: bool,
    pub track_browser: bool,
    pub track_private_browser: bool,
}

impl ActivityForegroundSettings {
    pub fn normalized(mut self) -> Self {
        if !self.track_apps {
            self.track_windows = false;
        }
        if !self.track_windows {
            self.track_browser = false;
        }
        if !self.track_browser {
            self.track_private_browser = false;
        }

        return self;
    }
}

impl Default for ActivityForegroundSettings {
    fn default() -> Self {
        return Self {
            track_apps: false,
            track_windows: false,
            track_browser: false,
            track_private_browser: false,
        };
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
