import AppKit

enum WindowLiquidGlass {
    static func apply(windowPtr: Int) -> Bool {
        return FfiMainActorBridge.run {
            guard let window = WindowPointer.resolve(windowPtr) else {
                return false
            }

            return apply(to: window)
        }
    }
}

@MainActor
extension WindowLiquidGlass {
    /// Applies Liquid Glass and requests hosted WKWebView transparency.
    /// Returns `false` when Liquid Glass is unavailable.
    @discardableResult
    static func apply(to window: NSWindow) -> Bool {
        guard #available(macOS 26.0, *) else {
            return false
        }

        guard applyGlassEffect(to: window) else { return false }
        _ = WindowTransparency.applyWebviewTransparency(to: window)
        return true
    }

    @available(macOS 26.0, *)
    private static func applyGlassEffect(to window: NSWindow) -> Bool {
        if let glassView = window.contentView as? NSGlassEffectView {
            style(glassView: glassView, in: window)
            return true
        }

        guard let contentView = window.contentView else {
            return false
        }

        let glassView = NSGlassEffectView(frame: contentView.bounds)
        glassView.autoresizingMask = [.width, .height]
        glassView.contentView = contentView
        glassView.style = .regular

        style(glassView: glassView, in: window)

        window.isOpaque = false
        window.backgroundColor = .clear
        window.contentView = glassView
        window.invalidateShadow()

        return true
    }

    @available(macOS 26.0, *)
    private static func style(glassView: NSGlassEffectView, in window: NSWindow)
    {
        let metrics = metrics(for: window)

        glassView.cornerRadius = metrics.cornerRadius
        glassView.wantsLayer = true
        glassView.layer?.cornerRadius = metrics.cornerRadius
        glassView.layer?.cornerCurve = .continuous
        glassView.layer?.masksToBounds = metrics.cornerRadius > 0
        glassView.layer?.borderWidth = metrics.borderWidth
        glassView.layer?.borderColor = metrics.borderColor.cgColor

        if let hostedContentView = glassView.contentView {
            hostedContentView.wantsLayer = true
            hostedContentView.layer?.cornerRadius = metrics.cornerRadius
            hostedContentView.layer?.cornerCurve = .continuous
            hostedContentView.layer?.masksToBounds = metrics.cornerRadius > 0
        }
    }

    private static func metrics(for window: NSWindow)
        -> WindowLiquidGlassMetrics
    {
        let isBorderless = window.styleMask.contains(.borderless)
        let screenFrame = window.screen?.frame ?? .zero
        let isScreenSized =
            screenFrame != .zero
            && abs(window.frame.width - screenFrame.width) < 2
            && abs(window.frame.height - screenFrame.height) < 2

        if isBorderless && !isScreenSized {
            return WindowLiquidGlassMetrics(
                cornerRadius: 26,
                borderWidth: 1,
                borderColor: NSColor.white.withAlphaComponent(0.28)
            )
        }

        return WindowLiquidGlassMetrics(
            cornerRadius: 0,
            borderWidth: 0,
            borderColor: .clear
        )
    }
}

private struct WindowLiquidGlassMetrics {
    let cornerRadius: CGFloat
    let borderWidth: CGFloat
    let borderColor: NSColor
}
