use super::{
    intention::{
        Intention, IntentionBehavior, IntentionBlock, IntentionBlockScope, IntentionCondition,
        IntentionConditionRule, IntentionConditionScheduleRule, IntentionConditionTransition,
        IntentionEnforcementMode,
    },
    repository::{
        IntentionRepository, IntentionSessionRepository, WriteIntentionBehaviorInput,
        WriteIntentionBlockInput, WriteIntentionConditionInput, WriteIntentionInput,
    },
};
use crate::common::time::{
    local_datetime_from_unix_ms, local_unix_ms_from_date_and_time, WeekdayMask,
};
use chrono::{Datelike, Duration, NaiveDate};
use serde::Serialize;
use sqlx::{Pool, Sqlite};
use std::collections::BTreeSet;

pub async fn update_intention_with_policy(
    pool: &Pool<Sqlite>,
    intention_id: i64,
    input: WriteIntentionInput,
) -> Result<Option<Intention>, String> {
    let Some(assessment) = assess_intention_edit_policy(pool, intention_id, &input).await? else {
        return Ok(None);
    };

    match assessment {
        IntentionEditPolicyAssessment::Available => {}
        // Note: Balanced weakening is deliberate UI friction, not backend enforcement.
        // Strict weakening stays blocked here while the frontend owns the delayed confirmation flow.
        IntentionEditPolicyAssessment::Delayed { .. } => {}
        IntentionEditPolicyAssessment::Blocked { reasons } => {
            return Err(format!(
                "Strict Enforcement prevents weakening this active Intention: {}",
                reasons
                    .iter()
                    .map(IntentionWeakeningReason::message)
                    .collect::<Vec<_>>()
                    .join(", ")
            ));
        }
    }

    return IntentionRepository::update(pool, intention_id, input)
        .await
        .map_err(|error| error.to_string());
}

pub async fn assess_intention_edit_policy(
    pool: &Pool<Sqlite>,
    intention_id: i64,
    input: &WriteIntentionInput,
) -> Result<Option<IntentionEditPolicyAssessment>, String> {
    let current = IntentionRepository::get_by_id(pool, intention_id)
        .await
        .map_err(|error| error.to_string())?;
    let Some(current) = current else {
        return Ok(None);
    };

    let active_session =
        IntentionSessionRepository::get_active_session_by_intention_id(pool, intention_id)
            .await
            .map_err(|error| error.to_string())?;
    let active_session_started_at = active_session.as_ref().map(|session| session.started_at);

    return Ok(Some(assess_active_edit_policy(
        &current,
        active_session_started_at,
        input,
    )));
}

// MARK: - Assess

fn assess_active_edit_policy(
    current: &Intention,
    active_session_started_at: Option<i64>,
    proposed: &WriteIntentionInput,
) -> IntentionEditPolicyAssessment {
    let Some(active_session_started_at) = active_session_started_at else {
        return IntentionEditPolicyAssessment::Available;
    };

    let IntentionBehavior::Block(current_block) = &current.behavior else {
        return IntentionEditPolicyAssessment::Available;
    };

    let reasons =
        collect_weakening_reasons(current, current_block, active_session_started_at, proposed);
    if reasons.is_empty() {
        return IntentionEditPolicyAssessment::Available;
    }

    return match current_block.enforcement_mode {
        IntentionEnforcementMode::Casual => IntentionEditPolicyAssessment::Available,
        IntentionEnforcementMode::Balanced => IntentionEditPolicyAssessment::Delayed {
            duration_ms: BALANCED_EDIT_DELAY_MS,
            reasons,
        },
        IntentionEnforcementMode::Strict => IntentionEditPolicyAssessment::Blocked { reasons },
    };
}

const BALANCED_EDIT_DELAY_MS: i64 = 15_000;

