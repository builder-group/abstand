//! Manages catalog lookup and search.

mod app_identity;
mod assets;
pub mod commands;
mod matcher;
mod predefined;
pub mod repository;
mod search;
pub mod types;

use tauri::{App, Manager};
use types::{CatalogAssetsState, CatalogSearchState};

pub fn setup(app: &App) {
    app.manage(CatalogAssetsState::init());
    app.manage(CatalogSearchState::init());
}
