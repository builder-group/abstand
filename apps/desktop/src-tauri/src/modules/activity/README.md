# Activity

Activity records foreground app, window, and browser intervals.

mado provides focus events. SQLite stores the current and historical activity. Blocking uses the same focus source, but it runs separately so activity database work cannot delay enforcement.

## Contract

`activity_foreground` stores one row per foreground interval.

The current interval is the single row where `ended_at IS NULL`. The repository owns that invariant: when a different activity is recorded, it closes the current row and inserts the next row in one transaction. If the incoming activity matches the current row, the repository leaves the row unchanged.

The database also enforces the invariant with a partial unique index for `ended_at IS NULL`.

## Event Ordering

mado callbacks must stay fast. The monitor queues focus events, and the recorder writes them sequentially. This keeps interval boundaries in focus-event order even when database writes are slower than incoming events.

Settings changes and app exit do not go through the focus queue. They are product boundaries:

- disabling tracking closes the active row at the settings-change time
- allowed app exit closes the active row from the Tauri `ExitRequested` path
- recorder startup closes any leftover active row from a crash, force quit, or other missed shutdown path

Queued focus events that run after tracking is disabled read disabled settings and do not create new rows.

## Detail Levels

App, window, and browser details describe the same foreground interval at different capture levels. They live in one table so timeline queries do not need to merge separate interval sources.

`capture_level` states which fields are meaningful:

- `app`: foreground app only
- `window`: app plus window title, id, and bounds
- `browser`: window detail plus URL, website, and private-mode signal when available

If private browser tracking is disabled and mado reports a private browser window, the recorder stores app-level activity so private window titles and URLs are not persisted.
