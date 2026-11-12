enum SupportedBrowsers {
    private static let kindsByBundleId: [String: BrowserKind] = [
        // Chromium family
        "com.google.chrome": .chromium,
        "com.google.chrome.beta": .chromium,
        "com.google.chrome.dev": .chromium,
        "com.google.chrome.canary": .chromium,
        "org.chromium.chromium": .chromium,
        "com.brave.browser": .chromium,
        "com.brave.browser.beta": .chromium,
        "com.brave.browser.nightly": .chromium,
        "com.microsoft.edgemac": .chromium,
        "com.microsoft.edgemac.beta": .chromium,
        "com.microsoft.edgemac.dev": .chromium,
        "com.microsoft.edgemac.canary": .chromium,
        "com.operasoftware.opera": .chromium,
        "com.operasoftware.operanext": .chromium,
        "com.operasoftware.operadeveloper": .chromium,
        "com.operasoftware.operagx": .chromium,
        "company.thebrowser.browser": .chromium,
        "company.thebrowser.dia": .chromium,
        "com.citrolabs.ego.lite": .ego,
        "net.imput.helium": .chromium,
        "at.studio.asidebrowser": .chromium,
        "com.vivaldi.vivaldi": .vivaldi,

        // Safari
        "com.apple.safari": .safari,
        "com.apple.safaritechnologypreview": .safari,

        // Gecko family
        "org.mozilla.firefox": .gecko,
        "org.mozilla.firefoxdeveloperedition": .gecko,
        "org.mozilla.nightly": .gecko,
        "app.zen-browser.zen": .gecko,
    ]

    // Note: These browsers expose only their browser chrome until a client sets AXManualAccessibility
    private static let manualAccessibilityBundleIds: Set<String> = [
        "company.thebrowser.dia"
    ]

    /// Returns the browser kind for an explicitly supported browser.
    static func kind(for bundleId: String) -> BrowserKind? {
        return kindsByBundleId[bundleId.lowercased()]
    }

    /// Returns whether the browser hides its web content until AXManualAccessibility is set.
    static func requiresManualAccessibility(_ bundleId: String) -> Bool {
        return manualAccessibilityBundleIds.contains(bundleId.lowercased())
    }
}

// Note: Browsers share family handling unless their Accessibility structure requires a distinct path
enum BrowserKind: Equatable {
    case chromium
    case ego
    case gecko
    case safari
    case vivaldi
}
