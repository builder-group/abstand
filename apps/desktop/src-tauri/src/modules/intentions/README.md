# Intentions

Intentions are user-defined runtime rules for starting and ending focused sessions. The database is the source of truth; the runtime reevaluates persisted conditions and schedules only the next timed wakeup.

## Runtime flow

Timed activation follows this loop:

```text
query timed conditions -> evaluate due and next -> apply due -> reevaluate if state changed -> schedule next wakeup
```

The scheduler does not own intention state. It stores one in-memory wakeup for the closest known timed condition. When that wakeup fires, the runtime reevaluates the database again before applying anything.

Manual activation does not go through timed scheduling. Desktop commands call `start_intention`, `complete_intention`, or `stop_intention`, and the runtime reevaluates timed conditions after the session transition.

## Design decisions

### How do block target actions work?

Block intentions store absolute target actions: `block` or `allow`. The selected scope decides which action is the base set and which action is the exception set:

- `block_targets`: base targets are blocked, exceptions are allowed
- `allow_targets`: base targets are allowed, exceptions are blocked
- `whole_device`: target rows are ignored

Policy evaluation treats app and website identities as separate layers. Within each layer, exceptions take priority over the base set:

- `block_targets` blocks when either applicable layer is blocked
- `allow_targets` allows only when every applicable layer is allowed

For browser activity, the app layer controls the browser itself and the website layer controls the active URL. Allowing a browser keeps its interface available without allowing unlisted websites. Allowing a website does not make it available inside an unlisted browser.

Target identities stay unique across both sets: a saved target has one action within an Intention. Broader and narrower website overlaps are allowed, and exception precedence resolves them within the website layer.

### How do website path targets match?

Website targets can include an optional path. A target with no path covers the whole hostname and its subdomains.

Paths without `*` use segment-safe prefix matching: `/watch` covers `/watch` and `/watch/abc`, but not `/watching`.

Paths with `*` use path wildcard matching. Matching starts at the first path segment, and `*` matches zero or more characters inside one segment only. Wildcard paths still cover child paths after the matched segments: `/@*` covers `/@jeff` and `/@jeff/videos`, while `/*/videos` covers `/@jeff/videos` but not `/a/b/videos`.

Query strings and fragments are not part of website path matching.

### Why does the runtime reevaluate from the database instead of trusting scheduled jobs?

Scheduled jobs are process-local and can become stale after edits, deletes, app restarts, or session changes. Reevaluate-from-DB keeps the runtime aligned with persisted state and makes stale wakeups harmless.

### Why is there only one pending timed wakeup?

The evaluator returns all currently due conditions and the closest future trigger. Scheduling only that closest trigger keeps scheduler state small. When the wakeup fires, the runtime reevaluates all timed conditions and schedules the next closest trigger.

### What owns runtime availability?

Abstand is a tray app, so the tray process owns timed activation while it is running. Closing a window should not stop this runtime. If the process exits, crashes, updates, or the machine restarts, the in-memory wakeup is lost, but setup reevaluates from the database on startup and catches up on conditions that are due at startup.

### Why can reevaluation run multiple passes?

Applying one due condition can make another condition evaluable. For example, a DateTime start can create an active session, which makes an end-after-start condition resolvable. The timed runtime repeats evaluation while due conditions are making real state changes, with a fixed pass limit to avoid infinite immediate cycles.

### Why does the frontend own Balanced action delays?

Balanced action delays are UI friction, not backend enforcement. The backend assesses weakening actions and returns the saved Balanced pause as `durationMs`, while the frontend owns the countdown and confirmation UI.

Strict remains backend-enforced. Commands that mutate active Strict block sessions still reject weakening actions.
