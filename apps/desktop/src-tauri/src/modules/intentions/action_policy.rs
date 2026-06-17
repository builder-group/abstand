use super::{
    condition_timing,
    intention::{
        Intention, IntentionBehavior, IntentionBlock, IntentionBlockScope,
        IntentionBlockTargetAction, IntentionCondition, IntentionConditionRule,
        IntentionConditionTransition, IntentionEnforcementMode,
    },
    repository::{
        IntentionRepository, IntentionSessionRepository, WriteIntentionBehaviorInput,
        WriteIntentionBlockInput, WriteIntentionConditionInput, WriteIntentionInput,
    },
};
use serde::Serialize;
use sqlx::{Pool, Sqlite};
use std::collections::BTreeSet;

pub async fn require_intention_update_allowed(
    pool: &Pool<Sqlite>,
    intention_id: i64,
    input: &WriteIntentionInput,
) -> Result<(), String> {
    let assessment = assess_intention_edit_policy(pool, intention_id, input)
        .await?
        .ok_or_else(|| format!("Intention {} does not exist", intention_id))?;

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

    return Ok(());
}

pub async fn require_intention_delete_allowed(
    pool: &Pool<Sqlite>,
    intention_id: i64,
) -> Result<(), String> {
    let Some(intention) = get_active_block_intention(pool, intention_id).await? else {
        return Ok(());
    };

    if !is_strict_block_intention(&intention) {
        return Ok(());
    }

    return Err("Strict Enforcement prevents deleting this active Intention".to_string());
}

pub async fn require_intention_stop_allowed(
    pool: &Pool<Sqlite>,
    intention_id: i64,
) -> Result<(), String> {
    let Some(intention) = get_active_block_intention(pool, intention_id).await? else {
        return Ok(());
    };

    if !is_strict_block_intention(&intention) {
        return Ok(());
    }

    return Err("Strict Enforcement prevents ending this Intention early".to_string());
}

pub async fn require_intention_complete_allowed(
    pool: &Pool<Sqlite>,
    intention_id: i64,
    end_condition_id: Option<i64>,
) -> Result<(), String> {
    let Some(intention) = get_active_block_intention(pool, intention_id).await? else {
        return Ok(());
    };

    if !is_strict_block_intention(&intention) {
        return Ok(());
    }

    let Some(end_condition_id) = end_condition_id else {
        return Err("Strict Enforcement requires a manual end condition".to_string());
    };
    if has_manual_end_condition(&intention, end_condition_id) {
        return Ok(());
    }

    return Err(
        "Strict Enforcement can only end through its configured manual end condition".to_string(),
    );
}

async fn get_active_block_intention(
    pool: &Pool<Sqlite>,
    intention_id: i64,
) -> Result<Option<Intention>, String> {
    let intention = IntentionRepository::get_by_id(pool, intention_id)
        .await
        .map_err(|error| error.to_string())?;
    let Some(intention) = intention else {
        return Ok(None);
    };

    let active_session =
        IntentionSessionRepository::get_active_session_by_intention_id(pool, intention_id)
            .await
            .map_err(|error| error.to_string())?;
    if active_session.is_none() {
        return Ok(None);
    }

    let IntentionBehavior::Block(_) = &intention.behavior else {
        return Ok(None);
    };

    return Ok(Some(intention));
}

fn is_strict_block_intention(intention: &Intention) -> bool {
    let IntentionBehavior::Block(block) = &intention.behavior else {
        return false;
    };

    return block.enforcement_mode == IntentionEnforcementMode::Strict;
}

fn has_manual_end_condition(intention: &Intention, condition_id: i64) -> bool {
    return intention.conditions.iter().any(|condition| {
        condition.id == condition_id
            && condition.transition == IntentionConditionTransition::End
            && matches!(&condition.rule, IntentionConditionRule::Manual)
    });
}

// MARK: - Assess Edit

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
    return condition_timing::automatic_intention_end_at(conditions, started_at);
}

