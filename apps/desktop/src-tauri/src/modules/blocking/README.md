# Blocking

Blocking consumes mado events independently of activity recording. Its queue preserves event order while policy and catalog reads run asynchronously.

App and window observations are evaluated against active Intentions. Policy evaluation produces violations without changing windows. The runtime manages active violations and temporary pauses, then updates overlay presentation with display names and cached assets.

The shared overlay window pool owns reusable native windows. The macOS bridge owns attachment, geometry, and stacking. See [window overlays](../../../../../../docs/decisions/window-overlays.md) for the architectural decision, platform limits, and live validation.

## Overlay Integration

### Native Placement

The macOS bridge uses `NSWindow.order(_:relativeTo:)` for relative placement.

Relative ordering is not a permanent attachment. App activation requests immediate reconciliation. One native timer also reconciles target geometry and stacking every 200 ms while attachments exist. It reads window metadata, not screenshots, and changes frames or order only when needed. A target absent from the on-screen window list hides its overlay. Detaching the final overlay stops the timer and removes the activation observer.

Website overlays use insets from the browser's content bounds. Target and content bounds must come from the same observation to avoid movement drift. The native tracker owns attached frames and levels. When content bounds are unavailable, the overlay covers the window and offers a temporary pause. Without a usable target window, foreground app blocks use a display-sized overlay. Background blocks require a window ID and bounds to avoid covering unrelated apps. Whole-device blocks use a screen-level overlay.

On macOS versions without Liquid Glass, an opaque system background keeps blocked content out of view.

### Observation and Policy

Abstand enables `mado` reconciliation every two seconds to recover missed notifications and stale browser metadata. Browser content bounds, including sidebar changes, follow this schedule when no Accessibility notification arrives. The native 200 ms timer only follows outer geometry and stacking. Background content updates do not count as foreground activity.

The blocking consumer processes events in order. Clearing a session invalidates pending policy reads so they cannot restore cleared violations. Missing browser metadata does not clear a known website block, and a failed policy read preserves existing coverage. Policy enrichment reads cached icons instead of waiting for network requests. Starting or ending a session requests fresh monitor events, including unchanged observed background windows, so remaining sessions can keep blocking their targets.
