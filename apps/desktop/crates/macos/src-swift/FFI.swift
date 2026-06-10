import AppKit
import SwiftRs

@_cdecl("abstand_macos_apply_window_liquid_glass")
public func abstandMacosApplyWindowLiquidGlass(windowPtr: Int) -> Bool {
    return WindowLiquidGlass.apply(windowPtr: windowPtr)
}

@_cdecl("abstand_macos_apply_window_transparency")
public func abstandMacosApplyWindowTransparency(windowPtr: Int) -> Bool {
    return WindowTransparency.apply(windowPtr: windowPtr)
}

@_cdecl("abstand_macos_get_system_font_size")
public func abstandMacosGetSystemFontSize() -> Double {
    return Double(NSFont.systemFontSize)
}

@_cdecl("abstand_macos_get_small_system_font_size")
public func abstandMacosGetSmallSystemFontSize() -> Double {
    return Double(NSFont.smallSystemFontSize)
}

@_cdecl("abstand_macos_is_app_running")
public func abstandMacosIsAppRunning(
    bundleIdentifier: SRString,
    excludedPid: Int32
) -> Bool {
    let bundleIdentifier = bundleIdentifier.toString()
    return
        NSRunningApplication
        .runningApplications(withBundleIdentifier: bundleIdentifier)
        .contains { app in
            app.processIdentifier != pid_t(excludedPid) && !app.isTerminated
        }
}
