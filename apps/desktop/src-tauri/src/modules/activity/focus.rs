use crate::common::url::extract_website_target;
use mado::{AppInfo, WindowBounds, WindowInfo};

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
    pub browser_content_bounds: Option<ActivityWindowBounds>,
}

impl ActivityFocus {
    pub fn from_app_info(app: AppInfo, expects_window_update: bool) -> Self {
        return Self {
            source: ActivityFocusSource::AppActivated {
                expects_window_update,
            },
            pid: app.pid,
            app_name: app.name,
            target: ActivityTarget {
                app_bundle_id: app.bundle_id,
                website_hostname: None,
                website_path: None,
            },
            window_bounds: None,
            browser_content_bounds: None,
        };
    }

    pub fn from_window_info(window: WindowInfo) -> Self {
        let website_target = window
            .browser
            .as_ref()
            .and_then(|browser| browser.url.as_deref())
            .and_then(extract_website_target);

        return Self {
            source: ActivityFocusSource::WindowChanged,
            pid: window.app.pid,
            app_name: window.app.name,
            target: ActivityTarget {
                app_bundle_id: window.app.bundle_id,
                website_hostname: website_target
                    .as_ref()
                    .map(|target| target.hostname.clone()),
                website_path: website_target.and_then(|target| target.path),
            },
            window_bounds: window.bounds.map(ActivityWindowBounds::from),
            browser_content_bounds: window
                .browser
                .and_then(|browser| browser.content_bounds)
                .map(ActivityWindowBounds::from),
        };
    }

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
            "app={} bundle_id={} website={} path={}",
            self.app_name.as_deref().unwrap_or("Unknown"),
            self.target.app_bundle_id.as_deref().unwrap_or("unknown"),
            self.target.website_hostname.as_deref().unwrap_or("none"),
            self.target.website_path.as_deref().unwrap_or("none")
        );
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
    pub website_path: Option<String>,
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
