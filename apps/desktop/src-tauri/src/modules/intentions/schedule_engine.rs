use super::{
    intention::IntentionConditionTransition,
    repository::{
        ActiveSessionInfo, IntentionRepository, IntentionRepositoryError,
        IntentionSessionRepository, IntentionSessionRepositoryError,
    },
};
use crate::{
    common::time::{unix_ms_now, TimeOnly, WeekdayMask},
    modules::{
        db::types::DatabaseState,
        scheduler::{scheduler::ScheduledJobId, types::SchedulerState},
    },
};
use sqlx::{Pool, Sqlite};
use std::{fmt, sync::Mutex};
use tauri::{AppHandle, Manager};

// MARK: - Schedule Engine

pub struct ScheduleEngine {
    pending_wakeup: Mutex<Option<ScheduledJobId>>,
}

impl ScheduleEngine {
    pub fn new() -> Self {
        return Self {
            pending_wakeup: Mutex::new(None),
        };
    }

    pub async fn resync(&self, app: &AppHandle) -> Result<(), ScheduleEngineError> {
        let now = unix_ms_now();
        let database = app.state::<DatabaseState>();
        let conditions = IntentionRepository::get_scheduled_conditions(&database.pool)
            .await
            .map_err(ScheduleEngineError::Repository)?;

        let mut next_wake_at: Option<i64> = None;

        for condition in conditions {
            let Some(trigger_at) = condition.resolve_trigger_at(&database.pool, now).await? else {
                continue;
            };

            if trigger_at > now {
                next_wake_at = Some(next_wake_at.map_or(trigger_at, |w| w.min(trigger_at)));
            } else {
                match condition.transition {
                    ScheduledConditionTransition::Start => {
                        // TODO: apply start — create session, emit event
                        let _ = (condition.intention_id, condition.condition_id, trigger_at);
                    }
                    ScheduledConditionTransition::End => {
                        // TODO: apply end — complete session, emit event
                        let _ = (condition.intention_id, condition.condition_id, trigger_at);
                    }
                }
            }
        }

        // Cancel only after a successful reconciliation so a query failure never
        // leaves the engine with no wakeup scheduled.
        self.cancel_pending_wakeup(app);
        if let Some(wake_at) = next_wake_at {
            self.schedule_wakeup(app, wake_at);
        }

        return Ok(());
    }

    fn cancel_pending_wakeup(&self, app: &AppHandle) {
        let job_id = self.pending_wakeup.lock().unwrap().take();
        if let Some(job_id) = job_id {
            let scheduler = app.state::<SchedulerState>();
            scheduler.0.cancel(job_id);
        }
    }

    fn schedule_wakeup(&self, app: &AppHandle, wake_at: i64) {
        let scheduler = app.state::<SchedulerState>();
        let job_id = scheduler.0.schedule_at_unix_ms(
            "intentions:schedule-wakeup".to_string(),
            wake_at,
            move |app| {
                tauri::async_runtime::spawn(async move {
                    // TODO: resolve IntentionRuntimeState and call resync_schedule
                    let _ = app;
                });
            },
        );
        *self.pending_wakeup.lock().unwrap() = Some(job_id);
    }
}

// MARK: - Scheduled Condition

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScheduledCondition {
    pub intention_id: i64,
    pub condition_id: i64,
    pub transition: ScheduledConditionTransition,
    pub rule: ScheduledConditionRule,
}

impl ScheduledCondition {
    pub async fn resolve_trigger_at(
        &self,
        pool: &Pool<Sqlite>,
        now: i64,
    ) -> Result<Option<i64>, ScheduleEngineError> {
        let active_session = IntentionSessionRepository::get_active_session_info_by_intention_id(
            pool,
            self.intention_id,
        )
        .await
        .map_err(ScheduleEngineError::from)?;

        match self.transition {
            ScheduledConditionTransition::Start if active_session.is_some() => return Ok(None),
            ScheduledConditionTransition::End if active_session.is_none() => return Ok(None),
            _ => {}
        }

        return match &self.rule {
            ScheduledConditionRule::DateTime { trigger_at } => {
                if self.is_consumed_one_shot_start(pool).await? {
                    return Ok(None);
                }

                Ok(Some(*trigger_at))
            }
            ScheduledConditionRule::Schedule { .. } => {
                let _ = now;
                // TODO: compute next occurrence from time_of_day_ms + weekdays_mask
                Ok(None)
            }
            ScheduledConditionRule::AfterTransition {
                anchor_transition,
                offset_ms,
            } => {
                if self.is_consumed_one_shot_start(pool).await? {
                    return Ok(None);
                }

                let anchor_at = self.resolve_anchor_at(pool, *anchor_transition, active_session).await?;
                Ok(anchor_at.map(|at| at + offset_ms))
            }
        };
    }

