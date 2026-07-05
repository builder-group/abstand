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

@_cdecl("abstand_macos_apply_window_normal_level")
public func abstandMacosApplyWindowNormalLevel(
    windowPtr: Int,
    orderFront: Bool
) -> Bool {
    return WindowLevel.applyWindowNormalLevel(
        windowPtr: windowPtr,
        orderFront: orderFront
    )
}

@_cdecl("abstand_macos_apply_window_floating_level")
public func abstandMacosApplyWindowFloatingLevel(
    windowPtr: Int,
    orderFront: Bool
) -> Bool {
    return WindowLevel.applyWindowFloatingLevel(
        windowPtr: windowPtr,
        orderFront: orderFront
    )
}

@_cdecl("abstand_macos_apply_window_screen_saver_level")
public func abstandMacosApplyWindowScreenSaverLevel(
    windowPtr: Int,
    orderFront: Bool
) -> Bool {
    return WindowLevel.applyWindowScreenSaverLevel(
        windowPtr: windowPtr,
        orderFront: orderFront
    )
}

@_cdecl("abstand_macos_apply_window_normal_overlay_behavior")
public func abstandMacosApplyWindowNormalOverlayBehavior(
    windowPtr: Int,
    orderFront: Bool
) -> Bool {
    return WindowOverlay.applyWindowNormalOverlayBehavior(
        windowPtr: windowPtr,
        orderFront: orderFront
    )
}

@_cdecl("abstand_macos_apply_window_floating_overlay_behavior")
public func abstandMacosApplyWindowFloatingOverlayBehavior(
    windowPtr: Int,
    orderFront: Bool
) -> Bool {
    return WindowOverlay.applyWindowFloatingOverlayBehavior(
        windowPtr: windowPtr,
        orderFront: orderFront
    )
}

@_cdecl("abstand_macos_apply_window_screen_overlay_behavior")
public func abstandMacosApplyWindowScreenOverlayBehavior(windowPtr: Int) -> Bool
{
    return WindowOverlay.applyWindowScreenOverlayBehavior(windowPtr: windowPtr)
}

@_cdecl("abstand_macos_activate_app_by_pid")
public func abstandMacosActivateAppByPid(pid: Int32) -> Bool {
    return FfiMainActorBridge.run {
        let app = NSRunningApplication(processIdentifier: pid_t(pid))
        return app?.activate(options: [
            .activateAllWindows, .activateIgnoringOtherApps,
        ]) ?? false
    }
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

@_cdecl("abstand_macos_apply_status_item_appearance")
public func abstandMacosApplyStatusItemAppearance(
    statusItemPtr: Int,
    activeDotVisible: Bool
) -> Bool {
    return TrayStatusItemAppearance.apply(
        statusItemPtr: statusItemPtr,
        activeDotVisible: activeDotVisible
    )
}
