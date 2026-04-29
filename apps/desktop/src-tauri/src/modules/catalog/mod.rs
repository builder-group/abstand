//! Manages catalog lookup and search.

mod app_id;
pub mod commands;
mod matcher;
mod predefined;
pub mod repository;
mod search;
pub mod types;

use tauri::{App, Manager};
use types::CatalogSearchState;

pub fn setup(app: &App) {
    app.manage(CatalogSearchState::init());
}
