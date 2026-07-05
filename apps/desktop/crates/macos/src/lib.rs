use std::ffi::c_void;

#[cfg(target_os = "macos")]
mod ffi;
#[cfg(target_os = "macos")]
use ffi::{
    abstand_macos_activate_app_by_pid, abstand_macos_apply_status_item_appearance,
    abstand_macos_apply_window_floating_level, abstand_macos_apply_window_floating_overlay_behavior,
    abstand_macos_apply_window_liquid_glass, abstand_macos_apply_window_normal_level,
    abstand_macos_apply_window_normal_overlay_behavior,
    abstand_macos_apply_window_screen_overlay_behavior, abstand_macos_apply_window_transparency,
    abstand_macos_get_small_system_font_size, abstand_macos_get_system_font_size,
    abstand_macos_is_app_running, abstand_macos_request_app_quit,
};
#[cfg(target_os = "macos")]
use swift_rs::{Int, SRString};

/// Applies native Liquid Glass and requests hosted WKWebView transparency.
///
/// Returns `false` if the window pointer is invalid, the platform is unsupported,
/// or Liquid Glass is unavailable.
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

/// Makes the native window background transparent and requests hosted WKWebView transparency.
///
/// Returns `false` if the window pointer is invalid or the platform is unsupported.
pub fn apply_window_transparency(window_ptr: *mut c_void) -> bool {
    #[cfg(target_os = "macos")]
    {
        if window_ptr.is_null() {
            return false;
        }

        return unsafe { abstand_macos_apply_window_transparency(window_ptr as Int) };
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window_ptr;
        return false;
    }
}

/// Applies the normal native window level.
pub fn apply_window_normal_level(window_ptr: *mut c_void, order_front: bool) -> bool {
    #[cfg(target_os = "macos")]
    {
        if window_ptr.is_null() {
            return false;
        }

        return unsafe {
            abstand_macos_apply_window_normal_level(window_ptr as Int, order_front.into())
        };
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window_ptr;
        let _ = order_front;
        return false;
    }
}

/// Applies the floating native window level.
pub fn apply_window_floating_level(window_ptr: *mut c_void, order_front: bool) -> bool {
    #[cfg(target_os = "macos")]
    {
        if window_ptr.is_null() {
            return false;
        }

        return unsafe {
            abstand_macos_apply_window_floating_level(window_ptr as Int, order_front.into())
        };
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window_ptr;
        let _ = order_front;
        return false;
    }
}

/// Applies native behavior for overlay windows that should stay at the normal app level.
pub fn apply_window_normal_overlay_behavior(window_ptr: *mut c_void, order_front: bool) -> bool {
    #[cfg(target_os = "macos")]
    {
        if window_ptr.is_null() {
            return false;
        }

        return unsafe {
            abstand_macos_apply_window_normal_overlay_behavior(
                window_ptr as Int,
                order_front.into(),
            )
        };
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window_ptr;
        let _ = order_front;
        return false;
    }
}

/// Applies native behavior for overlay windows that should stay above normal app windows.
pub fn apply_window_floating_overlay_behavior(window_ptr: *mut c_void, order_front: bool) -> bool {
    #[cfg(target_os = "macos")]
    {
        if window_ptr.is_null() {
            return false;
        }

        return unsafe {
            abstand_macos_apply_window_floating_overlay_behavior(
                window_ptr as Int,
                order_front.into(),
            )
        };
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window_ptr;
        let _ = order_front;
        return false;
    }
}

/// Applies native behavior for overlay windows that must appear above fullscreen spaces and the menu bar.
pub fn apply_window_screen_overlay_behavior(window_ptr: *mut c_void) -> bool {
    #[cfg(target_os = "macos")]
    {
        if window_ptr.is_null() {
            return false;
        }

        return unsafe { abstand_macos_apply_window_screen_overlay_behavior(window_ptr as Int) };
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window_ptr;
        return false;
    }
}

/// Activates the running app with the provided process id.
pub fn activate_app_by_pid(pid: i32) -> bool {
    #[cfg(target_os = "macos")]
    {
        if pid <= 0 {
            return false;
        }

        return unsafe { abstand_macos_activate_app_by_pid(pid) };
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = pid;
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

/// Requests normal termination for running app processes with the bundle identifier.
///
/// The result reports whether macOS accepted at least one graceful termination request.
pub fn request_app_quit(bundle_identifier: &str) -> AppQuitRequestResult {
    let bundle_identifier = bundle_identifier.trim();
    if bundle_identifier.is_empty() {
        return AppQuitRequestResult::Failed;
    }

    #[cfg(target_os = "macos")]
    {
        let bundle_identifier: SRString = bundle_identifier.into();
        let result = unsafe { abstand_macos_request_app_quit(&bundle_identifier) };

        if result < 0 {
            return AppQuitRequestResult::Failed;
        }

        if result == 0 {
            return AppQuitRequestResult::NotRunning;
        }

        return AppQuitRequestResult::Requested {
            process_count: result as u32,
        };
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = bundle_identifier;
        return AppQuitRequestResult::Unsupported;
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppQuitRequestResult {
    NotRunning,
    Requested { process_count: u32 },
    Failed,
    Unsupported,
}

/// Applies native appearance properties to the provided macOS status item.
///
/// # Safety
///
/// `status_item` must be a borrowed `NSStatusItem` that remains valid for the duration of this
/// synchronous call. The pointer must not be retained or used after the call returns.
///
/// Returns `false` if the platform is unsupported.
pub unsafe fn apply_status_item_appearance<T>(
    status_item: &T,
    appearance: TrayStatusItemAppearance,
) -> bool {
    #[cfg(target_os = "macos")]
    {
        let status_item_ptr = borrowed_native_object_ptr(status_item);

        return unsafe {
            abstand_macos_apply_status_item_appearance(
                status_item_ptr as Int,
                appearance.active_dot_visible,
            )
        };
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = status_item;
        let _ = appearance;
        return false;
    }
}

#[derive(Debug, Clone, Copy)]
pub struct TrayStatusItemAppearance {
    pub active_dot_visible: bool,
}

/// Returns the address of a borrowed native object for immediate FFI use without changing ownership.
#[cfg(target_os = "macos")]
fn borrowed_native_object_ptr<T>(object: &T) -> *mut c_void {
    return std::ptr::from_ref(object).cast_mut().cast();
}
