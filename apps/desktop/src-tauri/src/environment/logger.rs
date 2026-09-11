use crate::environment::{configs::app::AppConfig, path::get_app_log_dir};
use log::LevelFilter;
use std::{fs, path::PathBuf};
use tauri::{plugin::TauriPlugin, Manager, Runtime};
use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};

pub struct Logger;

impl Logger {
    pub fn build<R: Runtime>() -> TauriPlugin<R> {
        return tauri_plugin_log::Builder::new()
            .targets(Self::targets())
            .level(Self::level())
            .max_file_size(AppConfig::log_max_file_size_bytes())
            .rotation_strategy(RotationStrategy::KeepSome(
                AppConfig::log_file_rotation_count(),
            ))
            .timezone_strategy(TimezoneStrategy::UseLocal)
            .build();
    }

    fn targets() -> Vec<Target> {
        let mut targets = vec![Target::new(TargetKind::LogDir {
            file_name: Some(AppConfig::log_file_name().to_string()),
        })];
        if cfg!(debug_assertions) {
            targets.push(Target::new(TargetKind::Stdout));
        }
        return targets;
    }

    fn level() -> LevelFilter {
        if cfg!(debug_assertions) {
            return LevelFilter::Debug;
        }
        return LevelFilter::Info;
    }

    pub fn ensure_log_file<R: Runtime, M: Manager<R>>(app: &M) -> Result<PathBuf, String> {
        let log_file_path = Self::log_file_path(app)?;
        fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file_path)
            .map_err(|e| e.to_string())?;
        return Ok(log_file_path);
    }

    fn log_file_path<R: Runtime, M: Manager<R>>(app: &M) -> Result<PathBuf, String> {
        return Ok(get_app_log_dir(app)?
            .join(AppConfig::log_file_name())
            .with_extension("log"));
    }
}
