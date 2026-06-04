use swift_rs::{swift, Bool, Double, Int, SRString};

swift!(pub fn abstand_macos_apply_window_liquid_glass(window_ptr: Int) -> Bool);
swift!(pub fn abstand_macos_get_system_font_size() -> Double);
swift!(pub fn abstand_macos_get_small_system_font_size() -> Double);
swift!(pub fn abstand_macos_is_app_running(
    bundle_identifier: &SRString,
    excluded_pid: i32
) -> Bool);