    async fn is_consumed_one_shot_start(
        &self,
        pool: &Pool<Sqlite>,
    ) -> Result<bool, ScheduleEngineError> {
        if self.transition != ScheduledConditionTransition::Start {
            return Ok(false);
        }
        if matches!(self.rule, ScheduledConditionRule::Schedule { .. }) {
            return Ok(false);
        }

        return IntentionSessionRepository::has_session_with_start_condition_id(
            pool,
            self.condition_id,
        )
        .await
        .map_err(ScheduleEngineError::from);
    }

    async fn resolve_anchor_at(
        &self,
        pool: &Pool<Sqlite>,
        anchor_transition: IntentionConditionTransition,
        active_session: Option<ActiveSessionInfo>,
    ) -> Result<Option<i64>, ScheduleEngineError> {
        return match (self.transition, anchor_transition) {
            (ScheduledConditionTransition::End, IntentionConditionTransition::Start) => {
                Ok(active_session.map(|s| s.started_at))
            }
            (ScheduledConditionTransition::Start, IntentionConditionTransition::End) => {
                self.resolve_latest_ended_at(pool).await
            }
            _ => Ok(None),
        };
    }

    async fn resolve_latest_ended_at(
        &self,
        pool: &Pool<Sqlite>,
    ) -> Result<Option<i64>, ScheduleEngineError> {
        return IntentionSessionRepository::get_latest_ended_at_by_intention_id(
            pool,
            self.intention_id,
        )
        .await
        .map_err(ScheduleEngineError::from);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScheduledConditionTransition {
    Start,
    End,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ScheduledConditionRule {
    DateTime {
        trigger_at: i64,
    },
    Schedule {
        time_of_day_ms: TimeOnly,
        weekdays_mask: Option<WeekdayMask>,
    },
    AfterTransition {
        anchor_transition: IntentionConditionTransition,
        offset_ms: i64,
    },
}

// MARK: - Error

#[derive(Debug)]
pub enum ScheduleEngineError {
    Repository(IntentionRepositoryError),
    SessionRepository(IntentionSessionRepositoryError),
}

impl fmt::Display for ScheduleEngineError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::Repository(error) => write!(f, "{}", error),
            Self::SessionRepository(error) => write!(f, "{}", error),
        };
    }
}

impl std::error::Error for ScheduleEngineError {}

impl From<IntentionSessionRepositoryError> for ScheduleEngineError {
    fn from(value: IntentionSessionRepositoryError) -> Self {
        return Self::SessionRepository(value);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::common::time::TimeOnly;
    use sqlx::SqlitePool;

    async fn test_pool() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::query(
            "CREATE TABLE intention_session (
                id INTEGER PRIMARY KEY,
                intention_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                start_condition_id INTEGER,
                ended_at INTEGER
            )",
        )
        .execute(&pool)
        .await
        .unwrap();

