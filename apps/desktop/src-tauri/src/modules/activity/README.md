# Activity

Activity records local foreground intervals from mado. The data is raw timeline data: reporting decides how to group, classify, hide, or score it.

Blocking uses the same mado source, but runs separately so activity database work cannot delay enforcement.

## Foreground Intervals

`activity_foreground` stores one row per foreground interval. The active interval is the single row where `ended_at IS NULL`, guarded by a partial unique index.

The repository owns interval transitions:

- same activity: keep the active row unchanged
- same app with more detail: update the active row and preserve its `started_at`
- different activity: close the active row at the next activity start and insert the next row

mado can report an app activation before window or browser details. The repository updates the matching app-level active row instead of inserting a duplicate interval.

## Detail Levels

`capture_level` describes which fields were captured:

- `app`: foreground app only
- `window`: app plus title, window id, or bounds
- `browser`: window detail plus URL, website, or private-mode signal

Private browser windows are stored as app-level activity when private browser tracking is disabled.

## Recording Lifecycle

The monitor queues focus events, and the recorder writes them sequentially so interval boundaries stay in focus-event order. The recorder reads settings per event; if tracking is disabled before a queued event is processed, the recorder skips it.

Disabling tracking and allowed app exit close the active row immediately because they are user-visible product boundaries.

The recorder writes `activity.foreground_recorder.last_seen_at` to `runtime_state` while it runs. On startup, it closes any stale active row at that heartbeat time so crashes, force quits, and killed processes do not extend the previous activity until the next launch.

Lock and sleep stay raw. In the tested macOS lock/sleep path, mado reports `com.apple.loginwindow`, and the recorder stores it as its own interval. Reporting should decide whether system activity counts as away, neutral, or hidden.
