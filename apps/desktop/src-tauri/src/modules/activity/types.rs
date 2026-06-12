use crate::common::url::extract_hostname;
use mado::{WindowBounds, WindowInfo};

/// Describes the best currently available focused activity.
///
/// App activation can arrive before focused window details are available, so window and browser
/// fields are optional and may be filled by a later focus event for the same app.
#[derive(Debug, Clone, PartialEq)]
pub struct ActivityFocus {
    pub source: ActivityFocusSource,
    pub pid: i32,
    pub app_name: Option<String>,
    pub target: ActivityTarget,
    pub window_bounds: Option<ActivityWindowBounds>,
}

impl ActivityFocus {
    pub fn is_own_process(&self) -> bool {
        return self.pid == std::process::id() as i32;
    }

    pub fn is_waiting_for_window_details(&self) -> bool {
        return matches!(
            self.source,
            ActivityFocusSource::AppActivated {
                expects_window_update: true,
            }
        );
    }

    pub fn summary(&self) -> String {
        return format!(
            "app={} bundle_id={} website={}",
            self.app_name.as_deref().unwrap_or("Unknown"),
            self.target.app_bundle_id.as_deref().unwrap_or("unknown"),
            self.target.website_hostname.as_deref().unwrap_or("none")
        );
    }
}

impl From<WindowInfo> for ActivityFocus {
    fn from(window: WindowInfo) -> Self {
        return Self {
            source: ActivityFocusSource::WindowChanged,
            pid: window.app.pid,
            app_name: window.app.name,
            target: ActivityTarget {
                app_bundle_id: window.app.bundle_id,
                website_hostname: window
                    .browser
                    .as_ref()
                    .and_then(|browser| browser.url.as_deref())
                    .and_then(extract_hostname),
            },
            window_bounds: window.bounds.map(ActivityWindowBounds::from),
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActivityFocusSource {
    AppActivated { expects_window_update: bool },
    WindowChanged,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ActivityTarget {
    pub app_bundle_id: Option<String>,
    pub website_hostname: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ActivityWindowBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl From<WindowBounds> for ActivityWindowBounds {
    fn from(bounds: WindowBounds) -> Self {
        return Self {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
        };
    }
}
