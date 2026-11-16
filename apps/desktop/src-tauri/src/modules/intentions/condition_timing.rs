use super::intention::{IntentionCondition, IntentionConditionRule, IntentionConditionTransition};
use crate::common::time::{
    local_datetime_from_unix_ms, local_unix_ms_from_date_and_time, TimeOnly, WeekdayMask,
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
        IntentionConditionRule::Schedule(rule) => {
            next_schedule_trigger_at(NextScheduleTriggerInput {
                time_of_day_ms: &rule.time_of_day_ms,
                weekdays_mask: rule.weekdays_mask.as_ref(),
                search_from: started_at,
                // An end at the same wall-clock time belongs to the next matching day.
                minimum_trigger_at: started_at.saturating_add(1),
            })
        }
        IntentionConditionRule::Manual => None,
        IntentionConditionRule::AfterTransition(_) => None,
    };
}

/// Returns the first matching schedule trigger by scanning up to 14 local days from `search_from`.
pub fn next_schedule_trigger_at(input: NextScheduleTriggerInput<'_>) -> Option<i64> {
    let search_from_datetime = local_datetime_from_unix_ms(input.search_from)?;
    let search_from_date = search_from_datetime.date_naive();

    for day_offset in 0..SCHEDULE_LOOKAHEAD_DAYS {
        let date = search_from_date + Duration::days(day_offset);
        if !includes_schedule_date(date, input.weekdays_mask) {
            continue;
        }

        let Some(trigger_at) = local_unix_ms_from_date_and_time(date, input.time_of_day_ms) else {
            continue;
        };
        if trigger_at < input.minimum_trigger_at {
            continue;
        }

        return Some(trigger_at);
    }

    return None;
}

pub struct NextScheduleTriggerInput<'a> {
    pub time_of_day_ms: &'a TimeOnly,
    pub weekdays_mask: Option<&'a WeekdayMask>,
    pub search_from: i64,
    pub minimum_trigger_at: i64,
}

const SCHEDULE_LOOKAHEAD_DAYS: i64 = 14;

fn includes_schedule_date(date: NaiveDate, weekdays_mask: Option<&WeekdayMask>) -> bool {
    let Some(weekdays_mask) = weekdays_mask else {
        return true;
    };

    return weekdays_mask.contains_weekday(date.weekday());
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::intentions::intention::IntentionConditionScheduleRule;

    #[test]
    fn midnight_end_waits_until_the_following_local_day() {
        let midnight = TimeOnly::from_millis_since_midnight(0).unwrap();
        let date = NaiveDate::from_ymd_opt(2026, 11, 16).unwrap();
        let started_at = local_unix_ms_from_date_and_time(date, &midnight).unwrap();
        let expected_end =
            local_unix_ms_from_date_and_time(date.succ_opt().unwrap(), &midnight).unwrap();

        for weekdays_mask in [
            None,
            Some(WeekdayMask::from_bits(0b111_1111).unwrap()),
            Some(WeekdayMask::from_bits(0b000_0110).unwrap()),
        ] {
            let rule = IntentionConditionRule::Schedule(IntentionConditionScheduleRule {
                time_of_day_ms: midnight.clone(),
                weekdays_mask,
            });

            assert_eq!(resolve_end_rule_at(&rule, started_at), Some(expected_end));
        }
    }

    #[test]
    fn sunday_all_day_block_ends_on_monday() {
        let midnight = TimeOnly::from_millis_since_midnight(0).unwrap();
        let sunday = NaiveDate::from_ymd_opt(2026, 11, 22).unwrap();
        let started_at = local_unix_ms_from_date_and_time(sunday, &midnight).unwrap();
        let rule = IntentionConditionRule::Schedule(IntentionConditionScheduleRule {
            time_of_day_ms: midnight.clone(),
            weekdays_mask: Some(WeekdayMask::from_bits(0b000_0001).unwrap()),
        });

        assert_eq!(
            resolve_end_rule_at(&rule, started_at),
            local_unix_ms_from_date_and_time(sunday.succ_opt().unwrap(), &midnight)
        );
    }
}
