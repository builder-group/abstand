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

@_cdecl("abstand_macos_apply_window_screen_overlay_behavior")
public func abstandMacosApplyWindowScreenOverlayBehavior(windowPtr: Int) -> Bool {
    return WindowOverlay.applyWindowScreenOverlayBehavior(windowPtr: windowPtr)
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

@_cdecl("abstand_macos_request_app_quit")
public func abstandMacosRequestAppQuit(
    bundleIdentifier: SRString
) -> Int32 {
    let bundleIdentifier = bundleIdentifier.toString()
    let runningApps =
        NSRunningApplication
        .runningApplications(withBundleIdentifier: bundleIdentifier)
        .filter { app in !app.isTerminated }

    if runningApps.isEmpty {
        return 0
    }

    var requestedQuitCount: Int32 = 0
    for app in runningApps {
        if app.terminate() {
            requestedQuitCount += 1
        }
    }

    if requestedQuitCount == 0 {
        return -1
    }

    return requestedQuitCount
}
