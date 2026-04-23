# Scheduler

In-process one-shot scheduler for the desktop app.

This module lets Rust code schedule work:

- after a wall-clock delay
- at a specific Unix timestamp in milliseconds

The scheduler runs only while the app process is alive. It does not persist jobs across restarts.

## API

The app owns one shared `Scheduler` instance in `SchedulerState`.

Callers use the module helpers in `mod.rs`:

- `schedule_after`
- `schedule_at_unix_ms`
- `cancel_job`
- `list_jobs`

Example:

```rust
use crate::modules::scheduler;
use std::time::Duration;

scheduler::schedule_after(&app, "example", Duration::from_secs(300), move |app| {
    // do work
});
```

```rust
let unix_ms = 1_800_000_000_000;
scheduler::schedule_at_unix_ms(&app, "example", unix_ms, move |app| {
    // do work
});
```

Recurring schedules are managed by the caller by computing and scheduling the next one-shot job:

```rust
fn schedule_next_run(app: &tauri::AppHandle, next_unix_ms: i64) {
    scheduler::schedule_at_unix_ms(app, "daily sync", next_unix_ms, move |app| {
        // do work

        let following_unix_ms = next_unix_ms + 24 * 60 * 60 * 1_000;
        schedule_next_run(&app, following_unix_ms);
    });
}
```

## Contract

Each job is stored as a concrete `scheduled_for_unix_ms`.

`schedule_after` is only a convenience wrapper. It resolves the delay to a Unix timestamp when the
job is inserted.

This means the scheduler is built for wall-clock scheduling, not stopwatch-style elapsed runtime
timers.

## How It Works

The scheduler keeps an in-memory map of jobs and runs one background loop.

On each cycle it:

1. captures the current wall-clock time and Tokio `Instant`
2. removes all jobs that are due
3. dispatches those callbacks
4. computes the earliest next deadline
5. sleeps until that deadline or until the schedule changes

The loop uses Tokio's monotonic clock for sleeping, but due checks use wall-clock Unix time. While
waiting, it wakes periodically instead of sleeping all the way to a far-future timestamp.

That periodic reconciliation matters because Tokio's monotonic clock pauses during system sleep. If
the machine sleeps through a scheduled time, the job will not fire while sleeping, but it will
become due and run shortly after wake on the next reconciliation cycle.

## Ordering

The scheduler guarantees timing, not sequencing.

If multiple jobs become due in the same cycle, they are collected together and dispatched
independently. Callers should not rely on a deterministic execution order between same-cycle jobs.

If a workflow needs strict ordering, model it as one scheduled callback that performs the steps in
the required order instead of multiple separate jobs with the same target time.

## Boundary

The scheduler owns timing and dispatch only.

Domain modules own:

- what should happen
- when it should happen
- how recurring schedules are computed
- what domain effects happen when a scheduled callback runs

The scheduler should not read another module's domain state directly.

## Current Limits

- in-memory only
- one-shot jobs only
- no persistence across app restarts
- no OS-specific sleep/wake hooks
- no local-time recurrence or time-zone rules
