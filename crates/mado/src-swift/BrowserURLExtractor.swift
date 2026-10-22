import ApplicationServices
import Foundation

enum BrowserURLExtractor {
    static func extract(
        documentURL: String?,
        from windowElement: AXUIElement
    ) -> String? {
        return resolveURL(documentURL: documentURL) {
            guard let addressBar = findAddressBar(in: windowElement) else { return nil }
            var focused: CFTypeRef?
            AXUIElementCopyAttributeValue(addressBar, kAXFocusedAttribute as CFString, &focused)
            return (getValue(from: addressBar), focused as? Bool)
        }
    }

    static func resolveURL(
        documentURL: String?,
        addressBar: () -> (value: String?, isFocused: Bool?)?
    ) -> String? {
        // Note: The address bar can contain an uncommitted edit while the current page remains visible
        if let documentURL { return documentURL }
        // Note: An unreadable focus state cannot establish that the address is not being edited
        guard let address = addressBar(), address.isFocused == false else { return nil }
        return normalizeURL(address.value)
    }

    static func findAddressBar(in element: AXUIElement) -> AXUIElement? {
        // Note: The search root can be browser UI rendered as a web area
        var queue = getTraversalChildren(from: element).map { (element: $0, depth: 1) }
        var index = 0
        var emptyAddressBar: AXUIElement?

        while index < queue.count {
            let current = queue[index]
            index += 1

            guard current.depth <= maxBrowserURLSearchDepth else {
                continue
            }

            let role = getRole(from: current.element)
            if BrowserWebContent.isWebContentRole(role) {
                continue
            }

            if isAddressBar(current.element, role: role),
                let value = getValue(from: current.element)
            {
                if normalizeURL(value) != nil { return current.element }
                // Note: Keep searching past empty fields because Opera can nest the URL field inside one
                emptyAddressBar = current.element
            }

            for child in getTraversalChildren(from: current.element) {
                queue.append((element: child, depth: current.depth + 1))
            }
        }

        return emptyAddressBar
    }

    private static func normalizeURL(_ value: String?) -> String? {
        guard let value = value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmed.isEmpty || trimmed.count < 3 {
            return nil
        }

        for prefix in acceptedBrowserURLPrefixes {
            if trimmed.hasPrefix(prefix) {
                return trimmed
            }
        }

        if trimmed.contains(" ") {
            return nil
        }

        // Note: Browsers can hide the scheme, and dot-free local hosts would otherwise read as search text
        if isLocalAddress(trimmed) {
            return "http://\(trimmed)"
        }

        if trimmed.contains(".") {
            return "https://\(trimmed)"
        }

        return nil
    }

    /// Matches `localhost`, bracketed IPv6, and dot-free `host:port` authorities.
    private static func isLocalAddress(_ value: String) -> Bool {
        let authority = value.prefix { !["/", "?", "#"].contains($0) }

        if authority.hasPrefix("[") {
            guard let end = authority.firstIndex(of: "]") else { return false }
            let host = authority[authority.index(after: authority.startIndex)..<end]
            let rest = authority[authority.index(after: end)...]
            guard !host.isEmpty, host.allSatisfy({ $0.isHexDigit || $0 == ":" || $0 == "." })
            else { return false }
            return rest.isEmpty || (rest.first == ":" && isPort(rest.dropFirst()))
        }

        guard !authority.contains(".") else { return false }
        guard let colon = authority.lastIndex(of: ":") else { return authority == "localhost" }
        return colon != authority.startIndex && isPort(authority[authority.index(after: colon)...])
    }

    private static func isPort(_ value: Substring) -> Bool {
        guard !value.isEmpty, value.count <= 5, value.allSatisfy({ $0.isASCII && $0.isNumber }),
            let port = Int(value)
        else { return false }
        return (1...65535).contains(port)
    }

    private static func isAddressBar(_ element: AXUIElement, role: String?) -> Bool {
        guard role == "AXTextField" || role == "AXComboBox" else { return false }

        var identifier: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXIdentifierAttribute as CFString, &identifier)
        if let identifier = getDOMIdentifier(from: element) ?? (identifier as? String),
            ["urlbar-input", "urlbar", "omnibox", "urlFieldInput", "WEB_BROWSER_ADDRESS_AND_SEARCH_FIELD"].contains(
                identifier)
        {
            return true
        }

        let description = (getDescription(from: element) ?? "").lowercased()
        let placeholder = (getPlaceholderValue(from: element) ?? "")
            .lowercased()

        let descriptionLooksLikeURLBar =
            description.contains("address")
            || description.contains("url")
        let placeholderLooksLikeURLBar =
            placeholder.contains("address")
            || placeholder.contains("url")

        return descriptionLooksLikeURLBar
            || placeholderLooksLikeURLBar
    }

    private static let maxBrowserURLSearchDepth = 30
    private static let acceptedBrowserURLPrefixes = [
        "http://", "https://", "file://", "about:", "chrome://", "edge://",
        "brave://", "arc://", "opera://",
    ]
}
