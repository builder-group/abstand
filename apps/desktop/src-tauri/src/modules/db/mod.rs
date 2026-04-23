//! Manages the SQLite database connection and migrations.

pub mod database;
pub mod types;

use tauri::{App, Manager};

pub fn setup(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    app.manage(types::DatabaseState::init(app)?);
    return Ok(());
}
