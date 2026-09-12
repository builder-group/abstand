import AppKit

/// Keeps an overlay adjacent to a foreign window without covering windows above that target.
@MainActor
final class OverlayAttachment {
    private static var attachments: [Int: OverlayAttachment] = [:]
    private static var timer: Timer?
    private static var activationObserver: NSObjectProtocol?

    private weak var window: NSWindow?
    private let processId: Int32
    private let targetId: UInt32
    private let inset: NSEdgeInsets

    private init(window: NSWindow, targetId: UInt32, processId: Int32, inset: NSEdgeInsets) {
        self.window = window
        self.targetId = targetId
        self.processId = processId
        self.inset = inset
    }

    static func attach(
        _ window: NSWindow, to targetId: UInt32, processId: Int32, inset: NSEdgeInsets
    ) {
        attachments[window.windowNumber] = OverlayAttachment(
            window: window, targetId: targetId, processId: processId, inset: inset
        )
        refresh()
        if timer == nil {
            activationObserver = NSWorkspace.shared.notificationCenter.addObserver(
                forName: NSWorkspace.didActivateApplicationNotification, object: nil, queue: .main
            ) { _ in
                _ = FfiMainActorBridge.run {
                    refresh()
                    return true
                }
            }
            let timer = Timer(timeInterval: 0.2, repeats: true) { _ in
                _ = FfiMainActorBridge.run {
                    refresh()
                    return true
                }
            }
            timer.tolerance = 0.05
            RunLoop.main.add(timer, forMode: .common)
            self.timer = timer
        }
    }

    static func detach(_ window: NSWindow) {
        attachments.removeValue(forKey: window.windowNumber)
        stopTimerIfUnused()
    }

    private static func refresh() {
        guard let windows = windowList() else { return }
        for (id, attachment) in attachments {
            guard let window = attachment.window else {
                attachments.removeValue(forKey: id)
                continue
            }
            var targetIndex: Int?
            for (index, candidate) in windows.enumerated() {
                if windowId(candidate) == attachment.targetId,
                    (candidate[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value
                        == attachment.processId
                {
                    targetIndex = index
                    break
                }
            }
            guard let index = targetIndex,
                let targetFrame = frame(of: windows[index])
            else {
                window.orderOut(nil)
                continue
            }
            let targetLevel = (windows[index][kCGWindowLayer as String] as? NSNumber)?.intValue ?? 0
            if window.level.rawValue != targetLevel {
                window.level = NSWindow.Level(rawValue: targetLevel)
            }
            let targetFrameInset = CGRect(
                x: targetFrame.minX + attachment.inset.left,
                y: targetFrame.minY + attachment.inset.bottom,
                width: max(1, targetFrame.width - attachment.inset.left - attachment.inset.right),
                height: max(1, targetFrame.height - attachment.inset.top - attachment.inset.bottom)
            )
            if window.frame != targetFrameInset {
                window.setFrame(targetFrameInset, display: true)
            }
            // Note: Raising the target can move it above the overlay, so restore their relative order when needed
            if !window.isVisible || index == 0 || windowId(windows[index - 1]) != UInt32(id) {
                window.order(.above, relativeTo: Int(attachment.targetId))
            }
        }
        stopTimerIfUnused()
    }

    private static func stopTimerIfUnused() {
        guard attachments.isEmpty else { return }
        timer?.invalidate()
        timer = nil
        if let activationObserver {
            NSWorkspace.shared.notificationCenter.removeObserver(activationObserver)
        }
        activationObserver = nil
    }

    private static func windowList() -> [[String: Any]]? {
        return CGWindowListCopyWindowInfo(
            [.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID
        ) as? [[String: Any]]
    }

    private static func windowId(_ window: [String: Any]) -> UInt32? {
        return (window[kCGWindowNumber as String] as? NSNumber)?.uint32Value
    }

    private static func frame(of window: [String: Any]) -> CGRect? {
        guard let bounds = window[kCGWindowBounds as String] as? [String: Any],
            let frame = CGRect(dictionaryRepresentation: bounds as CFDictionary),
            let screen = NSScreen.screens.first
        else { return nil }
        return CGRect(
            x: frame.minX, y: screen.frame.maxY - frame.maxY,
            width: frame.width, height: frame.height)
    }
}
