use std::ffi::c_void;

#[cfg(target_os = "macos")]
mod ffi;
#[cfg(target_os = "macos")]
use ffi::{
    abstand_macos_apply_window_liquid_glass, abstand_macos_get_small_system_font_size,
    abstand_macos_get_system_font_size, abstand_macos_is_app_running,
};
#[cfg(target_os = "macos")]
use swift_rs::{Int, SRString};

/// Applies liquid glass and makes WKWebViews transparent. No-op on App Store builds.
pub fn apply_window_liquid_glass(window_ptr: *mut c_void) -> bool {
    #[cfg(target_os = "macos")]
    {
        if window_ptr.is_null() {
            return false;
        }

        return unsafe { abstand_macos_apply_window_liquid_glass(window_ptr as Int) };
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window_ptr;
        return false;
    }
}

pub fn get_system_font_sizes() -> SystemFontSizes {
    #[cfg(target_os = "macos")]
    {
        return SystemFontSizes {
            base: unsafe { abstand_macos_get_system_font_size() },
            small: unsafe { abstand_macos_get_small_system_font_size() },
        };
    }

    #[cfg(not(target_os = "macos"))]
    {
        return SystemFontSizes {
            base: 13.0,
            small: 11.0,
        };
    }
}

/// Returns whether another running app process exists for the bundle identifier.
pub fn is_app_running(bundle_identifier: &str, excluded_pid: u32) -> bool {
    #[cfg(target_os = "macos")]
    {
        let bundle_identifier: SRString = bundle_identifier.into();
        let excluded_pid = i32::try_from(excluded_pid).unwrap_or(i32::MAX);
        return unsafe { abstand_macos_is_app_running(&bundle_identifier, excluded_pid) };
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = bundle_identifier;
        let _ = excluded_pid;
        return false;
    }
}

#[derive(Debug, Clone, Copy)]
pub struct SystemFontSizes {
    pub base: f64,
    pub small: f64,
}
