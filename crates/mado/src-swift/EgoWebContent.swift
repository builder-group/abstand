import ApplicationServices
import Foundation

enum EgoWebContent {
    static func extract(from window: AXUIElement) -> BrowserPage? {
        guard let bounds = getBounds(from: window),
            let x = bounds["x"], let y = bounds["y"],
            let width = bounds["width"], let height = bounds["height"],
            width > 0, height > 0
        else { return nil }

        var pid: pid_t = 0
        guard AXUIElementGetPid(window, &pid) == .success else { return nil }
        var hit: AXUIElement?
        // Note: Inactive Spaces can expose the same bounds and focus state as the visible page
        guard AXUIElementCopyElementAtPosition(
            AXUIElementCreateApplication(pid), Float(x + width / 2), Float(y + height / 2), &hit
        ) == .success, let hit,
            let document = findDocument(from: hit, in: window), let url = document.url
        else { return nil }

        return BrowserPage(
            url: url,
            contentBounds: BrowserContentBoundsExtractor.extract(from: document.element, in: window)
        )
    }

    static func findDocument(
        from hit: AXUIElement,
        in window: AXUIElement,
        readRole: (AXUIElement) -> String? = getRole,
        readParent: (AXUIElement) -> AXUIElement? = parent,
        readURL: (AXUIElement) -> URL? = getAXURL
    ) -> (element: AXUIElement, url: String?)? {
        var current: AXUIElement? = hit
        var document: AXUIElement?
        for _ in 0..<40 {
            guard let element = current else { return nil }
            if CFEqual(element, window) {
                return document.map { ($0, readURL($0)?.absoluteString) }
            }
            guard let role = readRole(element) else { return nil }
            // Note: Keep the outermost document so an iframe cannot supply the active-tab URL
            if BrowserWebContent.isWebContentRole(role) { document = element }
            current = readParent(element)
        }
        return nil
    }

    private static func parent(of element: AXUIElement) -> AXUIElement? {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, kAXParentAttribute as CFString, &value)
            == .success, let value, CFGetTypeID(value) == AXUIElementGetTypeID()
        else { return nil }
        return (value as! AXUIElement)
    }
}
