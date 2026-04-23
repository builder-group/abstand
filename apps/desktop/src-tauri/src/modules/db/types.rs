use super::database::Database;
use std::ops::Deref;
use tauri::App;

// MARK: - State

pub struct DatabaseState(Database);

impl DatabaseState {
    pub fn init(app: &App) -> Result<Self, Box<dyn std::error::Error>> {
        let database = tauri::async_runtime::block_on(Database::new(app))?;
        return Ok(Self(database));
    }
}

impl Deref for DatabaseState {
    type Target = Database;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}
