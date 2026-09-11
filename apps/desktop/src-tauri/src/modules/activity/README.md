# Activity

Activity records local foreground intervals from mado. The data is raw timeline data: reporting decides how to group, classify, hide, or score it.

Blocking uses the same mado source through a separate event consumer. It does not wait for activity recording to finish.

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
- `browser`: URL, website, or private-mode data, with any available window details

Private browser windows are stored as app-level activity when private browser tracking is disabled.

## Recording Lifecycle

The monitor queues foreground app and window events, and the recorder writes them sequentially so interval boundaries stay in focus-event order. Background content and window lifecycle events do not change the active interval. The recorder reads settings per event. If tracking is disabled before a queued event is processed, the recorder skips it.

Disabling tracking and allowed app exit enqueue a close request and wait for it to finish. The request uses the time of that boundary and runs after pending writes, so an in-flight event cannot reopen the interval afterward.

The recorder writes `activity.foreground_recorder.last_seen_at` to `runtime_state` while it runs. On startup, it closes any stale active row at that heartbeat time so crashes, force quits, and killed processes do not extend the previous activity until the next launch.

When mado reports `com.apple.loginwindow`, the recorder stores it as its own interval. Reporting decides whether system activity counts as away, neutral, or hidden.
