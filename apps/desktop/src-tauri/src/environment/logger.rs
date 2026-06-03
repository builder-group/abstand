use crate::environment::configs::app::AppConfig;
use log::LevelFilter;
use tauri::{plugin::TauriPlugin, Runtime};
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
}
