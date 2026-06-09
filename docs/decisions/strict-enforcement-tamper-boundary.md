# Strict Enforcement Tamper Boundary

Date: 2026-06-09
Status: accepted for MVP

## Context

Strict Enforcement prevents an active Block Intention from being ended, weakened, deleted, or bypassed through normal app flows.

The app already covers the main runtime escape paths:

- backend commands reject weakening active Strict block sessions
- quit policy blocks graceful quit while Strict Enforcement is active
- the recovery agent relaunches the app after process exit, crash, or kill when the database still records an active Strict block session

These paths matter because they are normal runtime escape paths. A user can try Activity Monitor, force quit, or kill the process during a moment of frustration. Blocking those paths is part of the product promise.

Deleting or editing the local database is a different kind of bypass. It is deliberate tampering with user-writable app state. A process running as the same macOS user can remove the database, edit it, or remove any other user-owned recovery file. Obscure filenames can add friction, but they do not change the tamper boundary.

The question is whether Strict Enforcement should add extra recovery state so it can survive database deletion or tampering.

## Options Considered

### App-state boundary

Treat local database deletion and tampering as outside the current enforcement boundary.

This keeps behavior predictable: deleting app data deletes app state. It also keeps enforcement focused on common escape paths instead of building a user-owned recovery system that remains bypassable.

Cost: users who know how to delete or edit the local database can bypass Strict Enforcement.

### Hidden Strict snapshot

Store a hidden JSON snapshot for every active Strict block session outside the normal database directory.

This can recover from obvious `abstand.db` deletion and simple tampering. It is not tamper-proof because the same macOS user can delete or edit the snapshot. It also duplicates intention-domain shape, requires restore and repair logic, and can drift when the product model changes.

### Scrubbed SQLite backup

Write a hidden SQLite backup while any Strict block session is active, then scrub it down to active Strict recovery data.

This avoids hand-built JSON reconstruction and keeps migrations closer to normal database handling. It still creates a second lifecycle for active Strict sessions. It also remains user-owned state, so it adds friction but does not change the tamper boundary.

### Privileged enforcement state

Store the active Strict enforcement state in a privileged helper or root-owned location, with install and removal requiring macOS admin authentication.

This raises the bypass from normal user-owned file deletion to admin-level removal. That is more friction, but it is still not a hard guarantee on personal Macs where the app user is usually also an administrator. It also changes the product and distribution shape. It requires privileged installation, admin approval, uninstall and recovery flows, and more careful failure handling.

## Decision

Do not add database-tamper hardening.

Strict Enforcement is enforced through supported app flows and process recovery while app state exists. Local deletion or editing of app state remains outside the enforcement boundary.

## Why This Is The Current Call

The extra protection mostly covers a narrow case: a user finds and deletes `abstand.db`, but does not find the additional recovery state or documented removal path.

That is useful friction, but it is not a stronger guarantee. Anyone technical enough to search for the database is close to searching for the documented removal path. A hidden file can slow that down, but it cannot stop a motivated bypass by the same macOS user.

The implementation cost is also meaningful. Custom snapshots duplicate intention-domain structure and need restore logic. Database-row snapshots still need reconciliation logic. A scrubbed SQLite backup keeps the schema, but still adds backup timing, scrub rules, restore conditions, corruption handling, and surprising deletion semantics.

The clearer product rule is better: Strict survives app and process escape paths while app state exists. Deleting app state is the boundary.

Privileged enforcement state is not the right default yet. Abstand is expected to run mostly on personal Macs where users have full control over their devices. Privileged state would raise the bypass cost, but it would not prevent an admin user from removing the app. It adds installation, update, uninstall, and support complexity before the product has evidence that database deletion is a common bypass.

Revisit this decision if real usage shows users bypass Strict by deleting the database, or if surviving app data deletion becomes an explicit product promise.
