use crate::{
    environment::{
        configs::{app::AppConfig, db::DbConfig},
        path::get_app_support_dir,
    },
    modules::intentions::{
        intention::IntentionEnforcementMode, repository::IntentionSessionRepository,
    },
};
use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::{error::Error, path::PathBuf};

/// Checks whether the recovery agent should recover the app.
///
/// Note: The recovery agent cannot use Tauri-managed app state, so it opens its own
/// read-only SQLite pool and delegates the session query to the intentions repository.
pub struct RecoveryConditionProbe {
    db_path: PathBuf,
    pool: Option<SqlitePool>,
}

impl RecoveryConditionProbe {
    pub fn new() -> Result<Self, Box<dyn Error>> {
        return Ok(Self {
            db_path: db_path()?,
            pool: None,
        });
    }

    pub async fn should_recover_app(&mut self) -> Result<bool, Box<dyn Error>> {
        if !self.db_path.exists() {
            // Note: The recovery agent can start before the app has created its database
            self.pool = None;
            return Ok(false);
        }

        if self.pool.is_none() {
            let connection_options = SqliteConnectOptions::new()
                .filename(&self.db_path)
                .create_if_missing(false)
                .read_only(true)
                .foreign_keys(true);

            self.pool = Some(SqlitePool::connect_with(connection_options).await?);
        }

        let pool = self
            .pool
            .as_ref()
            .ok_or("recovery condition pool unavailable")?;
        return IntentionSessionRepository::has_active_block_session_with_enforcement(
            pool,
            IntentionEnforcementMode::Strict,
        )
        .await
        .map_err(|error| error.to_string().into());
    }
}

/// Checks the recovery condition from one-off synchronous code.
///
/// Long-lived callers should reuse a `RecoveryConditionProbe` and runtime instead.
pub fn should_recover_app_blocking() -> Result<bool, Box<dyn Error>> {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    let mut probe = RecoveryConditionProbe::new()?;

    return runtime.block_on(probe.should_recover_app());
}

fn db_path() -> Result<PathBuf, Box<dyn Error>> {
    // Resolve the DB through Application Support because Tauri's app data path needs an `AppHandle`
    return Ok(get_app_support_dir(AppConfig::bundle_identifier())?.join(DbConfig::db_name()));
}
