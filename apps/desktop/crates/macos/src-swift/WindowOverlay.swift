import AppKit

enum WindowOverlay {
    static func applyWindowNormalOverlayBehavior(
        windowPtr: Int,
        orderFront: Bool
    ) -> Bool {
        return WindowPointer.withWindow(windowPtr) { window in
            applyWindowNormalOverlayBehavior(to: window, orderFront: orderFront)
        }
    }

    static func applyWindowFloatingOverlayBehavior(
        windowPtr: Int,
        orderFront: Bool
    ) -> Bool {
        return WindowPointer.withWindow(windowPtr) { window in
            applyWindowFloatingOverlayBehavior(
                to: window,
                orderFront: orderFront
            )
        }
    }

    static func applyWindowScreenOverlayBehavior(windowPtr: Int) -> Bool {
        return WindowPointer.withWindow(windowPtr) { window in
            applyWindowScreenOverlayBehavior(to: window)
        }
    }
}

@MainActor
extension WindowOverlay {
    static func applyWindowNormalOverlayBehavior(
        to window: NSWindow,
        orderFront: Bool
    ) {
        WindowLevel.applyWindowNormalLevel(to: window, orderFront: orderFront)
        applyCommonOverlayBehavior(to: window)
    }

    static func applyWindowFloatingOverlayBehavior(
        to window: NSWindow,
        orderFront: Bool
    ) {
        WindowLevel.applyWindowFloatingLevel(to: window, orderFront: orderFront)
        applyCommonOverlayBehavior(to: window)
    }

    static func applyWindowScreenOverlayBehavior(to window: NSWindow) {
        WindowLevel.applyWindowScreenSaverLevel(to: window)
        applyCommonOverlayBehavior(to: window)
    }

    private static func applyCommonOverlayBehavior(to window: NSWindow) {
        window.hidesOnDeactivate = false
        window.isMovable = false
        window.isMovableByWindowBackground = false
        window.animationBehavior = .none
        window.collectionBehavior = [
            .canJoinAllSpaces,
            .fullScreenAuxiliary,
            .stationary,
            .ignoresCycle,
        ]
    }
}
