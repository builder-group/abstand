use super::{
    intention::IntentionConditionTransition,
    repository::{IntentionRepository, IntentionRepositoryError},
};
use crate::{
    common::time::{unix_ms_now, TimeOnly, WeekdayMask},
    modules::{
        db::types::DatabaseState,
        scheduler::{scheduler::ScheduledJobId, types::SchedulerState},
    },
};
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
        self.cancel_pending_wakeup(app);

        let now = unix_ms_now();
        let database = app.state::<DatabaseState>();
        let conditions = IntentionRepository::get_scheduled_conditions(&database.pool)
            .await
            .map_err(ScheduleEngineError::Repository)?;

        let mut next_wake_at: Option<i64> = None;

        for condition in conditions {
            match condition.evaluate(now) {
                ScheduledConditionEvaluation::DueStart {
                    intention_id,
                    condition_id,
                    started_at,
                } => {
                    // TODO: apply start — create session, emit event
                    let _ = (intention_id, condition_id, started_at);
                }
                ScheduledConditionEvaluation::DueEnd {
                    intention_id,
                    session_id,
                    condition_id,
                    ended_at,
                } => {
                    // TODO: apply end — complete session, emit event
                    let _ = (intention_id, session_id, condition_id, ended_at);
                }
                ScheduledConditionEvaluation::Future { wake_at } => {
                    next_wake_at = Some(match next_wake_at {
                        Some(current) => current.min(wake_at),
                        None => wake_at,
                    });
                }
                ScheduledConditionEvaluation::InvalidState(message) => {
                    eprintln!("Schedule engine invalid state: {}", message);
                }
            }
        }

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
    pub fn evaluate(&self, now: i64) -> ScheduledConditionEvaluation {
        return match &self.rule {
            ScheduledConditionRule::DateTime { trigger_at } => {
                let trigger_at = *trigger_at;
                if trigger_at > now {
                    return ScheduledConditionEvaluation::Future {
                        wake_at: trigger_at,
                    };
                }

                match &self.transition {
                    ScheduledConditionTransition::Start => ScheduledConditionEvaluation::DueStart {
                        intention_id: self.intention_id,
                        condition_id: self.condition_id,
                        started_at: trigger_at,
                    },
                    ScheduledConditionTransition::End { session_id } => {
                        ScheduledConditionEvaluation::DueEnd {
                            intention_id: self.intention_id,
                            session_id: *session_id,
                            condition_id: self.condition_id,
                            ended_at: trigger_at,
                        }
                    }
                }
            }
            ScheduledConditionRule::Schedule { .. } => ScheduledConditionEvaluation::InvalidState(
                "Recurring schedule conditions are not yet supported".to_string(),
            ),
            ScheduledConditionRule::AfterTransition { .. } => {
                ScheduledConditionEvaluation::InvalidState(
                    "After-transition conditions are not yet supported".to_string(),
                )
            }
        };
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ScheduledConditionTransition {
    Start,
    End { session_id: i64 },
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ScheduledConditionEvaluation {
    DueStart {
        intention_id: i64,
        condition_id: i64,
        started_at: i64,
    },
    DueEnd {
        intention_id: i64,
        session_id: i64,
        condition_id: i64,
        ended_at: i64,
    },
    Future {
        wake_at: i64,
    },
    InvalidState(String),
}

// MARK: - Error

#[derive(Debug)]
pub enum ScheduleEngineError {
    Repository(IntentionRepositoryError),
}

impl fmt::Display for ScheduleEngineError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::Repository(error) => write!(f, "{}", error),
        };
    }
}

impl std::error::Error for ScheduleEngineError {}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::common::time::TimeOnly;

    fn start_condition(trigger_at: i64) -> ScheduledCondition {
        ScheduledCondition {
            intention_id: 10,
            condition_id: 20,
            transition: ScheduledConditionTransition::Start,
            rule: ScheduledConditionRule::DateTime { trigger_at },
        }
    }

    fn end_condition(trigger_at: i64, session_id: i64) -> ScheduledCondition {
        ScheduledCondition {
            intention_id: 10,
            condition_id: 20,
            transition: ScheduledConditionTransition::End { session_id },
            rule: ScheduledConditionRule::DateTime { trigger_at },
        }
    }

    #[test]
    fn date_time_start_is_future_before_trigger_time() {
        let evaluation = start_condition(1_000).evaluate(999);
        assert_eq!(evaluation, ScheduledConditionEvaluation::Future { wake_at: 1_000 });
    }

    #[test]
    fn date_time_start_is_due_at_trigger_time() {
        let evaluation = start_condition(1_000).evaluate(1_000);
        assert_eq!(
            evaluation,
            ScheduledConditionEvaluation::DueStart { intention_id: 10, condition_id: 20, started_at: 1_000 }
        );
    }

    #[test]
    fn date_time_start_is_due_after_trigger_time() {
        let evaluation = start_condition(1_000).evaluate(1_500);
        assert_eq!(
            evaluation,
            ScheduledConditionEvaluation::DueStart { intention_id: 10, condition_id: 20, started_at: 1_000 }
        );
    }

    #[test]
    fn date_time_end_is_due_with_active_session() {
        let evaluation = end_condition(1_000, 30).evaluate(1_500);
        assert_eq!(
            evaluation,
            ScheduledConditionEvaluation::DueEnd { intention_id: 10, session_id: 30, condition_id: 20, ended_at: 1_000 }
        );
    }

    #[test]
    fn schedule_rule_is_explicitly_unsupported_for_now() {
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
            condition.evaluate(1_000),
            ScheduledConditionEvaluation::InvalidState(
                "Recurring schedule conditions are not yet supported".to_string()
            )
        );
    }

    #[test]
    fn after_transition_rule_is_explicitly_unsupported_for_now() {
        let condition = ScheduledCondition {
            intention_id: 10,
            condition_id: 20,
            transition: ScheduledConditionTransition::End { session_id: 30 },
            rule: ScheduledConditionRule::AfterTransition {
                anchor_transition: IntentionConditionTransition::Start,
                offset_ms: 30 * 60_000,
            },
        };
        assert_eq!(
            condition.evaluate(1_000),
            ScheduledConditionEvaluation::InvalidState(
                "After-transition conditions are not yet supported".to_string()
            )
        );
    }
}
