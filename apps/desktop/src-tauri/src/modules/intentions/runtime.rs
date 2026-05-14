use super::repository::{
    IntentionRepository, IntentionRepositoryError, IntentionSessionRepository,
    IntentionSessionRepositoryError,
};
use crate::modules::{
    db::types::DatabaseState,
    scheduler::{scheduler::ScheduledJobId, types::SchedulerState},
};
use std::{collections::HashMap, fmt, sync::Mutex};
use tauri::{App, AppHandle, Manager};

pub struct IntentionRuntime {
    scheduled_jobs: Mutex<HashMap<IntentionRuntimeJobKey, ScheduledJobId>>,
}

impl IntentionRuntime {
    pub fn new(app: &App) -> Result<Self, IntentionRuntimeError> {
        let runtime = Self {
            scheduled_jobs: Mutex::new(HashMap::new()),
        };

        // Note: blocks intentionally so the runtime is fully synced before the app accepts commands
        tauri::async_runtime::block_on(runtime.resync_all(app.handle()))?;
        return Ok(runtime);
    }

    pub async fn resync_all(&self, app: &AppHandle) -> Result<(), IntentionRuntimeError> {
        let database = app.state::<DatabaseState>();
        let _intentions = IntentionRepository::get_all(&database.pool).await?;
        let _active_sessions =
            IntentionSessionRepository::get_active_sessions(&database.pool).await?;

        return Ok(());
    }

    pub async fn resync_intention(
        &self,
        app: &AppHandle,
        intention_id: i64,
    ) -> Result<(), IntentionRuntimeError> {
        let database = app.state::<DatabaseState>();
        let _intention = IntentionRepository::get_by_id(&database.pool, intention_id).await?;
        let _active_session = IntentionSessionRepository::get_active_session_by_intention_id(
            &database.pool,
            intention_id,
        )
        .await?;

        return Ok(());
    }

    pub fn clear_intention_jobs(&self, app: &AppHandle, intention_id: i64) {
        let scheduled_job_ids = {
            let mut scheduled_jobs = self.scheduled_jobs.lock().unwrap();
            let job_keys = scheduled_jobs
                .keys()
                .copied()
                .filter(|job_key| job_key.intention_id() == intention_id)
                .collect::<Vec<_>>();

            job_keys
                .into_iter()
                .filter_map(|job_key| scheduled_jobs.remove(&job_key))
                .collect::<Vec<_>>()
        };

        let scheduler = app.state::<SchedulerState>();
        for scheduled_job_id in scheduled_job_ids {
            scheduler.0.cancel(scheduled_job_id);
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[allow(dead_code)]
enum IntentionRuntimeJobKey {
    StartCondition {
        intention_id: i64,
        condition_id: i64,
    },
    EndCondition {
        intention_id: i64,
        session_id: i64,
        condition_id: i64,
    },
}

impl IntentionRuntimeJobKey {
    fn intention_id(&self) -> i64 {
        return match self {
            Self::StartCondition { intention_id, .. } => *intention_id,
            Self::EndCondition { intention_id, .. } => *intention_id,
        };
    }
}

#[derive(Debug)]
pub enum IntentionRuntimeError {
    IntentionRepository(IntentionRepositoryError),
    SessionRepository(IntentionSessionRepositoryError),
}

impl fmt::Display for IntentionRuntimeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::IntentionRepository(error) => write!(f, "{}", error),
            Self::SessionRepository(error) => write!(f, "{}", error),
        };
    }
}

impl std::error::Error for IntentionRuntimeError {}

impl From<IntentionRepositoryError> for IntentionRuntimeError {
    fn from(value: IntentionRepositoryError) -> Self {
        return Self::IntentionRepository(value);
    }
}

impl From<IntentionSessionRepositoryError> for IntentionRuntimeError {
    fn from(value: IntentionSessionRepositoryError) -> Self {
        return Self::SessionRepository(value);
    }
}
