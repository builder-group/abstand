use std::ffi::c_void;

#[cfg(target_os = "macos")]
mod ffi;
#[cfg(target_os = "macos")]
use ffi::{
    abstand_macos_apply_window_liquid_glass, abstand_macos_get_small_system_font_size,
    abstand_macos_get_system_font_size,
};
#[cfg(target_os = "macos")]
use swift_rs::Int;

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

#[derive(Debug, Clone, Copy)]
pub struct SystemFontSizes {
    pub base: f64,
    pub small: f64,
}
