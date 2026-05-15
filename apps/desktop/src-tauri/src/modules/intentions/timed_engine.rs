use super::{
    intention::IntentionConditionTransition,
    repository::{
        ActiveSessionInfo, IntentionRepository, IntentionRepositoryError,
        IntentionSessionRepository, IntentionSessionRepositoryError,
    },
};
use crate::common::time::{TimeOnly, WeekdayMask};
use sqlx::{Pool, Sqlite};
use std::fmt;

pub struct TimedEngine;

impl TimedEngine {
    pub async fn evaluate(
        pool: &Pool<Sqlite>,
        now: i64,
    ) -> Result<TimedEngineEvaluation, TimedEngineError> {
        let conditions = IntentionRepository::get_timed_conditions(pool)
            .await
            .map_err(TimedEngineError::Repository)?;
        let mut due_conditions = Vec::new();
        let mut next_wake_at: Option<i64> = None;

        for condition in conditions {
            match condition.evaluate_activation(pool, now).await? {
                TimedConditionActivation::Due { trigger_at } => {
                    due_conditions.push(TimedDueCondition {
                        condition,
                        trigger_at,
                    });
                }
                TimedConditionActivation::Future { trigger_at } => {
                    next_wake_at = Some(next_wake_at.map_or(trigger_at, |w| w.min(trigger_at)));
                }
                TimedConditionActivation::Inactive
                | TimedConditionActivation::Unsupported { .. } => {}
            }
        }

        return Ok(TimedEngineEvaluation {
            due_conditions,
            next_wake_at,
        });
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TimedEngineEvaluation {
    pub due_conditions: Vec<TimedDueCondition>,
    pub next_wake_at: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TimedDueCondition {
    pub condition: TimedCondition,
    pub trigger_at: i64,
}

// MARK: - Timed Condition

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TimedCondition {
    pub intention_id: i64,
    pub condition_id: i64,
    pub transition: TimedConditionTransition,
    pub rule: TimedConditionRule,
}

impl TimedCondition {
    pub async fn evaluate_activation(
        &self,
        pool: &Pool<Sqlite>,
        now: i64,
    ) -> Result<TimedConditionActivation, TimedEngineError> {
        let active_session = IntentionSessionRepository::get_active_session_info_by_intention_id(
            pool,
            self.intention_id,
        )
        .await
        .map_err(TimedEngineError::from)?;

        match self.transition {
            TimedConditionTransition::Start if active_session.is_some() => {
                return Ok(TimedConditionActivation::Inactive);
            }
            TimedConditionTransition::End if active_session.is_none() => {
                return Ok(TimedConditionActivation::Inactive);
            }
            _ => {}
        }

        return self
            .rule
            .evaluate(self, pool, now, active_session.as_ref())
            .await;
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TimedConditionTransition {
    Start,
    End,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TimedConditionRule {
    DateTime(TimedDateTimeRule),
    Schedule(TimedScheduleRule),
    AfterTransition(TimedAfterTransitionRule),
}

impl TimedConditionRule {
    async fn evaluate(
        &self,
        condition: &TimedCondition,
        pool: &Pool<Sqlite>,
        now: i64,
        active_session: Option<&ActiveSessionInfo>,
    ) -> Result<TimedConditionActivation, TimedEngineError> {
        return match self {
            Self::DateTime(rule) => rule.evaluate(condition, pool, now).await,
            Self::Schedule(rule) => rule.evaluate(),
            Self::AfterTransition(rule) => {
                rule.evaluate(condition, pool, now, active_session).await
            }
        };
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TimedDateTimeRule {
    pub trigger_at: i64,
}

impl TimedDateTimeRule {
    async fn evaluate(
        &self,
        condition: &TimedCondition,
        pool: &Pool<Sqlite>,
        now: i64,
    ) -> Result<TimedConditionActivation, TimedEngineError> {
        if condition.transition == TimedConditionTransition::Start {
            let was_consumed = IntentionSessionRepository::has_session_with_start_condition_id(
                pool,
                condition.condition_id,
            )
            .await
            .map_err(TimedEngineError::from)?;

            if was_consumed {
                return Ok(TimedConditionActivation::Inactive);
            }
        }

        if self.trigger_at <= now {
            return Ok(TimedConditionActivation::Due {
                trigger_at: self.trigger_at,
            });
        }

        return Ok(TimedConditionActivation::Future {
            trigger_at: self.trigger_at,
        });
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TimedScheduleRule {
    pub time_of_day_ms: TimeOnly,
    pub weekdays_mask: Option<WeekdayMask>,
}

impl TimedScheduleRule {
    fn evaluate(&self) -> Result<TimedConditionActivation, TimedEngineError> {
        return Ok(TimedConditionActivation::Unsupported {
            reason: "schedule rules are not implemented yet",
        });
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TimedAfterTransitionRule {
    pub anchor_transition: IntentionConditionTransition,
    pub offset_ms: i64,
}

impl TimedAfterTransitionRule {
    async fn evaluate(
        &self,
        condition: &TimedCondition,
        pool: &Pool<Sqlite>,
        now: i64,
        active_session: Option<&ActiveSessionInfo>,
    ) -> Result<TimedConditionActivation, TimedEngineError> {
        if condition.transition == TimedConditionTransition::Start {
            let was_consumed = IntentionSessionRepository::has_session_with_start_condition_id(
                pool,
                condition.condition_id,
            )
            .await
            .map_err(TimedEngineError::from)?;

            if was_consumed {
                return Ok(TimedConditionActivation::Inactive);
            }
        }

        let anchor_at = self
            .resolve_anchor_at(condition, pool, active_session)
            .await?;
        let Some(anchor_at) = anchor_at else {
            return Ok(TimedConditionActivation::Inactive);
        };

        let trigger_at = anchor_at + self.offset_ms;
        if trigger_at <= now {
            return Ok(TimedConditionActivation::Due { trigger_at });
        }

        return Ok(TimedConditionActivation::Future { trigger_at });
    }

    async fn resolve_anchor_at(
        &self,
        condition: &TimedCondition,
        pool: &Pool<Sqlite>,
        active_session: Option<&ActiveSessionInfo>,
    ) -> Result<Option<i64>, TimedEngineError> {
        return match (condition.transition, self.anchor_transition) {
            (TimedConditionTransition::End, IntentionConditionTransition::Start) => {
                Ok(active_session.map(|session| session.started_at))
            }
            (TimedConditionTransition::Start, IntentionConditionTransition::End) => {
                IntentionSessionRepository::get_latest_ended_at_by_intention_id(
                    pool,
                    condition.intention_id,
                )
                .await
                .map_err(TimedEngineError::from)
            }
            _ => Ok(None),
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TimedConditionActivation {
    Due { trigger_at: i64 },
    Future { trigger_at: i64 },
    Inactive,
    Unsupported { reason: &'static str },
}

// MARK: - Error

#[derive(Debug)]
pub enum TimedEngineError {
    Repository(IntentionRepositoryError),
    SessionRepository(IntentionSessionRepositoryError),
}

impl fmt::Display for TimedEngineError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::Repository(error) => write!(f, "{}", error),
            Self::SessionRepository(error) => write!(f, "{}", error),
        };
    }
}

impl std::error::Error for TimedEngineError {}

impl From<IntentionSessionRepositoryError> for TimedEngineError {
    fn from(value: IntentionSessionRepositoryError) -> Self {
        return Self::SessionRepository(value);
    }
}
