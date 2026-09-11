# Blocking

Blocking consumes mado events independently of activity recording. Its queue preserves event order while policy and catalog reads run asynchronously.

App and window observations are evaluated against active Intentions. Policy evaluation produces violations without changing windows. The runtime manages active violations and temporary pauses, then updates overlay presentation with display names and cached assets.

The shared overlay window pool owns reusable native windows. The macOS bridge owns attachment, geometry, and stacking. See [window overlays](../../../../../../docs/decisions/window-overlays.md) for behavior, platform limits, and live validation.
