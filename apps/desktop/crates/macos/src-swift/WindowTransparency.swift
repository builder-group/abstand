import AppKit
import WebKit

enum WindowTransparency {
    static func apply(windowPtr: Int) -> Bool {
        return FfiMainActorBridge.run {
            guard let window = WindowPointer.resolve(windowPtr) else {
                return false
            }

            apply(to: window)
            return true
        }
    }
}

@MainActor
extension WindowTransparency {
    static func apply(to window: NSWindow) {
        window.isOpaque = false
        window.backgroundColor = .clear
        window.invalidateShadow()

        window.contentView?.wantsLayer = true
        window.contentView?.layer?.backgroundColor = NSColor.clear.cgColor

        _ = applyWebviewTransparency(to: window)
    }

    /// Sets `drawsBackground = false` on all WKWebViews in the window hierarchy.
    /// Returns `true` if at least one WKWebView was found and patched.
    /// Uses a private KVC API and is a no-op on App Store builds.
    @discardableResult
    static func applyWebviewTransparency(to window: NSWindow) -> Bool {
        #if APP_STORE
            return false
        #else
            guard let contentView = window.contentView else { return false }
            return setDrawsBackground(false, in: contentView)
        #endif
    }

    @discardableResult
    private static func setDrawsBackground(_ draws: Bool, in view: NSView)
        -> Bool
    {
        var patched = false

        if view is WKWebView {
            view.setValue(draws, forKey: "drawsBackground")
            patched = true
        }

        for subview in view.subviews {
            if setDrawsBackground(draws, in: subview) {
                patched = true
            }
        }

        return patched
    }
}