fn collect_weakening_reasons(
    current: &Intention,
    current_block: &IntentionBlock,
    active_session_started_at: i64,
    proposed: &WriteIntentionInput,
) -> Vec<IntentionWeakeningReason> {
    let mut reasons = Vec::new();

    if let Some(reason) = active_end_weakening_reason(current, proposed, active_session_started_at)
    {
        reasons.push(reason);
    }

    let WriteIntentionBehaviorInput::Block(proposed_block) = &proposed.behavior;
    if lowers_enforcement(
        current_block.enforcement_mode,
        proposed_block.enforcement_mode,
    ) {
        reasons.push(IntentionWeakeningReason::LowersEnforcement);
    }
    if weakens_block(current_block, proposed_block) {
        reasons.push(IntentionWeakeningReason::WeakensBlock);
    }

    return reasons;
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum IntentionEditPolicyAssessment {
    Available,
    Delayed {
        #[serde(rename = "durationMs")]
        duration_ms: i64,
        reasons: Vec<IntentionWeakeningReason>,
    },
    Blocked {
        reasons: Vec<IntentionWeakeningReason>,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum IntentionWeakeningReason {
    ShortensEnd,
    RemovesAutomaticEnd,
    LowersEnforcement,
    WeakensBlock,
}

impl IntentionWeakeningReason {
    fn message(&self) -> &'static str {
        return match self {
            Self::ShortensEnd => "shortens the end time",
            Self::RemovesAutomaticEnd => "removes the automatic end",
            Self::LowersEnforcement => "lowers enforcement",
            Self::WeakensBlock => "weakens the block",
        };
    }
}

// MARK: - Assess End Conditions

fn active_end_weakening_reason(
    current: &Intention,
    proposed: &WriteIntentionInput,
    started_at: i64,
) -> Option<IntentionWeakeningReason> {
    let current_end_at = automatic_intention_end_at(&current.conditions, started_at);
    let proposed_end_at = automatic_write_end_at(&proposed.conditions, started_at);

    return match (current_end_at, proposed_end_at) {
        (Some(current_end_at), Some(proposed_end_at)) if proposed_end_at < current_end_at => {
            Some(IntentionWeakeningReason::ShortensEnd)
        }
        (Some(_), None) => Some(IntentionWeakeningReason::RemovesAutomaticEnd),
        _ => None,
    };
}

fn automatic_intention_end_at(conditions: &[IntentionCondition], started_at: i64) -> Option<i64> {
    return conditions
        .iter()
        .filter(|condition| condition.transition == IntentionConditionTransition::End)
        .filter_map(|condition| resolve_end_rule_at(&condition.rule, started_at))
        .min();
}

fn automatic_write_end_at(
    conditions: &[WriteIntentionConditionInput],
    started_at: i64,
) -> Option<i64> {
    return conditions
        .iter()
        .filter(|condition| condition.transition == IntentionConditionTransition::End)
        .filter_map(|condition| resolve_end_rule_at(&condition.rule, started_at))
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

// MARK: - Assess Enforcement

fn lowers_enforcement(
    current: IntentionEnforcementMode,
    proposed: IntentionEnforcementMode,
) -> bool {
    return enforcement_rank(proposed) < enforcement_rank(current);
}

fn enforcement_rank(mode: IntentionEnforcementMode) -> u8 {
    return match mode {
        IntentionEnforcementMode::Casual => 0,
        IntentionEnforcementMode::Balanced => 1,
        IntentionEnforcementMode::Strict => 2,
    };
}

// MARK: - Assess Block Strength

fn weakens_block(current: &IntentionBlock, proposed: &WriteIntentionBlockInput) -> bool {
    let current_targets = target_set_from_block(current);
    let proposed_targets = target_set_from_write_block(proposed);

    // Weakening means access that is currently blocked would become available
    return match (current.scope, proposed.scope) {
        (IntentionBlockScope::WholeDevice, IntentionBlockScope::WholeDevice) => false,
        (IntentionBlockScope::WholeDevice, _) => true,
        (_, IntentionBlockScope::WholeDevice) => false,
        (IntentionBlockScope::BlockTargets, IntentionBlockScope::BlockTargets) => {
            let removes_blocked_targets = !current_targets.is_subset(&proposed_targets);
            removes_blocked_targets
        }
        (IntentionBlockScope::AllowTargets, IntentionBlockScope::AllowTargets) => {
            let expands_allowed_targets = !proposed_targets.is_subset(&current_targets);
            expands_allowed_targets
        }
        (IntentionBlockScope::BlockTargets, IntentionBlockScope::AllowTargets) => {
            let allows_currently_blocked_target = current_targets
                .iter()
                .any(|target| proposed_targets.contains(target));
            allows_currently_blocked_target
        }
        (IntentionBlockScope::AllowTargets, IntentionBlockScope::BlockTargets) => true,
    };
}

fn target_set_from_block(block: &IntentionBlock) -> BTreeSet<TargetKey> {
    return block
        .apps
        .iter()
        .map(|app| TargetKey::App(app.stable_id.clone()))
        .chain(
            block
                .websites
                .iter()
                .map(|website| TargetKey::Website(website.hostname.clone())),
        )
        .collect();
}

fn target_set_from_write_block(block: &WriteIntentionBlockInput) -> BTreeSet<TargetKey> {
    return block
        .apps
        .iter()
        .map(|app| TargetKey::App(app.stable_id.clone()))
        .chain(
            block
                .websites
                .iter()
                .map(|website| TargetKey::Website(website.hostname.clone())),
        )
        .collect();
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
enum TargetKey {
    App(String),
    Website(String),
}
