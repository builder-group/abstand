use super::{
    condition_timing,
    intention::IntentionConditionTransition,
    repository::{
        IntentionRepository, IntentionRepositoryError, IntentionSessionRepository,
        IntentionSessionRepositoryError,
    },
};
use crate::common::time::{TimeOnly, WeekdayMask};
use sqlx::{Pool, Sqlite};
use std::fmt;

pub async fn evaluate_timed_conditions(
    pool: &Pool<Sqlite>,
    now: i64,
) -> Result<TimedEvaluation, TimedEvaluationError> {
    let conditions = IntentionRepository::get_timed_conditions(pool)
        .await
        .map_err(TimedEvaluationError::Repository)?;
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
            TimedConditionActivation::Inactive => {}
        }
    }

    return Ok(TimedEvaluation {
        due_conditions,
        next_wake_at,
    });
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TimedEvaluation {
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
    pub created_at: i64,
}

impl TimedCondition {
    pub async fn evaluate_activation(
        &self,
        pool: &Pool<Sqlite>,
        now: i64,
    ) -> Result<TimedConditionActivation, TimedEvaluationError> {
        let active_session_started_at =
            IntentionSessionRepository::get_active_session_started_at_by_intention_id(
                pool,
                self.intention_id,
            )
            .await
            .map_err(TimedEvaluationError::from)?;

        match self.transition {
            TimedConditionTransition::Start if active_session_started_at.is_some() => {
                return Ok(TimedConditionActivation::Inactive);
            }
            TimedConditionTransition::End if active_session_started_at.is_none() => {
                return Ok(TimedConditionActivation::Inactive);
            }
            _ => {}
        }

        return match &self.rule {
            TimedConditionRule::DateTime(rule) => {
                rule.evaluate(self, pool, now, active_session_started_at)
                    .await
            }
            TimedConditionRule::Schedule(rule) => {
                rule.evaluate(self, pool, now, active_session_started_at)
                    .await
            }
            TimedConditionRule::AfterTransition(rule) => {
                rule.evaluate(self, pool, now, active_session_started_at)
                    .await
            }
        };
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
        active_session_started_at: Option<i64>,
    ) -> Result<TimedConditionActivation, TimedEvaluationError> {
        match condition.transition {
            TimedConditionTransition::Start => {
                if self.trigger_at < condition.created_at {
                    return Ok(TimedConditionActivation::Inactive);
                }

                let was_consumed = IntentionSessionRepository::has_session_with_start_condition_id(
                    pool,
                    condition.condition_id,
                )
                .await
                .map_err(TimedEvaluationError::from)?;
                if was_consumed {
                    return Ok(TimedConditionActivation::Inactive);
                }
            }
            TimedConditionTransition::End => {
                if let Some(started_at) = active_session_started_at {
                    let is_before_active_session = self.trigger_at < started_at;
                    let existed_when_session_started = condition.created_at <= started_at;

                    // Note: Ignore stale end times from before this session
                    if is_before_active_session && existed_when_session_started {
                        return Ok(TimedConditionActivation::Inactive);
                    }

                    // Note: Active edits can move the end before the session start, but ended_at cannot be before started_at
                    if is_before_active_session {
                        return Ok(TimedConditionActivation::Due {
                            trigger_at: started_at,
                        });
                    }
                }
            }
        }

        return Ok(TimedConditionActivation::from_trigger_at(
            now,
            self.trigger_at,
        ));
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TimedScheduleRule {
    pub time_of_day_ms: TimeOnly,
    pub weekdays_mask: Option<WeekdayMask>,
}

impl TimedScheduleRule {
    async fn evaluate(
        &self,
        condition: &TimedCondition,
        pool: &Pool<Sqlite>,
        now: i64,
        active_session_started_at: Option<i64>,
    ) -> Result<TimedConditionActivation, TimedEvaluationError> {
        let trigger_at = match condition.transition {
            TimedConditionTransition::Start => {
                self.next_start_trigger_at(condition, pool, now).await?
            }
            TimedConditionTransition::End => {
                let Some(started_at) = active_session_started_at else {
                    return Ok(TimedConditionActivation::Inactive);
                };

                // Note: Search end schedules from the active session start so missed slots are due on reevaluation
                condition_timing::next_schedule_trigger_at(
                    condition_timing::NextScheduleTriggerInput {
                        time_of_day_ms: &self.time_of_day_ms,
                        weekdays_mask: self.weekdays_mask.as_ref(),
                        search_from: started_at,
                        minimum_trigger_at: started_at,
                    },
                )
            }
        };

        let Some(trigger_at) = trigger_at else {
            return Ok(TimedConditionActivation::Inactive);
        };

        return Ok(TimedConditionActivation::from_trigger_at(now, trigger_at));
    }

    async fn next_start_trigger_at(
        &self,
        condition: &TimedCondition,
        pool: &Pool<Sqlite>,
        now: i64,
    ) -> Result<Option<i64>, TimedEvaluationError> {
        let latest_started_at =
            IntentionSessionRepository::get_latest_started_at_by_start_condition_id(
                pool,
                condition.condition_id,
            )
            .await
            .map_err(TimedEvaluationError::from)?;

        return Ok(condition_timing::next_schedule_trigger_at(
            condition_timing::NextScheduleTriggerInput {
                time_of_day_ms: &self.time_of_day_ms,
                weekdays_mask: self.weekdays_mask.as_ref(),
                search_from: now,
                minimum_trigger_at: minimum_start_trigger_at(
                    condition.created_at,
                    latest_started_at,
                ),
            },
        ));
    }
}

fn minimum_start_trigger_at(condition_created_at: i64, latest_started_at: Option<i64>) -> i64 {
    let Some(latest_started_at) = latest_started_at else {
        return condition_created_at;
    };

    return condition_created_at.max(
        // Note: A scheduled start consumes its exact trigger time, so the next search must start 1 ms later
        latest_started_at.saturating_add(1),
    );
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
        active_session_started_at: Option<i64>,
    ) -> Result<TimedConditionActivation, TimedEvaluationError> {
        let anchor = self
            .resolve_anchor_at(condition, pool, active_session_started_at)
            .await?;
        let Some(anchor) = anchor else {
            return Ok(TimedConditionActivation::Inactive);
        };

        let should_ignore_anchor_before_condition = match anchor.source {
            // Note: Active session anchors remain valid even when edits recreate condition rows
            ResolvedAnchorSource::ActiveSessionStart => false,
            ResolvedAnchorSource::LatestCompletedSession => anchor.at < condition.created_at,
        };
        if should_ignore_anchor_before_condition {
            return Ok(TimedConditionActivation::Inactive);
        }

        let trigger_at = anchor.at + self.offset_ms;

        // Skip already-consumed start triggers while still allowing later anchors to fire
        if condition.transition == TimedConditionTransition::Start {
            let latest_started_at =
                IntentionSessionRepository::get_latest_started_at_by_start_condition_id(
                    pool,
                    condition.condition_id,
                )
                .await
                .map_err(TimedEvaluationError::from)?;

            let was_start_trigger_consumed =
                latest_started_at.is_some_and(|started_at| started_at >= trigger_at);
            if was_start_trigger_consumed {
                return Ok(TimedConditionActivation::Inactive);
            }
        }

        return Ok(TimedConditionActivation::from_trigger_at(now, trigger_at));
    }

    async fn resolve_anchor_at(
        &self,
        condition: &TimedCondition,
        pool: &Pool<Sqlite>,
        active_session_started_at: Option<i64>,
    ) -> Result<Option<ResolvedAnchor>, TimedEvaluationError> {
        return match (condition.transition, self.anchor_transition) {
            (TimedConditionTransition::End, IntentionConditionTransition::Start) => {
                Ok(active_session_started_at.map(|at| ResolvedAnchor {
                    at,
                    source: ResolvedAnchorSource::ActiveSessionStart,
                }))
            }
            (TimedConditionTransition::Start, IntentionConditionTransition::End) => {
                let completed_at =
                    IntentionSessionRepository::get_latest_completed_at_by_intention_id(
                        pool,
                        condition.intention_id,
                    )
                    .await
                    .map_err(TimedEvaluationError::from)?;

                Ok(completed_at.map(|at| ResolvedAnchor {
                    at,
                    source: ResolvedAnchorSource::LatestCompletedSession,
                }))
            }
            // Treat unsupported transition-anchor pairs as valid config that cannot trigger here
            _ => Ok(None),
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct ResolvedAnchor {
    at: i64,
    source: ResolvedAnchorSource,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ResolvedAnchorSource {
    ActiveSessionStart,
    LatestCompletedSession,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TimedConditionActivation {
    Due { trigger_at: i64 },
    Future { trigger_at: i64 },
    Inactive,
}

impl TimedConditionActivation {
    fn from_trigger_at(now: i64, trigger_at: i64) -> Self {
        if trigger_at <= now {
            return Self::Due { trigger_at };
        }

        return Self::Future { trigger_at };
    }
}

// MARK: - Error

#[derive(Debug)]
pub enum TimedEvaluationError {
    Repository(IntentionRepositoryError),
    SessionRepository(IntentionSessionRepositoryError),
}

impl fmt::Display for TimedEvaluationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::Repository(error) => write!(f, "{}", error),
            Self::SessionRepository(error) => write!(f, "{}", error),
        };
    }
}

impl std::error::Error for TimedEvaluationError {}

impl From<IntentionSessionRepositoryError> for TimedEvaluationError {
    fn from(value: IntentionSessionRepositoryError) -> Self {
        return Self::SessionRepository(value);
    }
}
