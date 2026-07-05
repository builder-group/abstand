import AppKit

enum WindowLevel {
    static func applyWindowNormalLevel(
        windowPtr: Int,
        orderFront: Bool
    ) -> Bool {
        return WindowPointer.withWindow(windowPtr) { window in
            applyWindowNormalLevel(to: window, orderFront: orderFront)
        }
    }

    static func applyWindowFloatingLevel(
        windowPtr: Int,
        orderFront: Bool
    ) -> Bool {
        return WindowPointer.withWindow(windowPtr) { window in
            applyWindowFloatingLevel(to: window, orderFront: orderFront)
        }
    }
}

@MainActor
extension WindowLevel {
    static func applyWindowNormalLevel(to window: NSWindow, orderFront: Bool) {
        window.level = .normal

        if orderFront {
            window.orderFrontRegardless()
        }
    }

    static func applyWindowFloatingLevel(to window: NSWindow, orderFront: Bool)
    {
        window.level = .floating

        if orderFront {
            window.orderFrontRegardless()
        }
    }

    static func applyWindowScreenSaverLevel(to window: NSWindow) {
        window.level = .screenSaver
    }
}
