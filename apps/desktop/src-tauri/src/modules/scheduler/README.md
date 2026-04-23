# Scheduler

Shared in-process scheduler for the desktop app.

It lets modules schedule work:

- after a delay
- at a specific Unix timestamp
- as a Rust callback or an emitted scheduler event

The scheduler only runs while the app process is alive. It is not persistent across restarts.

## Usage

From Rust:

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

For event-only jobs:

```rust
scheduler::schedule_event_after(&app, "example", Duration::from_secs(30), None);
```

## API Shape

The app owns one `Scheduler` instance and exposes it through `SchedulerState` in Tauri managed state.

Public timing primitives:

- `ScheduledJobTiming::After { delay_ms }`
- `ScheduledJobTiming::AtUnixMs { unix_ms }`

Useful entry points:

- `schedule_after`
- `schedule_at_unix_ms`
- `schedule_event_after`
- `schedule_event_at_unix_ms`
- `cancel_job`
- `list_jobs`

## How It Works

Internally the scheduler keeps an in-memory map of scheduled jobs.

Each job is resolved to:

- a scheduled wall-clock instant for inspection and events
- a Tokio wait strategy for sleeping until it should be checked again

The runtime uses one background loop:

1. collect jobs that are already due
2. fire them immediately
3. find the earliest remaining deadline
4. sleep until that deadline or until the schedule changes

Absolute Unix-timestamp jobs are checked against wall-clock time and periodically re-evaluated while waiting so clock changes do not leave them pinned to one old monotonic deadline.

When a job fires:

- it is removed from the in-memory store
- `ScheduledJobFiredEvent` is emitted
- its Rust callback is dispatched without blocking the scheduler loop

## Module Boundary

The scheduler is generic infrastructure. It should not read another module's domain data directly.

The intended flow is:

```txt
domain module decides what should happen and when
-> domain module schedules work with scheduler
-> scheduler wakes up and runs it
-> domain module handles the effect
```

## Current Limits

- in-memory only
- one-shot jobs only
- no recurrence yet
- no persistence across app restarts
- no OS-level sleep/wake or time-zone hooks yet
