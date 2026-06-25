import AppKit
import ObjectiveC

enum TrayStatusItemAppearance {
    static func apply(statusItemPtr: Int, activeDotVisible: Bool) -> Bool {
        return FfiMainActorBridge.run {
            guard let pointer = UnsafeRawPointer(bitPattern: statusItemPtr)
            else {
                return false
            }

            let statusItem =
                Unmanaged<NSStatusItem>
                .fromOpaque(pointer)
                .takeUnretainedValue()

            return apply(to: statusItem, activeDotVisible: activeDotVisible)
        }
    }
}

@MainActor
extension TrayStatusItemAppearance {
    private static func apply(
        to statusItem: NSStatusItem,
        activeDotVisible: Bool
    ) -> Bool {
        guard let button = statusItem.button else {
            return false
        }

        return applyActiveDot(activeDotVisible, to: button)
    }

    private static func applyActiveDot(
        _ isVisible: Bool,
        to button: NSStatusBarButton
    ) -> Bool {
        if isVisible {
            return addActiveDot(to: button)
        }

        removeActiveDot(from: button)
        return true
    }

    private static func addActiveDot(to button: NSStatusBarButton) -> Bool {
        button.wantsLayer = true

        guard let buttonLayer = button.layer else {
            return false
        }

        let layer = activeDotLayer(for: button) ?? CALayer()

        layer.name = activeDotLayerName
        layer.backgroundColor = NSColor.systemGreen.cgColor
        layer.cornerRadius = activeDotSize / 2
        layer.frame = CGRect(
            x: button.bounds.maxX - activeDotSize - activeDotInset,
            y: activeDotInset,
            width: activeDotSize,
            height: activeDotSize
        )
        layer.zPosition = 1_000

        if layer.superlayer == nil {
            buttonLayer.addSublayer(layer)
        }
        setActiveDotLayer(layer, for: button)

        return true
    }

    private static func removeActiveDot(from button: NSStatusBarButton) {
        activeDotLayer(for: button)?.removeFromSuperlayer()
        setActiveDotLayer(nil, for: button)
    }

    private static func activeDotLayer(for button: NSStatusBarButton)
        -> CALayer?
    {
        return objc_getAssociatedObject(button, &activeDotLayerAssociationKey)
            as? CALayer
    }

    private static func setActiveDotLayer(
        _ layer: CALayer?,
        for button: NSStatusBarButton
    ) {
        objc_setAssociatedObject(
            button,
            &activeDotLayerAssociationKey,
            layer,
            .OBJC_ASSOCIATION_RETAIN_NONATOMIC
        )
    }

    private static let activeDotLayerName = "AbstandActiveDot"
    private static let activeDotSize: CGFloat = 5
    private static let activeDotInset: CGFloat = 3
    private static var activeDotLayerAssociationKey: UInt8 = 0
}
