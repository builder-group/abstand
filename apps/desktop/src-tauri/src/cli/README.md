# CLI

Abstand ships a command-line interface as part of the desktop executable. The user-facing command is `abs`.

The executable handles CLI arguments before Tauri starts. Commands that need live enforcement state communicate with the running desktop app. Activity reporting reads persisted data without launching the app.

## Installation

Enable the command-line tool in Abstand's settings. The app installs a symlink at:

```text
~/.local/bin/abs
```

The install is user-owned and reversible without administrator privileges. Abstand does not write to `/usr/local/bin`. If `~/.local/bin` is not on `PATH`, the settings UI provides shell setup instructions.

Verify the installation with:

```sh
abs version
abs help
```

## Commands

```text
abs help
abs version
abs app start
abs status
abs activity foreground [options]
abs intention <command>
abs recovery-agent <command>
```

Run `abs help` or append `--help` to a command group for its syntax. `--help` and `-h` also print top-level usage. `--version` and `-V` print the CLI version.

App, status, Intention, and recovery-agent commands are macOS-only.

### App

```sh
abs app start
```

Starts the desktop app or shows the main window of an existing instance. The command returns after requesting the launch. Wait for the app to initialize before running a command that requires it.

### Status

```sh
abs status
```

Prints the running app version, process ID, and active Intention sessions as JSON. The command fails when the desktop app is not running.

### Activity

```sh
abs activity foreground
abs activity foreground --since 30m
abs activity foreground --today
abs activity foreground --date 2026-09-11
abs activity foreground --from <unix-ms> --to <unix-ms>
```

`activity foreground` prints foreground activity intervals as JSON. It reads the existing database without starting the desktop app and never writes to it.

Without a time option, the command returns the last 24 hours. Use only one time mode:

- `--since`: a positive duration ending now, with the suffix `ms`, `s`, `m`, `h`, or `d`
- `--today`: the current local calendar day
- `--date`: one local calendar day in `yyyy-mm-dd` format
- `--from` and `--to`: an explicit Unix millisecond range

Returned intervals are clipped to the requested range and the time at which the report was generated. See the [activity module](../modules/activity/README.md) for recording behavior and stored detail levels.

### Intentions

The desktop app must be running for Intention commands.

```sh
abs intention list
abs intention show <id>
abs intention create --name "Study" --duration 30m --allow-app md.obsidian
abs intention start <id>
abs intention stop <id>
abs intention delete <id>
```

Creating an Intention saves it with a manual start and a timed end. It does not start a session. Durations use a positive integer with `ms`, `s`, `m`, `h`, or `d`. The app rejects durations beyond its supported timestamp range.

Casual Enforcement is the default. Use `--mode balanced` or `--mode strict` to choose another mode. CLI-created Balanced Intentions use a 15-second confirmation pause.

Targets can be repeated:

```text
--allow-app <bundle-id>
--block-app <bundle-id>
--allow-site <hostname>
--block-site <hostname>
```

App targets use bundle identifiers such as `md.obsidian`. Website targets use hostnames and include subdomains.

The CLI selects `--scope allow` when all targets allow access, or `--scope block` when all targets block access. When mixing actions, specify the scope explicitly. Targets with the opposite action act as exceptions.

Apps and websites are separate layers: in allow scope, a website is accessible only when its browser app is also allowed. See the [Intention module](../modules/intentions/README.md) for target precedence. Use the desktop UI to edit Intentions or configure other start and end conditions.

The CLI uses the same validation and lifecycle operations as the desktop UI. Active Strict block Intentions cannot be stopped or deleted. Actions that require Balanced confirmation must be completed in the UI. There is no force option.

### Recovery Agent

```sh
abs recovery-agent status
abs recovery-agent install
abs recovery-agent uninstall
abs recovery-agent plist-path
abs recovery-agent run
```

When enabled, the recovery agent keeps Abstand running while Balanced or Strict Enforcement is active. These commands inspect or manage its per-user LaunchAgent. `recovery-agent run` is the watchdog entry point used by launchd and is not intended for normal interactive use.

See the [recovery-agent module](../modules/recovery_agent/README.md) for its lifecycle and enforcement contract.

## Output and Errors

Activity, status, and successful Intention commands print pretty JSON to standard output. App and recovery-agent management commands print short text results.

| Command | JSON output |
| --- | --- |
| `intention list` | Array of Intentions |
| `intention show`, `intention create` | Intention |
| `intention start`, `intention stop` | Session |
| `intention delete` | `{ "deleted": <id> }` |
| `status` | `version`, `pid`, and an array of active `sessions` |

Starting an active Intention returns its existing session. When no sessions are active, `status` returns an empty `sessions` array.

The CLI writes argument errors and runtime failures to standard error and returns exit code `1`. Help and successful commands return exit code `0`.

A lost response does not prove that a mutation failed. Check `abs status` or `abs intention list` before retrying a start, stop, create, or delete operation.

## Local Control Transport

Commands that require live app state use the local control transport. Status and Intention commands currently use it. `activity foreground` reads persisted data directly.

The running app listens on:

```text
~/Library/Application Support/<bundle-id>/cli/control.sock
```

The socket directory uses owner-only mode `0700`. The socket uses owner-only read/write mode `0600`. Development and production builds use their respective bundle identifiers. No TCP port is opened.

Each connection carries one newline-delimited JSON request and one response. Messages have bounded sizes and I/O timeouts. The app handles requests sequentially on a dedicated thread and reclaims a stale socket only when it refuses a connection. It never replaces a non-socket path.

The protocol is private to the matching app and CLI build. Restart the desktop app after updating the executable so both use the same protocol.

## Development

The CLI implementation lives in this directory:

- `mod.rs`: top-level routing before Tauri startup
- `subcommands/`: command parsing and execution
- `control/`: typed local-control protocol, client, and app-hosted server
- `installer.rs`: `~/.local/bin/abs` symlink management

For Rust-only CLI changes, run:

```sh
cargo test -p abstand --lib
cargo check -p abstand --bin abstand
```
