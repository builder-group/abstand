use super::{
    intention::IntentionConditionTransition,
    repository::{
        IntentionRepository, IntentionRepositoryError, IntentionSessionRepository,
        IntentionSessionRepositoryError,
    },
};
use crate::common::time::{local_datetime_from_unix_ms, TimeOnly, WeekdayMask};
use chrono::{Datelike, Duration, Local, LocalResult, NaiveDate, TimeZone};
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
        // Ignore DateTime rules that were already stale when the condition was created
        if self.trigger_at < condition.created_at {
            return Ok(TimedConditionActivation::Inactive);
        }

        // Ignore end timestamps that belong to a previous session window
        if condition.transition == TimedConditionTransition::End
            && active_session_started_at.is_some_and(|started_at| started_at > self.trigger_at)
        {
            return Ok(TimedConditionActivation::Inactive);
        }

        if condition.transition == TimedConditionTransition::Start {
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
    const LOOKAHEAD_DAYS: i64 = 14;

    async fn evaluate(
        &self,
        condition: &TimedCondition,
        pool: &Pool<Sqlite>,
        now: i64,
        active_session_started_at: Option<i64>,
    ) -> Result<TimedConditionActivation, TimedEvaluationError> {
        let latest_started_at = if condition.transition == TimedConditionTransition::Start {
            IntentionSessionRepository::get_latest_started_at_by_start_condition_id(
                pool,
                condition.condition_id,
            )
            .await
            .map_err(TimedEvaluationError::from)?
        } else {
            None
        };

        // Skip start slots before condition creation and end slots before active session start
        let not_before = match condition.transition {
            TimedConditionTransition::Start => Some(condition.created_at),
            TimedConditionTransition::End => active_session_started_at,
        };

        let Some(trigger_at) = self.next_trigger_at(now, latest_started_at, not_before) else {
            return Ok(TimedConditionActivation::Inactive);
        };

        return Ok(TimedConditionActivation::from_trigger_at(now, trigger_at));
    }

    fn next_trigger_at(
        &self,
        now: i64,
        latest_started_at: Option<i64>,
        not_before: Option<i64>,
    ) -> Option<i64> {
        let now_datetime = local_datetime_from_unix_ms(now)?;
        let today = now_datetime.date_naive();

        for day_offset in 0..Self::LOOKAHEAD_DAYS {
            let date = today + Duration::days(day_offset);
            if !self.includes_date(date) {
                continue;
            }

            let Some(trigger_at) = Self::local_trigger_at(date, &self.time_of_day_ms) else {
                continue;
            };
            if latest_started_at.is_some_and(|started_at| started_at >= trigger_at) {
                continue;
            }
            if not_before.is_some_and(|not_before| trigger_at < not_before) {
                continue;
            }

            return Some(trigger_at);
        }

        return None;
    }

    fn includes_date(&self, date: NaiveDate) -> bool {
        let Some(weekdays_mask) = &self.weekdays_mask else {
            return true;
        };

        return weekdays_mask.contains_weekday(date.weekday());
    }

    fn local_trigger_at(date: NaiveDate, time: &TimeOnly) -> Option<i64> {
        let time = time.to_naive_time();
        let naive_datetime = date.and_time(time);

        return match Local.from_local_datetime(&naive_datetime) {
            LocalResult::Single(datetime) => Some(datetime.timestamp_millis()),
            LocalResult::Ambiguous(earliest, _) => Some(earliest.timestamp_millis()),
            LocalResult::None => None,
        };
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
        active_session_started_at: Option<i64>,
    ) -> Result<TimedConditionActivation, TimedEvaluationError> {
        let anchor_at = self
            .resolve_anchor_at(condition, pool, active_session_started_at)
            .await?;
        let Some(anchor_at) = anchor_at else {
            return Ok(TimedConditionActivation::Inactive);
        };

        // Ignore anchors that fired before the condition existed
        if anchor_at < condition.created_at {
            return Ok(TimedConditionActivation::Inactive);
        }

        let trigger_at = anchor_at + self.offset_ms;

        // Skip already-consumed start triggers while still allowing later anchors to fire
        if condition.transition == TimedConditionTransition::Start {
            let latest_started_at =
                IntentionSessionRepository::get_latest_started_at_by_start_condition_id(
                    pool,
                    condition.condition_id,
                )
                .await
                .map_err(TimedEvaluationError::from)?;

            if latest_started_at.is_some_and(|started_at| started_at >= trigger_at) {
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
    ) -> Result<Option<i64>, TimedEvaluationError> {
        return match (condition.transition, self.anchor_transition) {
            (TimedConditionTransition::End, IntentionConditionTransition::Start) => {
                Ok(active_session_started_at)
            }
            (TimedConditionTransition::Start, IntentionConditionTransition::End) => {
                IntentionSessionRepository::get_latest_completed_at_by_intention_id(
                    pool,
                    condition.intention_id,
                )
                .await
                .map_err(TimedEvaluationError::from)
            }
            // Treat unsupported transition-anchor pairs as valid config that cannot trigger here
            _ => Ok(None),
        };
    }
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
