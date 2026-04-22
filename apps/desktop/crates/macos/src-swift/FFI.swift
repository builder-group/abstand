import AppKit
import SwiftRs

@_cdecl("abstand_macos_apply_window_liquid_glass")
public func abstandMacosApplyWindowLiquidGlass(windowPtr: Int) -> Bool {
    return WindowLiquidGlass.apply(windowPtr: windowPtr)
}