use super::intention::IntentionConditionTransition;
use crate::common::time::{TimeOnly, WeekdayMask};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScheduledCondition {
    pub intention_id: i64,
    pub transition: IntentionConditionTransition,
    pub condition_id: i64,
    pub session_id: Option<i64>,
    pub rule: ScheduledConditionRule,
}

impl ScheduledCondition {
    pub fn evaluate(&self, now: i64) -> ScheduledConditionEvaluation {
        return match &self.rule {
            ScheduledConditionRule::DateTime { trigger_at } => {
                self.evaluate_date_time(now, *trigger_at)
            }
            ScheduledConditionRule::Schedule { .. } => ScheduledConditionEvaluation::InvalidState(
                "Scheduled recurrence conditions are not supported yet".to_string(),
            ),
            ScheduledConditionRule::AfterTransition { .. } => {
                ScheduledConditionEvaluation::InvalidState(
                    "Scheduled after-transition conditions are not supported yet".to_string(),
                )
            }
        };
    }

    fn evaluate_date_time(&self, now: i64, trigger_at: i64) -> ScheduledConditionEvaluation {
        if trigger_at > now {
            return ScheduledConditionEvaluation::Future {
                wake_at: trigger_at,
            };
        }

        return match self.transition {
            IntentionConditionTransition::Start => ScheduledConditionEvaluation::DueStart {
                intention_id: self.intention_id,
                condition_id: self.condition_id,
                started_at: trigger_at,
            },
            IntentionConditionTransition::End => {
                let Some(session_id) = self.session_id else {
                    return ScheduledConditionEvaluation::InvalidState(
                        "Scheduled end condition is missing an active session".to_string(),
                    );
                };

                ScheduledConditionEvaluation::DueEnd {
                    intention_id: self.intention_id,
                    session_id,
                    condition_id: self.condition_id,
                    ended_at: trigger_at,
                }
            }
        };
    }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn date_time_start_is_future_before_trigger_time() {
        let condition = ScheduledCondition {
            intention_id: 10,
            transition: IntentionConditionTransition::Start,
            condition_id: 20,
            session_id: None,
            rule: ScheduledConditionRule::DateTime { trigger_at: 1_000 },
        };

        let evaluation = condition.evaluate(999);

        assert_eq!(
            evaluation,
            ScheduledConditionEvaluation::Future { wake_at: 1_000 }
        );
    }

    #[test]
    fn date_time_start_is_due_at_trigger_time() {
        let condition = ScheduledCondition {
            intention_id: 10,
            transition: IntentionConditionTransition::Start,
            condition_id: 20,
            session_id: None,
            rule: ScheduledConditionRule::DateTime { trigger_at: 1_000 },
        };

        let evaluation = condition.evaluate(1_000);

        assert_eq!(
            evaluation,
            ScheduledConditionEvaluation::DueStart {
                intention_id: 10,
                condition_id: 20,
                started_at: 1_000,
            }
        );
    }

    #[test]
    fn date_time_start_is_due_after_trigger_time() {
        let condition = ScheduledCondition {
            intention_id: 10,
            transition: IntentionConditionTransition::Start,
            condition_id: 20,
            session_id: None,
            rule: ScheduledConditionRule::DateTime { trigger_at: 1_000 },
        };

        let evaluation = condition.evaluate(1_500);

        assert_eq!(
            evaluation,
            ScheduledConditionEvaluation::DueStart {
                intention_id: 10,
                condition_id: 20,
                started_at: 1_000,
            }
        );
    }

    #[test]
    fn date_time_end_is_due_with_active_session() {
        let condition = ScheduledCondition {
            intention_id: 10,
            transition: IntentionConditionTransition::End,
            condition_id: 20,
            session_id: Some(30),
            rule: ScheduledConditionRule::DateTime { trigger_at: 1_000 },
        };

        let evaluation = condition.evaluate(1_500);

        assert_eq!(
            evaluation,
            ScheduledConditionEvaluation::DueEnd {
                intention_id: 10,
                session_id: 30,
                condition_id: 20,
                ended_at: 1_000,
            }
        );
    }

    #[test]
    fn date_time_end_without_active_session_is_invalid_when_due() {
        let condition = ScheduledCondition {
            intention_id: 10,
            transition: IntentionConditionTransition::End,
            condition_id: 20,
            session_id: None,
            rule: ScheduledConditionRule::DateTime { trigger_at: 1_000 },
        };

        let evaluation = condition.evaluate(1_500);

        assert_eq!(
            evaluation,
            ScheduledConditionEvaluation::InvalidState(
                "Scheduled end condition is missing an active session".to_string()
            )
        );
    }

    #[test]
    fn schedule_rule_is_explicitly_unsupported_for_now() {
        let condition = ScheduledCondition {
            intention_id: 10,
            transition: IntentionConditionTransition::Start,
            condition_id: 20,
            session_id: None,
            rule: ScheduledConditionRule::Schedule {
                time_of_day_ms: TimeOnly::from_millis_since_midnight(9 * 60 * 60 * 1_000).unwrap(),
                weekdays_mask: None,
            },
        };

        let evaluation = condition.evaluate(1_000);

        assert_eq!(
            evaluation,
            ScheduledConditionEvaluation::InvalidState(
                "Scheduled recurrence conditions are not supported yet".to_string()
            )
        );
    }

    #[test]
    fn after_transition_rule_is_explicitly_unsupported_for_now() {
        let condition = ScheduledCondition {
            intention_id: 10,
            transition: IntentionConditionTransition::End,
            condition_id: 20,
            session_id: Some(30),
            rule: ScheduledConditionRule::AfterTransition {
                anchor_transition: IntentionConditionTransition::Start,
                offset_ms: 30 * 60_000,
            },
        };

        let evaluation = condition.evaluate(1_000);

        assert_eq!(
            evaluation,
            ScheduledConditionEvaluation::InvalidState(
                "Scheduled after-transition conditions are not supported yet".to_string()
            )
        );
    }
}
