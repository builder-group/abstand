# Rust Tauri Module Structure

How to organize Rust modules in a Tauri desktop app.

## Scope

This convention applies to bounded modules under `src/modules/` or the equivalent Rust app module directory in a Tauri desktop app.

Use it for product or system areas such as settings, sessions, notifications, updater flows, and similar desktop-runtime behavior.

## Default Structure

```txt
module/
├── mod.rs          # Module exports and setup/exit hooks
├── commands.rs     # Tauri handlers, command params, response types, and command-local glue
├── types.rs        # Shared types, events, runtime state
├── repository.rs   # Database layer plus Row/Input types
└── [domain].rs     # Complex business logic (optional)
```

This is the default structure. Create only the files the module needs. Small modules should stay small.

Modules may add a clearly named extra file when they own a distinct concern that does not fit the default files, for example `persistence.rs` for file-backed storage.

## When To Create Each File

| File            | Create when...                                                                  |
| --------------- | ------------------------------------------------------------------------------- |
| `mod.rs`        | Always                                                                          |
| `commands.rs`   | The module exposes Tauri commands                                               |
| `types.rs`      | The module has shared enums, events, state, or types used by more than one file |
| `repository.rs` | The module owns database operations                                             |
| `[domain].rs`   | The module has business logic beyond structural mapping                         |

### When To Create A Domain File

Create `[domain].rs` when the module has business logic that deserves its own home, such as:

- state machines or lifecycle management
- computed values
- validation or business rules
- logic that should have focused unit tests

For simple CRUD or thin command modules, skip it.

### When To Add Another File

Add another clearly named file only when the module has a distinct non-domain concern that would make one of the default files noticeably less clear.

Good examples:

- `persistence.rs` for file-backed storage
- `monitor.rs` for module-specific OS observation
- `runner.rs` for long-running execution owned by the module

Prefer a descriptive name over a vague file like `utils.rs`.

## File Contents

### mod.rs

Start with a one-line module doc comment that describes what the module owns.

```rust
//! Manages application settings persistence, state, and commands.

pub mod commands;
pub mod persistence;
pub mod types;

pub fn setup(app: &App) { ... }
pub fn exit(app: &AppHandle) { ... }
```

Use `mod.rs` for:

- public module exports
- setup and teardown hooks
- small module wiring

Do not put large command logic or type definitions here.

### types.rs

Keep `types.rs` for shared or cross-file types.

Good fits:

- shared enums
- events emitted to the frontend
- runtime state types
- small self-contained impls on shared enums or value types

Avoid importing from `commands.rs` or `repository.rs`.

Use category markers in `types.rs` only for sections that are genuinely useful to find quickly in the IDE.

Common markers:

- `// MARK: - State`
- `// MARK: - Events`

Do not add category markers just to label obvious top-level shared types.

```rust
use serde::{Deserialize, Serialize};

pub enum Theme {
    Light,
    Dark,
    Auto,
}

// MARK: - State

pub struct ModuleState(Mutex<ModuleConfig>);

// MARK: - Events

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
pub struct ModuleUpdatedEvent(pub ModuleDto);
```

### commands.rs

Use `commands.rs` primarily for Tauri command handlers and the transport types that are tied to those handlers.

Good fits:

- `#[tauri::command]` handlers
- command-specific params types and response types (like DTOs)
- structural conversions (to e.g. response types) such as `impl From`

Do not treat `commands.rs` as a general-purpose misc file.

Keep command handlers near the top of the file.

### repository.rs

Use `repository.rs` when the module owns database persistence.

Keep the repository impl near the top, then place its `Row` and `Input` types below it.

Recommended section markers when used:

- `// MARK: - Row`
- `// MARK: - Input`

### [domain].rs

Use a domain file for business logic that is not just storage or transport.

Examples:

- timer progression
- session lifecycle rules
- scheduling logic
- data normalization with real business meaning

Prefer one clearly named domain file over vague helpers.

### Another File

Use another clearly named file when the module owns a distinct non-domain concern such as file persistence or OS observation.

Keep these files focused and clearly named.

## Dependency Direction

```txt
commands.rs -> types.rs
commands.rs -> repository.rs
commands.rs -> [domain].rs
repository.rs -> types.rs
[domain].rs -> types.rs
```

Avoid:

- `types.rs` importing from `commands.rs`
- `types.rs` importing from `repository.rs`
- `repository.rs` importing from `commands.rs`

## Type Naming

| Type   | Suffix    | Typical location | Purpose                          |
| ------ | --------- | ---------------- | -------------------------------- |
| DTO    | `*Dto`    | `commands.rs`    | Command-specific transport shape |
| Event  | `*Event`  | `types.rs`       | Emitted to frontend              |
| State  | `*State`  | `types.rs`       | Runtime state                    |
| Params | `*Params` | `commands.rs`    | Received from frontend           |
| Row    | `*Row`    | `repository.rs`  | Database row mapping             |
| Input  | `*Input`  | `repository.rs`  | Internal repository input        |

For a module root aggregate that crosses module boundaries, prefer an explicit name like `AppConfig` over a generic `Config`.

## Examples

### Small Module

```txt
preferences/
├── mod.rs
├── commands.rs
└── types.rs
```

- `mod.rs` wires setup
- `commands.rs` exposes Tauri commands
- `types.rs` contains config, shared enums, state, and events

### File-Backed Module

```txt
preferences/
├── mod.rs
├── commands.rs
├── persistence.rs
└── types.rs
```

- same as a small module
- adds `persistence.rs` because file storage is a distinct concern

### CRUD Module

```txt
catalog/
├── mod.rs
├── commands.rs
├── repository.rs
└── types.rs
```

### Logic-Heavy Module

```txt
session/
├── mod.rs
├── commands.rs
├── repository.rs
├── runner.rs
└── types.rs
```

- adds `runner.rs` because the module has non-trivial execution logic beyond commands and storage
