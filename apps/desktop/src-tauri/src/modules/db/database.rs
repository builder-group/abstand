use crate::environment::{
    configs::{app::AppConfig, db::DbConfig},
    path::{get_app_data_dir, get_app_support_dir},
};
use sqlx::{sqlite::SqlitePool, Pool, Sqlite};
use std::{error::Error, path::PathBuf};
use tauri::App;

pub struct Database {
    pub pool: Pool<Sqlite>,
}

impl Database {
    /// Opens the app database through Tauri-managed app state.
    pub async fn open_for_app(app: &App) -> Result<Self, Box<dyn Error>> {
        let data_dir_path = get_app_data_dir(app)?;
        let db_path = data_dir_path.join(DbConfig::db_name());
        return Self::open_writable(db_path).await;
    }

    /// Opens a writable database, creating it if needed and running migrations.
    pub async fn open_writable(db_path: PathBuf) -> Result<Self, Box<dyn Error>> {
        let connection_options = sqlx::sqlite::SqliteConnectOptions::new()
            .filename(&db_path)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .foreign_keys(true);

        let pool = SqlitePool::connect_with(connection_options).await?;

        // Embed migrations so packaged builds can upgrade local databases on startup
        sqlx::migrate!("./migrations").run(&pool).await?;

        return Ok(Self { pool });
    }

    /// Opens an existing database for reads without creating or migrating it.
    pub async fn open_read_only(db_path: PathBuf) -> Result<Self, Box<dyn Error>> {
        let connection_options = sqlx::sqlite::SqliteConnectOptions::new()
            .filename(&db_path)
            .create_if_missing(false)
            .read_only(true)
            .foreign_keys(true);

        let pool = SqlitePool::connect_with(connection_options).await?;

        return Ok(Self { pool });
    }
}

/// Resolves the app database path before a Tauri `AppHandle` exists.
pub fn default_app_db_path() -> Result<PathBuf, Box<dyn Error>> {
    return Ok(get_app_support_dir(AppConfig::bundle_identifier())?.join(DbConfig::db_name()));
}
