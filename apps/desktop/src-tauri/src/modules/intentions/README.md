# Intentions

Intentions are user-defined runtime rules for starting and ending focused sessions. The database is the source of truth; the runtime reevaluates persisted conditions and schedules only the next timed wakeup.

## Runtime flow

Timed activation follows this loop:

```text
query timed conditions -> evaluate due and next -> apply due -> reevaluate if state changed -> schedule next wakeup
```

The scheduler does not own intention state. It stores one in-memory wakeup for the closest known timed condition. When that wakeup fires, the runtime reevaluates the database again before applying anything.

Manual activation does not go through timed scheduling. Frontend commands call `start_intention`, `complete_intention`, or `stop_intention`, and the runtime reevaluates timed conditions after the session transition.

## Design decisions

### Why does the runtime reevaluate from the database instead of trusting scheduled jobs?

Scheduled jobs are process-local and can become stale after edits, deletes, app restarts, or session changes. Reevaluate-from-DB keeps the runtime aligned with persisted state and makes stale wakeups harmless.

### Why is there only one pending timed wakeup?

The evaluator returns all currently due conditions and the closest future trigger. Scheduling only that closest trigger keeps scheduler state small. When the wakeup fires, the runtime reevaluates all timed conditions and schedules the next closest trigger.

### What owns runtime availability?

Abstand is a tray app, so the tray process owns timed activation while it is running. Closing a window should not stop this runtime. If the process exits, crashes, updates, or the machine restarts, the in-memory wakeup is lost, but setup reevaluates from the database on startup and catches up on conditions that are due at startup.

### Why can reevaluation run multiple passes?

Applying one due condition can make another condition evaluable. For example, a DateTime start can create an active session, which makes an end-after-start condition resolvable. The timed runtime repeats evaluation while due conditions are making real state changes, with a fixed pass limit to avoid infinite immediate cycles.