        return pool;
    }

    fn start_condition(trigger_at: i64) -> ScheduledCondition {
        ScheduledCondition {
            intention_id: 10,
            condition_id: 20,
            transition: ScheduledConditionTransition::Start,
            rule: ScheduledConditionRule::DateTime { trigger_at },
        }
    }

    fn end_condition(trigger_at: i64) -> ScheduledCondition {
        ScheduledCondition {
            intention_id: 10,
            condition_id: 20,
            transition: ScheduledConditionTransition::End,
            rule: ScheduledConditionRule::DateTime { trigger_at },
        }
    }

    #[tokio::test]
    async fn date_time_start_resolves_to_trigger_at() {
        let pool = test_pool().await;
        let result = start_condition(1_000)
            .resolve_trigger_at(&pool, 0)
            .await
            .unwrap();
        assert_eq!(result, Some(1_000));
    }

    #[tokio::test]
    async fn date_time_end_without_active_session_does_not_resolve() {
        let pool = test_pool().await;
        let result = end_condition(1_000)
            .resolve_trigger_at(&pool, 0)
            .await
            .unwrap();
        assert_eq!(result, None);
    }

    #[tokio::test]
    async fn date_time_start_with_active_session_does_not_resolve() {
        let pool = test_pool().await;
        sqlx::query(
            "INSERT INTO intention_session (id, intention_id, status, started_at) VALUES (1, 10, 'active', 500)",
        )
        .execute(&pool)
        .await
        .unwrap();

        let result = start_condition(1_000)
            .resolve_trigger_at(&pool, 0)
            .await
            .unwrap();
        assert_eq!(result, None);
    }

    #[tokio::test]
    async fn consumed_date_time_start_does_not_resolve() {
        let pool = test_pool().await;
        sqlx::query(
            "INSERT INTO intention_session (id, intention_id, status, started_at, start_condition_id, ended_at) VALUES (1, 10, 'completed', 1_000, 20, 2_000)",
        )
        .execute(&pool)
        .await
        .unwrap();

        let result = start_condition(1_000)
            .resolve_trigger_at(&pool, 0)
            .await
            .unwrap();
        assert_eq!(result, None);
    }

    #[tokio::test]
    async fn date_time_end_with_active_session_resolves_to_trigger_at() {
        let pool = test_pool().await;
        sqlx::query(
            "INSERT INTO intention_session (id, intention_id, status, started_at) VALUES (1, 10, 'active', 500)",
        )
        .execute(&pool)
        .await
        .unwrap();

        let result = end_condition(1_000)
            .resolve_trigger_at(&pool, 0)
            .await
            .unwrap();
        assert_eq!(result, Some(1_000));
    }

    #[tokio::test]
    async fn schedule_rule_is_not_yet_supported() {
        let pool = test_pool().await;
        let condition = ScheduledCondition {
            intention_id: 10,
            condition_id: 20,
            transition: ScheduledConditionTransition::Start,
            rule: ScheduledConditionRule::Schedule {
                time_of_day_ms: TimeOnly::from_millis_since_midnight(9 * 60 * 60 * 1_000).unwrap(),
                weekdays_mask: None,
            },
        };
        assert_eq!(
            condition.resolve_trigger_at(&pool, 1_000).await.unwrap(),
            None
        );
    }

    #[tokio::test]
    async fn after_transition_rule_is_not_yet_supported() {
        let pool = test_pool().await;
        let condition = ScheduledCondition {
            intention_id: 10,
            condition_id: 20,
            transition: ScheduledConditionTransition::End,
            rule: ScheduledConditionRule::AfterTransition {
                anchor_transition: IntentionConditionTransition::Start,
                offset_ms: 30 * 60_000,
            },
        };
        assert_eq!(
            condition.resolve_trigger_at(&pool, 1_000).await.unwrap(),
            None
        );
    }

    #[tokio::test]
    async fn end_after_start_resolves_from_active_session_start() {
        let pool = test_pool().await;
        sqlx::query(
            "INSERT INTO intention_session (id, intention_id, status, started_at) VALUES (1, 10, 'active', 1_000)",
        )
        .execute(&pool)
        .await
        .unwrap();
        let condition = ScheduledCondition {
            intention_id: 10,
            condition_id: 20,
            transition: ScheduledConditionTransition::End,
            rule: ScheduledConditionRule::AfterTransition {
                anchor_transition: IntentionConditionTransition::Start,
                offset_ms: 30 * 60_000,
            },
        };

        assert_eq!(
            condition.resolve_trigger_at(&pool, 1_000).await.unwrap(),
            Some(1_000 + 30 * 60_000)
        );
    }
}
