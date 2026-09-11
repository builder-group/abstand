use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ForegroundActivity {
    pub id: i64,
    pub app_id: i64,
    pub website_id: Option<i64>,
    pub capture_level: ForegroundActivityCaptureLevel,
    pub window_title: Option<String>,
    pub window_id: Option<i64>,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_width: Option<f64>,
    pub window_height: Option<f64>,
    pub browser_url: Option<String>,
    pub browser_is_private: Option<bool>,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub updated_at: i64,
    pub created_at: i64,
}

/// Describes the most detailed data stored for a foreground activity row.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum ForegroundActivityCaptureLevel {
    /// Stores only the foreground app.
    App,
    /// Stores app data plus at least one window field, with no browser fields.
    Window,
    /// Stores at least one browser field and may also include window fields.
    Browser,
}

impl ForegroundActivityCaptureLevel {
    pub fn as_str(&self) -> &'static str {
        return match self {
            Self::App => "app",
            Self::Window => "window",
            Self::Browser => "browser",
        };
    }

    pub fn from_str(value: &str) -> Result<Self, String> {
        return match value {
            "app" => Ok(Self::App),
            "window" => Ok(Self::Window),
            "browser" => Ok(Self::Browser),
            _ => Err(format!(
                "Unknown foreground activity capture level: {value}"
            )),
        };
    }
}
