# Tauri Async Commands

How to write Tauri command handlers that do not block the UI.

## Rule

**`async fn` is the default for Tauri commands. Plain `fn` is only acceptable for commands that return immediately with no locks, no I/O, and no computation.**

When the command does blocking or CPU-bound work inside, also wrap that work in `tauri::async_runtime::spawn_blocking`.

## Why

A plain synchronous Tauri command runs on the main thread. While it executes, the webview cannot repaint and React cannot update state. The UI freezes until it returns.

The JavaScript `await invoke(...)` does not prevent this. It only makes the JavaScript side non-blocking. The Rust main thread is still blocked for the entire duration of the command.

`async fn` moves the command off the main thread onto Tauri's async runtime (Tokio). Tokio runs two separate thread pools: a small async pool (roughly one thread per CPU core) for work that yields frequently, like network or async I/O, and a larger blocking pool for work that never yields. If blocking work runs on the async pool it occupies a thread without releasing it, which can stall other commands sharing that thread. `spawn_blocking` routes that work to the blocking pool instead, keeping the async pool free.

## What Counts As Blocking Work

If the command body does any of the following, it needs `spawn_blocking`:

- acquires a `Mutex` or `RwLock`
- reads or writes files using synchronous `std::fs`
- calls macOS or platform APIs that are not async (e.g. icon loading, app enumeration)
- does heavy CPU computation (fuzzy matching over large data sets, image processing, etc.)

If the command only does async I/O (network requests, `tokio::fs`, database queries over an async driver), plain `async fn` without `spawn_blocking` is sufficient.

## When To Use Each Form

| Command form                        | Use when                                                            |
| ----------------------------------- | ------------------------------------------------------------------- |
| `fn foo()`                          | Returns immediately with no locks, no I/O, no computation           |
| `async fn foo()`                    | Does genuinely async I/O (network, async file reads, async DB)      |
| `async fn foo()` + `spawn_blocking` | Acquires locks, calls sync platform APIs, or does heavy computation |

## Examples

### Sync command: blocks the UI

```rust
// Avoid: runs on the main thread, freezes the UI for the duration
#[tauri::command]
pub fn get_data(state: State<'_, Arc<Mutex<AppData>>>) -> Result<Vec<DataDto>, String> {
    let locked = state.lock().map_err(|_| "State unavailable".to_string())?;
    return Ok(locked.compute());
}
```

### Async command with spawn_blocking: does not block

```rust
// Preferred for commands that acquire locks or call sync APIs
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

### Async command without spawn_blocking: for genuinely async I/O

```rust
// Fine when the work is already async end to end
#[tauri::command]
pub async fn fetch_remote_data(url: String) -> Result<String, String> {
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    return response.text().await.map_err(|e| e.to_string());
}
```

## What Not To Do

Do not use `#[tauri::command(async)]` on a plain sync `fn` as a shortcut. It wraps the call in `spawn()` rather than `spawn_blocking()`. Blocking work inside `spawn()` ties up a slot in the async executor thread pool, which is designed for non-blocking tasks and can run out of capacity when blocked.

## Resources & References

- [Tauri: Async Commands](https://tauri.app/develop/calling-rust/#async-commands)
- [Tauri WIP Docs: Inter-Process Communication](https://jonaskruckenberg.github.io/tauri-docs-wip/development/inter-process-communication.html)
- [GitHub Discussion #10329: spawn_blocking vs spawn in commands](https://github.com/tauri-apps/tauri/discussions/10329)
