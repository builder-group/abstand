use crate::environment::{configs::db::DbConfig, path::get_app_data_dir};
use sqlx::{sqlite::SqlitePool, Pool, Sqlite};
use std::ops::Deref;
use tauri::{App, Manager};

pub fn setup(app: &App) {
    app.manage(DatabaseState::init(app));
}

pub struct Database {
    pub pool: Pool<Sqlite>,
}

impl Database {
    pub async fn new(app: &App) -> Result<Self, Box<dyn std::error::Error>> {
        let data_dir_path = get_app_data_dir(app);
        let db_path = data_dir_path.join(DbConfig::db_name());
        let connection_options = sqlx::sqlite::SqliteConnectOptions::new()
            .filename(&db_path)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);

        let pool = SqlitePool::connect_with(connection_options).await?;

        // Embed migrations so packaged builds can upgrade local databases on startup
        sqlx::migrate!("./migrations").run(&pool).await?;

        return Ok(Self { pool });
    }
}

pub struct DatabaseState(Database);

impl DatabaseState {
    pub fn init(app: &App) -> Self {
        let database = tauri::async_runtime::block_on(Database::new(app))
            .expect("Failed to initialize database");
        return Self(database);
    }
}

impl Deref for DatabaseState {
    type Target = Database;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}
