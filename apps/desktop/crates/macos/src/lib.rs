use std::ffi::c_void;

#[cfg(target_os = "macos")]
mod ffi;
#[cfg(target_os = "macos")]
use ffi::abstand_macos_apply_window_liquid_glass;
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
