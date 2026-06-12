import AppKit

enum WindowOverlay {
    static func applyWindowScreenOverlayBehavior(windowPtr: Int) -> Bool {
        return WindowPointer.withWindow(windowPtr) { window in
            applyWindowScreenOverlayBehavior(to: window)
        }
    }
}

@MainActor
extension WindowOverlay {
    static func applyWindowScreenOverlayBehavior(to window: NSWindow) {
        window.level = .screenSaver
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
