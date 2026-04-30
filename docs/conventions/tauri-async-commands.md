# Tauri Async Commands

How to write Tauri command handlers that do not block the UI.

## Rule

**`async fn` is the default for Tauri commands. Plain `fn` is only acceptable for commands that return immediately with no locks, no I/O, and no computation.**

If the command performs blocking or CPU-bound work, wrap that work in `tauri::async_runtime::spawn_blocking`.

## Why

A plain synchronous Tauri command runs on the thread responsible for handling commands (often the main/UI thread). While it executes, the webview cannot repaint and React cannot update state. The UI freezes until it returns.

The JavaScript `await invoke(...)` does not prevent this. It only makes the JavaScript side non-blocking. The Rust side can still block the UI thread for the entire duration of the command.

`async fn` makes the command run on Tauri’s async runtime (usually Tokio).

Tokio commonly has two relevant kinds of threads:

- **Runtime worker threads**: a small pool (often around one per CPU core). Designed for async work that frequently reaches `.await` (network, async I/O). While one task awaits, another can run on the same thread.
- **Blocking threads**: a separate, larger pool for blocking or CPU-heavy work. Tokio creates these threads as needed, up to a limit.

If a command performs long-running synchronous work (locks, CPU work, sync APIs) on a runtime worker thread, it occupies that thread and delays other async tasks.

`spawn_blocking` moves that work to the blocking pool, where this behavior is expected.

## What Counts As Blocking Work

If the command does any of the following, it should use `spawn_blocking`:

- acquires a `Mutex` or `RwLock` and performs non-trivial work while holding it
- reads or writes files using synchronous `std::fs`
- calls platform APIs that are not async (e.g. icon loading, app enumeration)
- performs CPU-heavy work (fuzzy matching, large loops, image processing, JSON parsing, data transforms)

Short, uncontended locks for trivial reads are usually fine, but long-held or contended locks should go into `spawn_blocking`.

If the command only performs async I/O (network requests, `tokio::fs`, async database drivers), plain `async fn` is sufficient.

## When To Use Each Form

| Command form                        | Use when                                                      |
| ----------------------------------- | ------------------------------------------------------------- |
| `fn foo()`                          | Returns immediately (no locks, no I/O, no computation)        |
| `async fn foo()`                    | Performs real async I/O (network, async file reads, async DB) |
| `async fn foo()` + `spawn_blocking` | Uses locks, sync APIs, or CPU-heavy work                      |

## Examples

### Sync command: blocks the UI

```rust
#[tauri::command]
pub fn get_data(state: State<'_, Arc<Mutex<AppData>>>) -> Result<Vec<DataDto>, String> {
    let locked = state.lock().map_err(|_| "State unavailable".to_string())?;
    return Ok(locked.compute());
}
```

### Async command with spawn_blocking: non-blocking

```rust
#[tauri::command]
pub async fn get_data(state: State<'_, Arc<Mutex<AppData>>>) -> Result<Vec<DataDto>, String> {
    let state = Arc::clone(state.inner()); // or state.arc() if the state type exposes a helper

    return tauri::async_runtime::spawn_blocking(move || {
        let locked = state.lock().map_err(|_| "State unavailable".to_string())?;
        Ok(locked.compute())
    })
    .await
    .map_err(|e| e.to_string())?;
}
```

### Async command without spawn_blocking: true async I/O

```rust
#[tauri::command]
pub async fn fetch_remote_data(url: String) -> Result<String, String> {
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    response.text().await.map_err(|e| e.to_string())
}
```

## Resources & References

- [Tauri: Async Commands](https://tauri.app/develop/calling-rust/#async-commands)
- [Tauri WIP Docs: Inter-Process Communication](https://jonaskruckenberg.github.io/tauri-docs-wip/development/inter-process-communication.html)
- [GitHub Discussion #10329: spawn_blocking vs spawn in commands](https://github.com/tauri-apps/tauri/discussions/10329)
