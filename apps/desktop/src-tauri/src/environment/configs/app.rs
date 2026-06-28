use serde::Serialize;
use specta::Type;

pub struct AppConfig;

impl AppConfig {
    pub fn app_name() -> &'static str {
        return "Abstand";
    }

    pub fn version() -> &'static str {
        return env!("CARGO_PKG_VERSION");
    }

    pub fn display_version() -> String {
        let suffix = if cfg!(debug_assertions) { "d" } else { "p" };
        return format!("v{}{}", Self::version(), suffix);
    }

    /// Rust-side mirror of Tauri's identifier for code that runs before `AppHandle` exists.
    ///
    /// Prefer reading the identifier from Tauri config when app state is available.
    pub fn bundle_identifier() -> &'static str {
        if cfg!(debug_assertions) {
            return "com.buildergroup.abstand.dev";
        }
        return "com.buildergroup.abstand";
    }

    pub fn tray_tooltip() -> &'static str {
        return Self::app_name();
    }

    pub fn tray_icon_bytes() -> &'static [u8] {
        if cfg!(debug_assertions) {
            return include_bytes!(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/icons/tray-icon-dev.png"
            ));
        }
        return include_bytes!(concat!(env!("CARGO_MANIFEST_DIR"), "/icons/tray-icon.png"));
    }

    pub fn log_file_name() -> &'static str {
        return "abstand";
    }

    pub fn log_max_file_size_bytes() -> u128 {
        return 5 * 1024 * 1024;
    }

    pub fn log_file_rotation_count() -> usize {
        return 3;
    }

    pub fn distribution() -> AppDistribution {
        if cfg!(feature = "app-store") {
            return AppDistribution::AppStore;
        }
        return AppDistribution::Direct;
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum AppDistribution {
    AppStore,
    Direct,
}
