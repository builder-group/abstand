import XCTest

@testable import Mado

final class BrowserURLExtractorTests: XCTestCase {
    func testDocumentURLTakesPrecedenceWithoutReadingAddressBar() {
        let url = BrowserURLExtractor.resolveURL(documentURL: "https://example.com/articles") {
            XCTFail("A document URL should avoid address-bar queries")
            return ("https://example.org", true)
        }
        XCTAssertEqual(url, "https://example.com/articles")
    }

    func testFallbackRequiresKnownUnfocusedAddressBar() {
        for focused: Bool? in [true, nil] {
            XCTAssertNil(BrowserURLExtractor.resolveURL(documentURL: nil) {
                ("https://example.com", focused)
            })
        }
        XCTAssertNil(BrowserURLExtractor.resolveURL(documentURL: nil) { nil })
    }

    func testFallbackNormalizesURLsAndRejectsMissingOrSearchText() {
        let cases: [(String?, String?)] = [
            (" https://example.com/path?q=1 ", "https://example.com/path?q=1"),
            ("example.com/path", "https://example.com/path"),
            ("about:blank", "about:blank"),
            ("file:///tmp/page.html", "file:///tmp/page.html"),
            ("localhost", "http://localhost"),
            ("localhost:5173/path", "http://localhost:5173/path"),
            ("dev-box:8080", "http://dev-box:8080"),
            ("[::1]:3000", "http://[::1]:3000"),
            ("127.0.0.1:3000", "https://127.0.0.1:3000"),
            ("example.com:8443/path", "https://example.com:8443/path"),
            ("user:pass@example.com", "https://user:pass@example.com"),
            ("example", nil), ("localhost search", nil), ("localhost:", nil),
            ("dev-box:99999", nil), ("mailto:x", nil), ("[example", nil), ("[example]", nil),
            (nil, nil), ("", nil), ("   ", nil), ("search for example.com", nil),
        ]
        for (value, expected) in cases {
            XCTAssertEqual(
                BrowserURLExtractor.resolveURL(documentURL: nil) {
                    (value, false)
                }, expected)
        }
    }
}
