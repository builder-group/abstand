# Recovery Agent

The recovery agent keeps Abstand recoverable during active Strict Enforcement.

It is separate from the normal Tauri app process. The normal app can prevent graceful quits through `modules::quit_policy`, but it cannot recover itself after the process exits, crashes, or is killed. The recovery agent covers that out-of-process case.

## How It Works

Installing the agent writes a per-user LaunchAgent plist in `~/Library/LaunchAgents` and loads it with `launchctl`.

The plist starts the same Abstand executable with:

```text
--recovery-agent
```

`main.rs` checks for that argument before starting Tauri. When the argument is present, the process runs `watchdog::run()` instead of the normal app.

The watchdog loop:

1. opens its own read-only SQLite connection
2. checks whether an active strict block session exists
3. checks whether the main Abstand app process is running
4. relaunches Abstand when strict mode is active and the app is gone

When the agent relaunches the app, it passes:

```text
--recovery-agent-relaunched
```

The normal app consumes that argument after the frontend mounts and emits the existing quit-prevention event so the user sees the same warning toast.
