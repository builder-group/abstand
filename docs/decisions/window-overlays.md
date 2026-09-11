# Window overlays

App and website blocks follow their target windows. A blocked window stays covered when it loses focus, because macOS allows scrolling in background windows. An allowed window placed above it should cover both the target and its overlay.

## Native placement

The macOS bridge places each overlay at its target's window level immediately above it with `NSWindow.order(_:relativeTo:)`. The compositor handles partial occlusion.

Relative ordering is not a permanent attachment. App activation requests immediate reconciliation. One native timer also reconciles target geometry and stacking every 200 ms while attachments exist. It reads window metadata, not screenshots, and changes frames or order only when needed. A target absent from the on-screen window list hides its overlay. Detaching the final overlay stops the timer and removes the activation observer.

Website overlays use insets from the browser's content bounds. Target and content bounds must come from the same observation to avoid movement drift. The native tracker owns attached frames and levels. Rust does not reapply observed frames. When content bounds are unavailable, the overlay covers the window and offers the temporary escape control. Without a usable target window, foreground app blocks use a display-sized overlay. Background blocks require a window ID and bounds to avoid covering unrelated apps. Whole-device blocks use a screen-level overlay.

On macOS versions without Liquid Glass, an opaque system background keeps blocked content out of view.

## Observation and policy

Abstand enables `mado` reconciliation every two seconds to recover missed notifications and stale browser metadata. Browser content bounds, including sidebar changes, follow this schedule when no Accessibility notification arrives. The native 200 ms timer only follows outer geometry and stacking. Background content updates do not count as foreground activity.

The blocking consumer processes events in order. Clearing a session invalidates pending policy reads so they cannot restore cleared violations. Missing browser metadata does not clear a known website block, and a failed policy read preserves existing coverage. Policy enrichment reads cached icons instead of waiting for network requests. Starting or ending a session requests fresh monitor events, including unchanged observed background windows, so remaining sessions can keep blocking their targets.

## Platform limits

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
