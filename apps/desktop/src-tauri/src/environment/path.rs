use std::{env, error::Error, path::PathBuf};
use tauri::{Manager, Runtime};

/// Returns the app data directory path and creates it if needed.
pub fn get_app_data_dir<R: Runtime, M: Manager<R>>(app: &M) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    return Ok(data_dir);
}

/// Returns the app log directory path and creates it if needed.
pub fn get_app_log_dir<R: Runtime, M: Manager<R>>(app: &M) -> Result<PathBuf, String> {
    let log_dir = app.path().app_log_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;
    return Ok(log_dir);
}

pub fn get_app_support_dir(bundle_identifier: &str) -> Result<PathBuf, Box<dyn Error>> {
    return Ok(get_home_dir()?
        .join("Library")
        .join("Application Support")
        .join(bundle_identifier));
}

pub fn get_user_launch_agents_dir() -> Result<PathBuf, Box<dyn Error>> {
    return Ok(get_home_dir()?.join("Library").join("LaunchAgents"));
}

pub fn get_home_dir() -> Result<PathBuf, Box<dyn Error>> {
    let home = env::var("HOME")?;
    return Ok(PathBuf::from(home));
}
