use super::types::{AppSettings, SettingsVersion};
use crate::{
    common::time::unix_ms_now, environment::configs::settings::SettingsConfig,
    environment::path::get_app_data_dir,
};
use serde_json::{json, Value};
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

    if !value.is_object() {
        log::warn!(target: LOG_TARGET, "settings file root must be an object");
        return AppSettings::default();
    }

    let version_before = match version_from_value(&value) {
        Ok(version) => version,
        Err(error) => {
            log::warn!(target: LOG_TARGET, "{}", error);
            return AppSettings::default();
        }
    };
    let mut current_version = version_before;
    while current_version != SettingsVersion::current() {
        current_version = match migrate_value_one_step(&mut value) {
            Ok(version) => version,
            Err(error) => {
                log::warn!(target: LOG_TARGET, "{}", error);
                return AppSettings::default();
            }
        };
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

fn migrate_value_one_step(value: &mut Value) -> Result<SettingsVersion, String> {
    match version_from_value(value)? {
        SettingsVersion::V0_0_1 => {
            migrate_v0_0_1_to_v0_0_2(value)?;
            return version_from_value(value);
        }
        SettingsVersion::V0_0_2 => {
            migrate_v0_0_2_to_v0_0_3(value)?;
            return version_from_value(value);
        }
        SettingsVersion::V0_0_3 => return Ok(SettingsVersion::V0_0_3),
    }
}

fn migrate_v0_0_1_to_v0_0_2(value: &mut Value) -> Result<(), String> {
    let Some(object) = value.as_object_mut() else {
        return Err("settings file root must be an object".to_string());
    };

    object.insert("version".to_string(), json!("0.0.2"));
    object.insert(
        "onboarding".to_string(),
        json!({
            "completedAt": unix_ms_now()
        }),
    );

    return Ok(());
}

fn migrate_v0_0_2_to_v0_0_3(value: &mut Value) -> Result<(), String> {
    let Some(object) = value.as_object_mut() else {
        return Err("settings file root must be an object".to_string());
    };

    object.insert("version".to_string(), json!("0.0.3"));
    object.insert(
        "activity".to_string(),
        json!({
            "enabled": false,
            "foreground": {
                "trackApps": false,
                "trackWindows": false,
                "trackBrowser": false,
                "trackPrivateBrowser": false
            }
        }),
    );

    return Ok(());
}

fn version_from_value(value: &Value) -> Result<SettingsVersion, String> {
    let Some(version) = value.get("version") else {
        return Err("settings file is missing version".to_string());
    };

    return serde_json::from_value(version.clone())
        .map_err(|error| format!("settings file has invalid version: {}", error));
}

const LOG_TARGET: &str = "modules::settings::persistence";
