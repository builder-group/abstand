use crate::modules::{
    db::database::{default_app_db_path, Database},
    intentions::{intention::IntentionEnforcementMode, repository::IntentionSessionRepository},
};
use std::{error::Error, path::PathBuf};

/// Checks whether the recovery agent should recover the app.
///
/// Note: The recovery agent cannot use Tauri-managed app state, so it opens its own
/// read-only database connection and delegates the session query to the intentions repository.
pub struct RecoveryConditionProbe {
    db_path: PathBuf,
    database: Option<Database>,
}

impl RecoveryConditionProbe {
    pub fn new() -> Result<Self, Box<dyn Error>> {
        return Ok(Self {
            db_path: default_app_db_path()?,
            database: None,
        });
    }

    pub async fn should_recover_app(&mut self) -> Result<bool, Box<dyn Error>> {
        if !self.db_path.exists() {
            // Note: The recovery agent can start before the app has created its database
            self.database = None;
            return Ok(false);
        }

        if self.database.is_none() {
            self.database = Some(Database::open_read_only(self.db_path.clone()).await?);
        }

        let database = self
            .database
            .as_ref()
            .ok_or("recovery condition database unavailable")?;
        let active_strict_intention_ids =
            IntentionSessionRepository::get_active_block_intention_ids_with_enforcement(
                &database.pool,
                IntentionEnforcementMode::Strict,
            )
            .await
            .map_err(|error| error.to_string())?;
        if !active_strict_intention_ids.is_empty() {
            return Ok(true);
        }

        let active_balanced_intention_ids =
            IntentionSessionRepository::get_active_block_intention_ids_with_enforcement(
                &database.pool,
                IntentionEnforcementMode::Balanced,
            )
            .await
            .map_err(|error| error.to_string())?;
        if !active_balanced_intention_ids.is_empty() {
            return Ok(true);
        }

        return Ok(false);
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
