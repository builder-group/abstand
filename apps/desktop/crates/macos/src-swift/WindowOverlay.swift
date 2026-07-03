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
            applyWindowFloatingOverlayBehavior(to: window, orderFront: orderFront)
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
        window.level = .normal
        applyCommonOverlayBehavior(to: window)

        if orderFront {
            window.orderFrontRegardless()
        }
    }

    static func applyWindowFloatingOverlayBehavior(
        to window: NSWindow,
        orderFront: Bool
    ) {
        window.level = .floating
        applyCommonOverlayBehavior(to: window)

        if orderFront {
            window.orderFrontRegardless()
        }
    }

    static func applyWindowScreenOverlayBehavior(to window: NSWindow) {
        window.level = .screenSaver
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
