# Strict Enforcement Tamper Boundary

Date: 2026-06-09
Status: accepted for MVP

## Context

Strict Enforcement prevents an active Block Intention from being ended, weakened, deleted, or bypassed through normal app flows.

The app already covers the main runtime escape paths:

- backend commands reject weakening active Strict block sessions
- quit policy blocks graceful quit while Strict Enforcement is active
- the recovery agent relaunches the app after process exit, crash, or kill when the database still records an active Strict block session

These paths matter because they are normal runtime escape paths. A user can try Activity Monitor, force quit, or kill the process during a moment of frustration.

Blocking those paths is part of the product promise.

Deleting or editing the local database is a different kind of bypass. It is deliberate tampering with user-writable app state.

A process running as the same macOS user can remove the database, edit it, or remove any other user-owned recovery file. Obscure filenames can add friction, but they do not change the tamper boundary.

The question is whether Strict Enforcement should add extra recovery state so it can survive database deletion or tampering.

## Options Considered

### App-state boundary

Treat local database deletion and tampering as outside the current enforcement boundary.

This keeps behavior predictable: deleting app data deletes app state. It also keeps enforcement focused on common escape paths instead of building a user-owned recovery system that remains bypassable.

Cost: users who know how to delete or edit the local database can bypass Strict Enforcement.

### User-owned recovery state

Store extra active Strict state outside the normal database path. This could be a hidden JSON snapshot or a scrubbed SQLite backup.

This can recover from obvious `abstand.db` deletion if the recovery state remains in place. It can add useful friction, but it is still user-owned state. The same macOS user can find, delete, or edit it.

The implementation cost is meaningful. Custom snapshots duplicate intention-domain structure and need restore logic. A scrubbed SQLite backup keeps the database schema, but still adds backup timing, scrub rules, restore conditions, corruption handling, and surprising deletion semantics.

### Encrypted database

Encrypt the SQLite database so local edits require a key instead of direct SQLite access.

SQLite does not support this by default, so this would require SQLCipher or a similar dependency. It can raise the effort required to inspect or edit database contents, but it does not prevent deletion. The app also needs the key locally, so a motivated same-user process can still recover it from the app or runtime.

### Live database self-repair

If the app is still running and the database path disappears, recreate the database file from live backend state or the open SQLite connection.

This can protect against accidental deletion while Abstand is running. It does not survive deleting the database and killing the app before repair runs. It also needs careful reconnect or restart behavior so the running app and the recreated file do not diverge.

### Privileged enforcement state

Store the active Strict enforcement state in a privileged helper or root-owned location, with install and removal requiring macOS admin authentication.

This can make non-elevated file deletion insufficient when the state is actually root-owned and not writable by the user. It is still not a hard boundary on personal Macs where the app user is usually also an administrator. It also changes the product and distribution shape: privileged installation, admin approval, uninstall and recovery flows, and more careful failure handling.

## Comparisons With Other Apps

These comparisons are informal local observations from the tested versions, not guarantees about current or future app behavior.

Cold Turkey Blocker 4.9 (0) keeps its blocker process alive with a LaunchAgent. In the observed test, removing the top-level Cold Turkey data files from `/Library/Application Support/Cold Turkey` and then killing the blocker process caused launchd to restart the agent against reset state.

The useful lesson is the split between process liveness and policy liveness: keeping a process alive does not guarantee enforcement after the policy source of truth is removed.

SelfControl 4.0.2 (420) stores active block state in a hidden settings plist under `/usr/local/etc`. On this system, that file was owned by `root:wheel` and was not writable by an unelevated process running as the current user.

In the observed test, deleting that source-of-truth file with admin privileges and then force-restarting the app ended the active block.

The useful lesson is that local policy state can still be removed once it is found. Privileged ownership changes whether an unelevated process can remove it, but it does not stop admin removal on a personal Mac.

Across the tested versions, the durable pattern is the same: once the local policy source of truth is found and removed, enforcement can be worked around after restart or repair.

## Decision

Do not add database-tamper hardening.

Strict Enforcement is enforced through supported app flows and process recovery while app state exists. Local deletion or editing of app state remains outside the enforcement boundary.

## Why This Is The Current Call

The extra protection mostly covers a narrow case: a user finds and deletes `abstand.db`, but does not find the additional recovery state or documented removal path.

That is useful friction, but it is not a stronger guarantee. Finding hidden recovery state is the same kind of deliberate bypass work as finding the database or searching for the documented removal path.

Hidden user-owned files can slow that down, but they cannot stop a motivated bypass by the same macOS user.

The clearer product rule is better: Strict survives app and process escape paths while app state exists. Deleting app state remains the boundary.

Privileged enforcement state is not the right default yet. Abstand is expected to run mostly on personal Macs where users have full control over their devices.

Privileged state can block non-elevated deletion, but it does not stop an admin user from removing the local source of truth with `sudo` or admin approval. For that user, the main added friction is discovery, not the password prompt.

Revisit this decision if real usage shows users bypass Strict by deleting the database, or if surviving app data deletion becomes an explicit product promise.
