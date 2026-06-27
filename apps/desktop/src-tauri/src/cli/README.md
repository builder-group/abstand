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
