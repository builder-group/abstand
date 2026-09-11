# CLI

The CLI entry point runs before Tauri starts. It handles command-line workflows without opening the desktop UI.

## Install Path

The in-app "Command line tool" setting installs a symlink in:

```text
~/.local/bin
```

This is intentional. It is user-owned, reversible from a normal settings toggle, and does not require admin privileges.

We do not install to `/usr/local/bin` from the app. That location is common for package managers and privileged installers, but it is often root-owned on macOS. Writing there from a settings toggle would require a separate privileged flow or a `sudo` instruction.

If `~/.local/bin` is not on `PATH`, the frontend offers setup instructions after install. The copied instructions are written for humans and agents so they can configure the shell environment explicitly.

## Intention Control (macOS)

The running desktop app accepts Intention commands over a local Unix socket. Start the app before using these commands. The CLI and desktop app must come from a build that includes Intention control. Installing a newer CLI alone does not add control to an older running app.

```sh
abs intention list
abs status
abs intention create --name "Study" --duration 30m --allow-app md.obsidian
abs intention show 1
abs intention start 1
abs intention stop 1
abs intention delete 1
```

Use the ID returned by `create` in subsequent commands. Creating an Intention saves it without starting a session. The flag-based create command uses a manual start, a timed end, and Casual enforcement by default. `--mode` also accepts `balanced` and `strict`.

Targets are repeatable: `--allow-app`, `--block-app`, `--allow-site`, and `--block-site`. Apps use bundle IDs, such as `md.obsidian`, rather than display names or executable paths. If allow and block targets are mixed, specify `--scope allow` or `--scope block` to identify the base policy. Website targets use hostnames; use the JSON format for path-specific exceptions.

Durations require a positive integer and a suffix: `ms`, `s`, `m`, `h`, or `d`. Successful commands write JSON to stdout. Failures write a diagnostic to stderr and return exit code 1. Run `abs intention --help` for usage.

### Structured Configuration

Use the same create/update payload shape as the desktop commands for schedules and other advanced conditions:

```sh
abs intention create --file intention.json
abs intention update 1 --file intention.json
cat intention.json | abs intention create --file -
```

`update` replaces the configuration; it is not a partial patch. Its ID comes from the command line. Example `intention.json`:

```json
{
  "name": "Study",
  "behavior": {
    "type": "block",
    "enforcementMode": "casual",
    "balancedDelayMs": 15000,
    "scope": "allowTargets",
    "targets": [
      {
        "type": "app",
        "action": "allow",
        "stableId": "md.obsidian",
        "bundleId": "md.obsidian",
        "name": "Obsidian"
      }
    ]
  },
  "conditions": [
    { "transition": "start", "rule": { "type": "manual" } },
    {
      "transition": "end",
      "rule": {
        "type": "afterTransition",
        "anchorTransition": "start",
        "offsetMs": 1800000
      }
    }
  ]
}
```

### Runtime and Enforcement

The server calls the existing desktop command handlers. Validation, database writes, scheduler reevaluation, tray refreshes, and frontend events use the same path as GUI actions. The CLI never writes the database directly.

Active Strict Intentions retain the backend restrictions on stopping, deleting, or weakening them. Operations requiring a Balanced confirmation must be performed in the GUI. Casual sessions can be stopped immediately. There is no force option.

App and website blocking still use Abstand's existing mechanism. An allowlist is not a network firewall and does not disconnect the Mac or prevent all network requests from an allowed app.

### Transport

The socket is `~/Library/Application Support/<bundle-id>/cli/control.sock`. The directory is mode `0700`, and the socket is mode `0600`. Development and production builds use their respective bundle IDs. Requests are newline-delimited JSON with a 1 MiB limit, and the server serializes CLI operations on a dedicated worker thread. Incomplete input and idle connections are bounded by read limits and timeouts. No TCP port is opened.

A stale socket is reclaimed on startup only when the old server refuses a connection. Other files are never replaced. Connection failures are reported without silently starting a second app. A lost response does not imply that a mutation failed: inspect `status` and `intention list` before retrying.

### Validation

```sh
cargo test -p abstand --lib
cargo build -p abstand
python3 apps/desktop/scripts/cli-smoke-test.py target/debug/abstand
```

The smoke test requires the matching desktop build to be running. It creates uniquely named temporary Intentions targeting a nonexistent test app, exercises session transitions and enforcement, and deletes its test Intentions afterward. It does not block a real app or modify existing Intentions.
