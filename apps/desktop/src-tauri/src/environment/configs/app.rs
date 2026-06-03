use serde::Serialize;
use specta::Type;

pub struct AppConfig;

impl AppConfig {
    pub fn app_name() -> &'static str {
        return "Abstand";
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
