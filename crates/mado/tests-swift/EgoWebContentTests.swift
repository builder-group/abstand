import ApplicationServices
import XCTest

@testable import Mado

final class EgoWebContentTests: XCTestCase {
    func testSelectsTheOuterDocumentOfTheHitInsteadOfAnIframe() throws {
        let window = AXUIElementCreateApplication(1)
        let page = AXUIElementCreateApplication(2)
        let iframe = AXUIElementCreateApplication(3)
        let hit = AXUIElementCreateApplication(4)
        let document = try XCTUnwrap(EgoWebContent.findDocument(
            from: hit, in: window,
            readRole: { CFEqual($0, page) || CFEqual($0, iframe) ? "AXWebArea" : "AXGroup" },
            readParent: {
                if CFEqual($0, hit) { return iframe }
                if CFEqual($0, iframe) { return page }
                if CFEqual($0, page) { return window }
                return nil
            },
            readURL: {
                XCTAssertTrue(CFEqual($0, page))
                return URL(string: "https://visible.example/")
            }
        ))
        XCTAssertTrue(CFEqual(document.element, page))
        XCTAssertEqual(document.url, "https://visible.example/")
    }

    func testDoesNotSubstituteAnIframeURLWhenThePageURLIsUnavailable() throws {
        let window = AXUIElementCreateApplication(1)
        let page = AXUIElementCreateApplication(2)
        let iframe = AXUIElementCreateApplication(3)
        let document = try XCTUnwrap(EgoWebContent.findDocument(
            from: iframe, in: window,
            readRole: { _ in "AXWebArea" },
            readParent: { CFEqual($0, iframe) ? page : window },
            readURL: { CFEqual($0, iframe) ? URL(string: "https://iframe.example/") : nil }
        ))
        XCTAssertTrue(CFEqual(document.element, page))
        XCTAssertNil(document.url)
    }

    func testRejectsAnUnreadableAncestorInsteadOfUsingTheIframeURL() {
        let window = AXUIElementCreateApplication(1)
        let page = AXUIElementCreateApplication(2)
        let iframe = AXUIElementCreateApplication(3)
        XCTAssertNil(EgoWebContent.findDocument(
            from: iframe, in: window,
            readRole: { CFEqual($0, iframe) ? "AXWebArea" : nil },
            readParent: { CFEqual($0, iframe) ? page : window },
            readURL: { _ in
                XCTFail("An unreadable ancestor cannot establish the outermost document")
                return nil
            }
        ))
    }

    func testRejectsBrowserControlsAndDocumentsOutsideTheRequestedWindow() {
        let window = AXUIElementCreateApplication(1)
        let hit = AXUIElementCreateApplication(2)
        XCTAssertNil(EgoWebContent.findDocument(
            from: hit, in: window,
            readRole: { _ in "AXToolbar" },
            readParent: { _ in window },
            readURL: { _ in
                XCTFail("Browser controls are not documents")
                return nil
            }
        ))
        for parent in [nil, hit] as [AXUIElement?] {
            XCTAssertNil(EgoWebContent.findDocument(
                from: hit, in: window,
                readRole: { _ in "AXWebArea" },
                readParent: { _ in parent },
                readURL: { _ in
                    XCTFail("Unanchored documents must not supply a URL")
                    return nil
                }
            ))
        }
    }
}
