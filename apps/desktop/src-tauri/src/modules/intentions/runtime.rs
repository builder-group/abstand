use super::{
    intention::{Intention, IntentionConditionRule, IntentionConditionTransition},
    repository::{
        CreateIntentionSessionInput, IntentionRepository, IntentionRepositoryError,
        IntentionSessionRepository, IntentionSessionRepositoryError,
    },
    types::{IntentionRuntimeState, IntentionSessionStartedEvent},
};
use crate::{
    common::time::unix_ms_now,
    modules::{
        db::types::DatabaseState,
        scheduler::{scheduler::ScheduledJobId, types::SchedulerState},
    },
};
use std::{collections::HashMap, fmt, sync::Mutex};
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

pub struct IntentionRuntime {
    scheduled_jobs: Mutex<HashMap<IntentionRuntimeJobKey, ScheduledJobId>>,
}

impl IntentionRuntime {
    pub fn new() -> Self {
        return Self {
            scheduled_jobs: Mutex::new(HashMap::new()),
        };
    }

    pub async fn resync_all(&self, app: &AppHandle) -> Result<(), IntentionRuntimeError> {
        let database = app.state::<DatabaseState>();
        let intentions = IntentionRepository::get_all(&database.pool).await?;
        for intention in intentions {
            self.resync_intention(app, intention.id).await?;
        }

        return Ok(());
    }

    pub async fn resync_intention(
        &self,
        app: &AppHandle,
        intention_id: i64,
    ) -> Result<(), IntentionRuntimeError> {
        self.clear_intention_jobs(app, intention_id);

        let database = app.state::<DatabaseState>();
        let Some(intention) = IntentionRepository::get_by_id(&database.pool, intention_id).await?
        else {
            return Ok(());
        };

        let active_session = IntentionSessionRepository::get_active_session_by_intention_id(
            &database.pool,
            intention_id,
        )
        .await?;
        if active_session.is_none() {
            self.schedule_start_conditions(app, &intention);
        }

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

    fn schedule_start_conditions(&self, app: &AppHandle, intention: &Intention) {
        let now = unix_ms_now();
        for condition in intention
            .conditions
            .iter()
            .filter(|condition| condition.transition == IntentionConditionTransition::Start)
        {
            match &condition.rule {
                IntentionConditionRule::DateTime(rule) => {
                    if rule.trigger_at <= now {
                        continue;
                    }

                    self.schedule_start_condition(app, intention.id, condition.id, rule.trigger_at);
                }
                IntentionConditionRule::Manual => {}
                IntentionConditionRule::Schedule(_) => {}
                IntentionConditionRule::AfterTransition(_) => {}
            }
        }
    }

    fn schedule_start_condition(
        &self,
        app: &AppHandle,
        intention_id: i64,
        condition_id: i64,
        trigger_at: i64,
    ) {
        let scheduler = app.state::<SchedulerState>();
        let scheduled_job_id = scheduler.0.schedule_at_unix_ms(
            format!("intention:{} start:{}", intention_id, condition_id),
            trigger_at,
            move |app| {
                tauri::async_runtime::spawn(async move {
                    let runtime = app.state::<IntentionRuntimeState>();
                    if let Err(error) = runtime
                        .start_intention_session(&app, intention_id, condition_id, trigger_at)
                        .await
                    {
                        eprintln!("Failed to start intention session: {}", error);
                    }
                });
            },
        );

        self.scheduled_jobs.lock().unwrap().insert(
            IntentionRuntimeJobKey::StartCondition {
                intention_id,
                condition_id,
            },
            scheduled_job_id,
        );
    }

    async fn start_intention_session(
        &self,
        app: &AppHandle,
        intention_id: i64,
        condition_id: i64,
        started_at: i64,
    ) -> Result<(), IntentionRuntimeError> {
        let database = app.state::<DatabaseState>();
        if IntentionRepository::get_by_id(&database.pool, intention_id)
            .await?
            .is_none()
        {
            return Ok(());
        }

        let active_session = IntentionSessionRepository::get_active_session_by_intention_id(
            &database.pool,
            intention_id,
        )
        .await?;
        if active_session.is_some() {
            return Ok(());
        }

        let session = IntentionSessionRepository::create_session(
            &database.pool,
            CreateIntentionSessionInput {
                intention_id,
                started_at,
                start_condition_id: Some(condition_id),
            },
        )
        .await?;

        let _ = IntentionSessionStartedEvent {
            intention_id,
            session_id: session.id,
        }
        .emit(app);

        self.resync_intention(app, intention_id).await?;
        return Ok(());
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
