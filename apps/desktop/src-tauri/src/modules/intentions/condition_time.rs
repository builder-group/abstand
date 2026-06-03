use super::intention::{
    IntentionCondition, IntentionConditionRule, IntentionConditionScheduleRule,
    IntentionConditionTransition,
};
use crate::common::time::{
    local_datetime_from_unix_ms, local_unix_ms_from_date_and_time, WeekdayMask,
};
use chrono::{Datelike, Duration, NaiveDate};

/// Returns the earliest automatic end timestamp for an intention session.
pub fn automatic_intention_end_at(
    conditions: &[IntentionCondition],
    started_at: i64,
) -> Option<i64> {
    return automatic_condition_end_at(
        conditions
            .iter()
            .map(|condition| (&condition.transition, &condition.rule)),
        started_at,
    );
}

/// Returns the earliest automatic end timestamp from condition rules.
pub fn automatic_condition_end_at<'a, I>(conditions: I, started_at: i64) -> Option<i64>
where
    I: IntoIterator<Item = (&'a IntentionConditionTransition, &'a IntentionConditionRule)>,
{
    return conditions
        .into_iter()
        .filter(|(transition, _)| **transition == IntentionConditionTransition::End)
        .filter_map(|(_, rule)| resolve_end_rule_at(rule, started_at))
        .min();
}

fn resolve_end_rule_at(rule: &IntentionConditionRule, started_at: i64) -> Option<i64> {
    return match rule {
        IntentionConditionRule::DateTime(rule) => Some(rule.trigger_at),
        IntentionConditionRule::AfterTransition(rule)
            if rule.anchor_transition == IntentionConditionTransition::Start =>
        {
            Some(started_at + rule.offset_ms)
        }
        IntentionConditionRule::Schedule(rule) => resolve_schedule_end_at(rule, started_at),
        IntentionConditionRule::Manual => None,
        IntentionConditionRule::AfterTransition(_) => None,
    };
}

fn resolve_schedule_end_at(rule: &IntentionConditionScheduleRule, started_at: i64) -> Option<i64> {
    let started_datetime = local_datetime_from_unix_ms(started_at)?;
    let start_date = started_datetime.date_naive();

    for day_offset in 0..SCHEDULE_END_LOOKAHEAD_DAYS {
        let date = start_date + Duration::days(day_offset);
        if !includes_schedule_date(date, rule.weekdays_mask.as_ref()) {
            continue;
        }

        let Some(trigger_at) = local_unix_ms_from_date_and_time(date, &rule.time_of_day_ms) else {
            continue;
        };
        if trigger_at >= started_at {
            return Some(trigger_at);
        }
    }

    return None;
}

const SCHEDULE_END_LOOKAHEAD_DAYS: i64 = 14;

fn includes_schedule_date(date: NaiveDate, weekdays_mask: Option<&WeekdayMask>) -> bool {
    let Some(weekdays_mask) = weekdays_mask else {
        return true;
    };

    return weekdays_mask.contains_weekday(date.weekday());
}