fn automatic_write_end_at(
    conditions: &[WriteIntentionConditionInput],
    started_at: i64,
) -> Option<i64> {
    return condition_timing::automatic_condition_end_at(
        conditions
            .iter()
            .map(|condition| (&condition.transition, &condition.rule)),
        started_at,
    );
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

// Note: Weakening means access that is currently blocked would become available
fn weakens_block(current: &IntentionBlock, proposed: &WriteIntentionBlockInput) -> bool {
    return match (current.scope, proposed.scope) {
        (IntentionBlockScope::WholeDevice, IntentionBlockScope::WholeDevice) => false,
        (IntentionBlockScope::WholeDevice, _) => true,
        (_, IntentionBlockScope::WholeDevice) => false,
        (IntentionBlockScope::AllowTargets, IntentionBlockScope::BlockTargets) => true,
        _ => {
            let current_block_targets =
                target_set_from_block(current, IntentionBlockTargetAction::Block);
            let current_allow_targets =
                target_set_from_block(current, IntentionBlockTargetAction::Allow);
            let proposed_block_targets =
                target_set_from_write_block(proposed, IntentionBlockTargetAction::Block);
            let proposed_allow_targets =
                target_set_from_write_block(proposed, IntentionBlockTargetAction::Allow);
            let candidate_targets = current_block_targets
                .iter()
                .chain(current_allow_targets.iter())
                .chain(proposed_block_targets.iter())
                .chain(proposed_allow_targets.iter())
                .collect::<BTreeSet<_>>();

            // Compare effective access for each explicit target touched by either policy
            candidate_targets.iter().any(|target| {
                target_is_blocked_by_policy(
                    *target,
                    current.scope,
                    &current_block_targets,
                    &current_allow_targets,
                ) && !target_is_blocked_by_policy(
                    *target,
                    proposed.scope,
                    &proposed_block_targets,
                    &proposed_allow_targets,
                )
            })
        }
    };
}

fn target_set_from_block(
    block: &IntentionBlock,
    action: IntentionBlockTargetAction,
) -> BTreeSet<TargetKey> {
    return block
        .app_targets
        .iter()
        .filter(|target| target.action == action)
        .map(|target| TargetKey::App(target.app.stable_id.clone()))
        .chain(
            block
                .website_targets
                .iter()
                .filter(|target| target.action == action)
                .map(|target| TargetKey::Website(target.website.hostname.clone())),
        )
        .collect();
}

fn target_set_from_write_block(
    block: &WriteIntentionBlockInput,
    action: IntentionBlockTargetAction,
) -> BTreeSet<TargetKey> {
    return block
        .app_targets
        .iter()
        .filter(|target| target.action == action)
        .map(|target| TargetKey::App(target.app.stable_id.clone()))
        .chain(
            block
                .website_targets
                .iter()
                .filter(|target| target.action == action)
                .map(|target| TargetKey::Website(target.website.hostname.clone())),
        )
        .collect();
}

fn target_is_blocked_by_policy(
    target: &TargetKey,
    scope: IntentionBlockScope,
    block_targets: &BTreeSet<TargetKey>,
    allow_targets: &BTreeSet<TargetKey>,
) -> bool {
    return match scope {
        IntentionBlockScope::BlockTargets => {
            !target_is_covered_by_set(target, allow_targets)
                && target_is_covered_by_set(target, block_targets)
        }
        IntentionBlockScope::AllowTargets => {
            target_is_covered_by_set(target, block_targets)
                || !target_is_covered_by_set(target, allow_targets)
        }
        IntentionBlockScope::WholeDevice => true,
    };
}

fn target_is_covered_by_set(target: &TargetKey, covering_targets: &BTreeSet<TargetKey>) -> bool {
    return covering_targets
        .iter()
        .any(|covering_target| covering_target.covers(target));
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
enum TargetKey {
    App(String),
    Website(String),
}

impl TargetKey {
    // Note: A target covers itself. Website coverage also flows from parent domains to subdomains.
    fn covers(&self, target: &TargetKey) -> bool {
        return match (self, target) {
            (Self::App(covering), Self::App(candidate)) => covering == candidate,
            (Self::Website(covering), Self::Website(candidate)) => {
                hostname_matches_target(candidate, covering)
            }
            _ => false,
        };
    }
}

fn hostname_matches_target(hostname: &str, target_hostname: &str) -> bool {
    return hostname == target_hostname
        || hostname
            .strip_suffix(target_hostname)
            .is_some_and(|prefix| prefix.ends_with('.'));
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::{
        catalog::{repository::UpsertWebsiteInput, types::Website},
        intentions::{
            intention::IntentionBlockWebsiteTarget,
            repository::WriteIntentionBlockWebsiteTargetInput,
        },
    };

    #[test]
    fn adding_allow_exception_weakens_block_target_scope() {
        let current = block(
            IntentionBlockScope::BlockTargets,
            vec![website_target(
                IntentionBlockTargetAction::Block,
                "studio.youtube.com",
            )],
        );
        let proposed = write_block(
            IntentionBlockScope::BlockTargets,
            vec![
                write_website_target(IntentionBlockTargetAction::Block, "studio.youtube.com"),
                write_website_target(IntentionBlockTargetAction::Allow, "youtube.com"),
            ],
        );

        assert!(weakens_block(&current, &proposed));
    }

    #[test]
    fn adding_unrelated_allow_exception_does_not_weaken_block_target_scope() {
        let current = block(
            IntentionBlockScope::BlockTargets,
            vec![website_target(
                IntentionBlockTargetAction::Block,
                "youtube.com",
            )],
        );
        let proposed = write_block(
            IntentionBlockScope::BlockTargets,
            vec![
                write_website_target(IntentionBlockTargetAction::Block, "youtube.com"),
                write_website_target(IntentionBlockTargetAction::Allow, "google.com"),
            ],
        );

        assert!(!weakens_block(&current, &proposed));
    }

    #[test]
    fn adding_covered_block_target_does_not_weaken_block_target_scope() {
        let current = block(
            IntentionBlockScope::BlockTargets,
            vec![website_target(
                IntentionBlockTargetAction::Block,
                "youtube.com",
            )],
        );
        let proposed = write_block(
            IntentionBlockScope::BlockTargets,
            vec![
                write_website_target(IntentionBlockTargetAction::Block, "youtube.com"),
                write_website_target(IntentionBlockTargetAction::Block, "studio.youtube.com"),
            ],
        );

        assert!(!weakens_block(&current, &proposed));
    }

    #[test]
    fn removing_covered_block_target_does_not_weaken_block_target_scope() {
        let current = block(
            IntentionBlockScope::BlockTargets,
            vec![
                website_target(IntentionBlockTargetAction::Block, "youtube.com"),
                website_target(IntentionBlockTargetAction::Block, "studio.youtube.com"),
            ],
        );
        let proposed = write_block(
            IntentionBlockScope::BlockTargets,
            vec![write_website_target(
                IntentionBlockTargetAction::Block,
                "youtube.com",
            )],
        );

        assert!(!weakens_block(&current, &proposed));
    }

    #[test]
    fn broader_allow_target_weakens_when_switching_from_block_to_allow_scope() {
        let current = block(
            IntentionBlockScope::BlockTargets,
            vec![website_target(
                IntentionBlockTargetAction::Block,
                "studio.youtube.com",
            )],
        );
        let proposed = write_block(
            IntentionBlockScope::AllowTargets,
            vec![write_website_target(
                IntentionBlockTargetAction::Allow,
                "youtube.com",
            )],
        );

        assert!(weakens_block(&current, &proposed));
    }

    #[test]
    fn adding_block_exception_does_not_weaken_allow_target_scope() {
        let current = block(
            IntentionBlockScope::AllowTargets,
            vec![website_target(
                IntentionBlockTargetAction::Allow,
                "youtube.com",
            )],
        );
        let proposed = write_block(
            IntentionBlockScope::AllowTargets,
            vec![
                write_website_target(IntentionBlockTargetAction::Allow, "youtube.com"),
                write_website_target(IntentionBlockTargetAction::Block, "studio.youtube.com"),
            ],
        );

        assert!(!weakens_block(&current, &proposed));
    }

    #[test]
    fn removing_unrelated_block_exception_does_not_weaken_allow_target_scope() {
        let current = block(
            IntentionBlockScope::AllowTargets,
            vec![
                website_target(IntentionBlockTargetAction::Allow, "youtube.com"),
                website_target(IntentionBlockTargetAction::Block, "google.com"),
            ],
        );
        let proposed = write_block(
            IntentionBlockScope::AllowTargets,
            vec![write_website_target(
                IntentionBlockTargetAction::Allow,
                "youtube.com",
            )],
        );

        assert!(!weakens_block(&current, &proposed));
    }

    #[test]
    fn removing_block_exception_weakens_allow_target_scope() {
        let current = block(
            IntentionBlockScope::AllowTargets,
            vec![
                website_target(IntentionBlockTargetAction::Allow, "studio.youtube.com"),
                website_target(IntentionBlockTargetAction::Block, "youtube.com"),
            ],
        );
        let proposed = write_block(
            IntentionBlockScope::AllowTargets,
            vec![write_website_target(
                IntentionBlockTargetAction::Allow,
                "studio.youtube.com",
            )],
        );

        assert!(weakens_block(&current, &proposed));
    }

    fn block(
        scope: IntentionBlockScope,
        website_targets: Vec<IntentionBlockWebsiteTarget>,
    ) -> IntentionBlock {
        return IntentionBlock {
            enforcement_mode: IntentionEnforcementMode::Balanced,
            scope,
            app_targets: Vec::new(),
            website_targets,
        };
    }

    fn website_target(
        action: IntentionBlockTargetAction,
        hostname: &str,
    ) -> IntentionBlockWebsiteTarget {
        return IntentionBlockWebsiteTarget {
            action,
            website: Website {
                id: 1,
                hostname: hostname.to_string(),
                name: None,
                icon: None,
                color: None,
            },
        };
    }

    fn write_block(
        scope: IntentionBlockScope,
        website_targets: Vec<WriteIntentionBlockWebsiteTargetInput>,
    ) -> WriteIntentionBlockInput {
        return WriteIntentionBlockInput {
            enforcement_mode: IntentionEnforcementMode::Balanced,
            scope,
            app_targets: Vec::new(),
            website_targets,
        };
    }

    fn write_website_target(
        action: IntentionBlockTargetAction,
        hostname: &str,
    ) -> WriteIntentionBlockWebsiteTargetInput {
        return WriteIntentionBlockWebsiteTargetInput {
            action,
            website: UpsertWebsiteInput {
                hostname: hostname.to_string(),
                name: None,
                icon: None,
                color: None,
            },
        };
    }
}
