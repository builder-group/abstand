use crate::common::url::extract_website_target;
use mado::{AppInfo, WindowBounds, WindowInfo};

/// Describes an observed app or window for blocking evaluation.
///
/// App activation can arrive before focused window details are available, so window and browser
/// fields are optional. Window observations can also describe background activity.
#[derive(Debug, Clone)]
pub struct ObservedActivity {
    pub pid: i32,
    pub app_name: Option<String>,
    pub window_id: Option<u32>,
    pub target: ObservedTarget,
    pub window_bounds: Option<WindowBounds>,
    pub browser_content_bounds: Option<WindowBounds>,
    pub has_browser_url: bool,
}

impl ObservedActivity {
    pub fn from_app_info(app: AppInfo) -> Self {
        return Self {
            pid: app.pid,
            app_name: app.name,
            window_id: None,
            target: ObservedTarget {
                app_bundle_id: app.bundle_id,
                website_hostname: None,
                website_path: None,
            },
            window_bounds: None,
            browser_content_bounds: None,
            has_browser_url: false,
        };
    }

    pub fn from_window_info(window: WindowInfo) -> Self {
        let website_target = window
            .browser
            .as_ref()
            .and_then(|browser| browser.url.as_deref())
            .and_then(extract_website_target);

        return Self {
            pid: window.app.pid,
            app_name: window.app.name,
            window_id: window.window_id,
            target: ObservedTarget {
                app_bundle_id: window.app.bundle_id,
                website_hostname: website_target
                    .as_ref()
                    .map(|target| target.hostname.clone()),
                website_path: website_target.and_then(|target| target.path),
            },
            window_bounds: window.bounds,
            has_browser_url: window
                .browser
                .as_ref()
                .and_then(|browser| browser.url.as_ref())
                .is_some(),
            browser_content_bounds: window.browser.and_then(|browser| browser.content_bounds),
        };
    }

    pub fn is_own_process(&self) -> bool {
        return self.pid == std::process::id() as i32;
    }

    pub fn is_login_window(&self) -> bool {
        return self.target.app_bundle_id.as_deref() == Some(MACOS_LOGIN_WINDOW_BUNDLE_ID);
    }

    pub fn summary(&self) -> String {
        return format!(
            "app={} bundle_id={} window_id={} website={} path={}",
            self.app_name.as_deref().unwrap_or("Unknown"),
            self.target.app_bundle_id.as_deref().unwrap_or("unknown"),
            self.window_id
                .map(|window_id| window_id.to_string())
                .unwrap_or_else(|| "none".to_string()),
            self.target.website_hostname.as_deref().unwrap_or("none"),
            self.target.website_path.as_deref().unwrap_or("none")
        );
    }
}

const MACOS_LOGIN_WINDOW_BUNDLE_ID: &str = "com.apple.loginwindow";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ObservedTarget {
    pub app_bundle_id: Option<String>,
    pub website_hostname: Option<String>,
    pub website_path: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn distinguishes_unavailable_browser_metadata_from_known_internal_pages() {
        let window = |url| WindowInfo {
            browser: Some(mado::BrowserInfo {
                url,
                content_bounds: None,
                is_private: None,
                website: None,
            }),
            title: None,
            window_id: Some(42),
            bounds: None,
            app: mado::AppInfo {
                pid: 1,
                name: None,
                bundle_id: None,
                process_path: None,
                icon: None,
            },
        };
        let missing = ObservedActivity::from_window_info(window(None));
        let internal = ObservedActivity::from_window_info(window(Some("about:blank".into())));
        assert!(!missing.has_browser_url);
        assert!(internal.has_browser_url);
        assert_eq!(missing.target.website_hostname, None);
        assert_eq!(internal.target.website_hostname, None);
    }
}
