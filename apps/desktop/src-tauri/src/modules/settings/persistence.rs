use super::types::{AppSettings, SettingsVersion};
use crate::{environment::configs::settings::SettingsConfig, environment::path::get_app_data_dir};
use serde_json::Value;
use std::{fs, path::PathBuf};
use tauri::{Manager, Runtime};

/// Load settings from disk, or return defaults if file doesn't exist.
pub fn load_settings<R: Runtime, M: Manager<R>>(app: &M) -> AppSettings {
    let settings_path = match get_settings_path(app) {
        Ok(settings_path) => settings_path,
        Err(error) => {
            log::warn!(target: LOG_TARGET, "failed to resolve settings path: {}", error);
            return AppSettings::default();
        }
    };

    if !settings_path.exists() {
        return AppSettings::default();
    }

    let content = match fs::read_to_string(&settings_path) {
        Ok(content) => content,
        Err(error) => {
            log::warn!(target: LOG_TARGET, "failed to read settings file: {}", error);
            return AppSettings::default();
        }
    };

    let mut value = match serde_json::from_str::<Value>(&content) {
        Ok(value) => value,
        Err(error) => {
            log::warn!(target: LOG_TARGET, "failed to parse settings file: {}", error);
            return AppSettings::default();
        }
    };

    let version_before = version_from_value(&value);
    while version_from_value(&value) != SettingsVersion::current() {
        migrate_value_one_step(&mut value);
    }

    let settings = match serde_json::from_value::<AppSettings>(value) {
        Ok(settings) => settings,
        Err(error) => {
            log::warn!(
                target: LOG_TARGET,
                "failed to deserialize settings after migration: {}",
                error
            );
            return AppSettings::default();
        }
    };

    if version_before != SettingsVersion::current() {
        if let Err(error) = save_settings(app, &settings) {
            log::warn!(target: LOG_TARGET, "failed to persist migrated settings: {}", error);
        }
    }

    return settings;
}

/// Save settings to disk.
pub fn save_settings<R: Runtime, M: Manager<R>>(
    app: &M,
    settings: &AppSettings,
) -> Result<(), String> {
    let settings_path = get_settings_path(app)?;

    let json = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("Failed to serialize settings: {}", error))?;

    fs::write(&settings_path, json)
        .map_err(|error| format!("Failed to write settings file: {}", error))?;

    return Ok(());
}

fn get_settings_path<R: Runtime, M: Manager<R>>(app: &M) -> Result<PathBuf, String> {
    let data_dir = get_app_data_dir(app)?;
    return Ok(data_dir.join(SettingsConfig::file_name()));
}

fn migrate_value_one_step(value: &mut Value) {
    match version_from_value(value) {
        SettingsVersion::V0_0_1 => {}
    }
}

fn version_from_value(value: &Value) -> SettingsVersion {
    return value
        .get("version")
        .and_then(|version| serde_json::from_value(version.clone()).ok())
        .unwrap_or(SettingsVersion::default());
}

const LOG_TARGET: &str = "modules::settings::persistence";
