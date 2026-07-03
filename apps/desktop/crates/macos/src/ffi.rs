use swift_rs::{swift, Bool, Double, Int, SRString};

swift!(pub fn abstand_macos_apply_window_liquid_glass(window_ptr: Int) -> Bool);
swift!(pub fn abstand_macos_apply_window_transparency(window_ptr: Int) -> Bool);
swift!(pub fn abstand_macos_apply_window_normal_overlay_behavior(
    window_ptr: Int,
    order_front: Bool
) -> Bool);
swift!(pub fn abstand_macos_apply_window_screen_overlay_behavior(
    window_ptr: Int
) -> Bool);
swift!(pub fn abstand_macos_activate_app_by_pid(pid: i32) -> Bool);
swift!(pub fn abstand_macos_get_system_font_size() -> Double);
swift!(pub fn abstand_macos_get_small_system_font_size() -> Double);
swift!(pub fn abstand_macos_is_app_running(
    bundle_identifier: &SRString,
    excluded_pid: i32
) -> Bool);
swift!(pub fn abstand_macos_request_app_quit(
    bundle_identifier: &SRString
) -> i32);
swift!(pub fn abstand_macos_apply_status_item_appearance(
    status_item_ptr: Int,
    active_dot_visible: Bool
) -> Bool);
