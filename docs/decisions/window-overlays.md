# Window Overlays

Date: 2026-09-11
Status: accepted

## Context

Abstand needs to block apps and websites while explaining the active Intention and letting users act on it. Immediately quitting an app interrupts the user's work. An overlay can present the block while leaving the app open.

Website blocking extends the existing app overlay approach to browser content. Blocked content can remain visible after its window loses focus, and macOS allows scrolling in background windows. Coverage must remain in place while allowing other windows to appear above the blocked window.

## Options Considered

### Immediate App Termination

Quit an app as soon as it is blocked. This interrupts the user's work and, for a browser, affects allowed tabs as well as blocked content. It also removes the place to explain the block and offer an intentional next action.

### Browser Extensions

Handle website blocking inside the browser. This gives access to tab and navigation events without relying on external window placement. It requires extension installation, browser-specific integration, and communication with Abstand's policy state. App blocking still needs a separate mechanism.

### Network Blocking

Use DNS or firewall rules to restrict network access. This requires a separate enforcement mechanism and does not provide the in-app explanation or cover content that is already loaded. DNS rules also operate on hostnames, not individual website paths.

### Window Overlays

Reuse the app blocking UI for windows and browser content. This keeps Intention controls in one place and leaves the blocked app open. It depends on Accessibility metadata and native window ordering, with reconciliation needed to keep coverage aligned.

## Decision

Use overlays for app and website blocking. Place them directly above their target windows at the same window level, with reconciliation while attachments exist. Keep placement in the macOS bridge and blocking policy in Rust.

## Why This Is The Current Call

Overlays preserve the user's app state and provide a consistent place to explain a block and show Intention controls. Reusing the app overlay approach avoids a separate browser extension or network enforcement system.

That reuse reduces integration work, but window tracking and placement still add complexity. Relative placement lets macOS handle partial visibility while other windows cover the target. Foreground-only coverage would leave background content exposed, and floating overlays could obscure unrelated windows.

The tradeoff is reliance on Accessibility metadata, ongoing reconciliation, and brief placement delays during native transitions. Live validation must establish whether that behavior is reliable enough. Revisit browser or network integration if these limits prevent acceptable blocking behavior.

## Platform Limits

Accessibility and browser content bounds are best-effort data. The monitor discovers windows through focus. Windows never observed while focused are outside its background tracking. Reconciliation can recover missed notifications but cannot make placement atomic during window-server animations. Mission Control previews, Stage Manager, full-screen transitions, and third-party window managers need live regression testing. Overlays are not an OS security boundary.

Browser-owned window groups can constrain relative ordering. For example, Safari's revealed full-screen toolbar can overlap a foreign overlay.

## Validation

Use an isolated app identifier and disposable casual Intentions. Check:

- Blocked page in foreground, then partly behind an allowed window
- Scrolling over the exposed blocked area without focusing it
- Same-title URL changes, allowed navigation, and browser sidebar changes
- Several simultaneous blocked windows across apps and browsers
- Move, resize, minimize, background restore, close, and app termination
- Start and stop an Intention while its target is behind another app
- Mixed-scale displays, Spaces, full screen, and Stage Manager
- No attached overlays after stopping the last block, including after a delayed hide

Test the browser extraction families separately: Chromium, Safari, and Gecko. Measure CPU and wakeups both with and without attached overlays. Passing unit tests does not establish native stacking behavior or battery impact.

## References

- [Apple: relative window ordering](<https://developer.apple.com/documentation/appkit/nswindow/order(_:relativeto:)>)
- [Apple: joining other applications and full-screen spaces](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/canjoinallapplications)
