use std::path::PathBuf;
use tauri::{Manager, Runtime};

/// Returns the app data directory path and creates it if needed.
pub fn get_app_data_dir<R: Runtime, M: Manager<R>>(app: &M) -> PathBuf {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");

    std::fs::create_dir_all(&data_dir).unwrap_or_else(|error| {
        panic!(
            "Failed to create app data directory at {}: {}",
            data_dir.display(),
            error
        )
    });

    return data_dir;
}
