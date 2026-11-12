import XCTest

@testable import Mado

final class SupportedBrowsersTests: XCTestCase {
    func testMapsSupportedBrowsersToTheirKind() {
        XCTAssertEqual(
            SupportedBrowsers.kind(for: "org.chromium.Chromium"),
            .chromium
        )
        XCTAssertEqual(
            SupportedBrowsers.kind(for: "com.vivaldi.Vivaldi"),
            .vivaldi
        )
        XCTAssertEqual(
            SupportedBrowsers.kind(for: "net.imput.helium"),
            .chromium
        )
        XCTAssertEqual(
            SupportedBrowsers.kind(for: "company.thebrowser.dia"),
            .chromium
        )
        XCTAssertEqual(
            SupportedBrowsers.kind(for: "at.studio.AsideBrowser"),
            .chromium
        )
        XCTAssertEqual(
            SupportedBrowsers.kind(for: "com.apple.Safari"),
            .safari
        )
        XCTAssertEqual(
            SupportedBrowsers.kind(for: "org.mozilla.firefox"),
            .gecko
        )
        XCTAssertEqual(
            SupportedBrowsers.kind(for: "app.zen-browser.zen"),
            .gecko
        )
    }

    func testRequiresManualAccessibilityOnlyForDia() {
        XCTAssertTrue(SupportedBrowsers.requiresManualAccessibility("company.thebrowser.Dia"))
        XCTAssertFalse(SupportedBrowsers.requiresManualAccessibility("com.google.Chrome"))
        XCTAssertFalse(SupportedBrowsers.requiresManualAccessibility("company.thebrowser.Browser"))
    }

    func testRejectsUnknownBundleIdentifier() {
        XCTAssertNil(SupportedBrowsers.kind(for: "com.example.browser"))
    }

    func testMatchesBundleIdentifierCaseInsensitively() {
        XCTAssertEqual(
            SupportedBrowsers.kind(for: "COM.APPLE.SAFARI"),
            .safari
        )
    }
}
