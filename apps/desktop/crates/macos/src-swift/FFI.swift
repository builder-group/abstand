import AppKit
import SwiftRs

@_cdecl("abstand_macos_apply_window_liquid_glass")
public func abstandMacosApplyWindowLiquidGlass(windowPtr: Int) -> Bool {
    return WindowLiquidGlass.apply(windowPtr: windowPtr)
}

@_cdecl("abstand_macos_greet")
public func abstandMacosGreet(name: SRString) -> SRString? {
    return SRString("Hello, \(name.toString())! You've been greeted from Swift!")
}
