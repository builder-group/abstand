use crate::modules::{
    activity::types::ActivityTarget,
    db::types::DatabaseState,
    intentions::{
        block_policy::{BlockPolicySubject, BlockPolicyTarget},
        condition_timing,
        intention::{
            IntentionBehavior, IntentionBlock, IntentionBlockScope, IntentionBlockTargetAction,
        },
        repository::{
            IntentionRepository, IntentionRepositoryError, IntentionSessionRepository,
            IntentionSessionRepositoryError,
        },
    },
};
use std::{
    collections::{BTreeSet, HashMap, HashSet},
    fmt,
};
use tauri::{AppHandle, Manager};

pub async fn evaluate_active_target(
    app: &AppHandle,
    target: &ActivityTarget,
) -> Result<BlockingPolicyDecision, BlockingPolicyError> {
    let database_state = app.state::<DatabaseState>();

    let active_sessions =
        IntentionSessionRepository::get_active_sessions(&database_state.pool).await?;
    if active_sessions.is_empty() {
        return Ok(BlockingPolicyDecision::Allowed);
    }

    let active_session_by_intention_id = active_sessions
        .into_iter()
        .map(|session| (session.intention_id, session))
        .collect::<HashMap<_, _>>();
    let active_intention_ids = active_session_by_intention_id
        .keys()
        .copied()
        .collect::<HashSet<_>>();
    let intentions = IntentionRepository::get_all(&database_state.pool).await?;
    let active_blocks = intentions
        .into_iter()
        .filter(|intention| active_intention_ids.contains(&intention.id))
        .filter_map(|intention| {
            let session = active_session_by_intention_id.get(&intention.id)?;
            let session_automatic_end_at = condition_timing::automatic_intention_end_at(
                &intention.conditions,
                session.started_at,
            );

            return match intention.behavior {
                IntentionBehavior::Block(block) => Some(ActiveBlockIntention {
                    id: intention.id,
                    name: intention.name,
                    session_id: session.id,
                    session_started_at: session.started_at,
                    session_automatic_end_at,
                    block,
                }),
                IntentionBehavior::Break => None,
            };
        })
        .collect::<Vec<_>>();

    return Ok(evaluate_target(target, &active_blocks));
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BlockingPolicyDecision {
    Allowed,
    Blocked(BlockingPolicyViolation),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BlockingPolicyViolation {
    pub intention_id: i64,
    pub intention_name: String,
    pub session_id: i64,
    pub session_started_at: i64,
    pub session_automatic_end_at: Option<i64>,
    pub blocked_target: BlockPolicyTarget,
}

fn evaluate_target(
    target: &ActivityTarget,
    active_blocks: &[ActiveBlockIntention],
) -> BlockingPolicyDecision {
    // Note: Whole-device blocks represent the broadest active boundary, so they take priority
    // over target-specific app and website blocks
    if let Some(intention) = active_blocks
        .iter()
        .find(|intention| intention.block.scope == IntentionBlockScope::WholeDevice)
    {
        return blocked_decision(intention, BlockPolicyTarget::device());
    }

    for intention in active_blocks {
        if let Some(blocked_target) = blocked_target_for_block(&intention.block, target) {
            return blocked_decision(intention, blocked_target);
        }
    }

    return BlockingPolicyDecision::Allowed;
}

fn blocked_decision(
    intention: &ActiveBlockIntention,
    blocked_target: BlockPolicyTarget,
) -> BlockingPolicyDecision {
    return BlockingPolicyDecision::Blocked(BlockingPolicyViolation {
        intention_id: intention.id,
        intention_name: intention.name.clone(),
        session_id: intention.session_id,
        session_started_at: intention.session_started_at,
        session_automatic_end_at: intention.session_automatic_end_at,
        blocked_target,
    });
}

#[derive(Debug, Clone)]
struct ActiveBlockIntention {
    id: i64,
    name: String,
    session_id: i64,
    session_started_at: i64,
    session_automatic_end_at: Option<i64>,
    block: IntentionBlock,
}

fn blocked_target_for_block(
    block: &IntentionBlock,
    target: &ActivityTarget,
) -> Option<BlockPolicyTarget> {
    let subject = subject_from_activity(target);
    let block_targets = target_set_from_block(block, IntentionBlockTargetAction::Block);
    let allow_targets = target_set_from_block(block, IntentionBlockTargetAction::Allow);

    return subject.blocked_target(block.scope, &block_targets, &allow_targets);
}

fn subject_from_activity(target: &ActivityTarget) -> BlockPolicySubject {
    return match (
        target.app_bundle_id.as_deref(),
        target.website_hostname.as_deref(),
    ) {
        (Some(bundle_id), Some(hostname)) => {
            BlockPolicySubject::app_and_website(bundle_id, hostname)
        }
        (Some(bundle_id), None) => BlockPolicySubject::app(bundle_id),
        (None, Some(hostname)) => BlockPolicySubject::website(hostname),
        (None, None) => BlockPolicySubject::device(),
    };
}

fn target_set_from_block(
    block: &IntentionBlock,
    action: IntentionBlockTargetAction,
) -> BTreeSet<BlockPolicyTarget> {
    return block
        .app_targets
        .iter()
        .filter(|target| target.action == action)
        .filter_map(|target| target.app.bundle_id.as_deref().map(BlockPolicyTarget::app))
        .chain(
            block
                .website_targets
                .iter()
                .filter(|target| target.action == action)
                .map(|target| BlockPolicyTarget::website(target.website.hostname.clone())),
        )
        .collect();
}

#[derive(Debug)]
pub enum BlockingPolicyError {
    IntentionRepository(IntentionRepositoryError),
    IntentionSessionRepository(IntentionSessionRepositoryError),
}

impl fmt::Display for BlockingPolicyError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::IntentionRepository(error) => write!(f, "{}", error),
            Self::IntentionSessionRepository(error) => write!(f, "{}", error),
        };
    }
}

impl std::error::Error for BlockingPolicyError {}

impl From<IntentionRepositoryError> for BlockingPolicyError {
    fn from(value: IntentionRepositoryError) -> Self {
        return Self::IntentionRepository(value);
    }
}

impl From<IntentionSessionRepositoryError> for BlockingPolicyError {
    fn from(value: IntentionSessionRepositoryError) -> Self {
        return Self::IntentionSessionRepository(value);
    }
}

#[cfg(test)]
mod tests {
    use super::{
        evaluate_target, ActiveBlockIntention, BlockPolicyTarget, BlockingPolicyDecision,
        BlockingPolicyViolation, IntentionBlock, IntentionBlockScope,
    };
    use crate::modules::{
        activity::types::ActivityTarget,
        catalog::types::{App, Website},
        intentions::intention::{
            IntentionBlockAppTarget, IntentionBlockTargetAction, IntentionBlockWebsiteTarget,
            IntentionEnforcementMode,
        },
    };

    #[test]
    fn allows_when_no_block_intentions_are_active() {
        let target = website_target("example.com");

        assert_eq!(
            evaluate_target(&target, &[]),
            BlockingPolicyDecision::Allowed
        );
    }

    #[test]
    fn blocks_matching_website_targets() {
        let intention = block_targets_intention(vec![], vec![website("example.com")]);

        assert_eq!(
            evaluate_target(&website_target("example.com"), &[intention]),
            blocked_website_decision(1, "Deep Work".to_string(), "example.com".to_string(),)
        );
    }

    #[test]
    fn blocks_matching_app_targets() {
        let intention = block_targets_intention(vec![app("com.figma.Desktop")], vec![]);

        assert_eq!(
            evaluate_target(&app_target("com.figma.Desktop"), &[intention]),
            blocked_app_decision(1, "Deep Work".to_string(), "com.figma.Desktop".to_string())
        );
    }

    #[test]
    fn app_targets_match_when_activity_also_has_a_website() {
        let intention = block_targets_intention(vec![app("com.apple.Safari")], vec![]);

        assert_eq!(
            evaluate_target(&website_target("example.com"), &[intention]),
            blocked_app_decision(1, "Deep Work".to_string(), "com.apple.Safari".to_string())
        );
    }

    #[test]
    fn allows_unlisted_websites_in_block_target_scope() {
        let intention = block_targets_intention(vec![], vec![website("example.com")]);

        assert_eq!(
            evaluate_target(&website_target("allowed.com"), &[intention]),
            BlockingPolicyDecision::Allowed
        );
    }

    #[test]
    fn allows_website_exception_over_app_base_in_block_target_scope() {
        let intention = ActiveBlockIntention {
            id: 1,
            name: "Deep Work".to_string(),
            session_id: TEST_SESSION_ID,
            session_started_at: TEST_SESSION_STARTED_AT,
            session_automatic_end_at: TEST_SESSION_AUTOMATIC_END_AT,
            block: block(
                IntentionBlockScope::BlockTargets,
                vec![app_target_rule(
                    IntentionBlockTargetAction::Block,
                    app("com.apple.Safari"),
                )],
                vec![website_target_rule(
                    IntentionBlockTargetAction::Allow,
                    website("example.com"),
                )],
            ),
        };

        assert_eq!(
            evaluate_target(&website_target("example.com"), &[intention]),
            BlockingPolicyDecision::Allowed
        );
    }

    #[test]
    fn blocks_unlisted_websites_in_allow_target_scope() {
        let intention = ActiveBlockIntention {
            id: 1,
            name: "Deep Work".to_string(),
            session_id: TEST_SESSION_ID,
            session_started_at: TEST_SESSION_STARTED_AT,
            session_automatic_end_at: TEST_SESSION_AUTOMATIC_END_AT,
            block: block(
                IntentionBlockScope::AllowTargets,
                vec![],
                vec![website_target_rule(
                    IntentionBlockTargetAction::Allow,
                    website("docs.rs"),
                )],
            ),
        };

        assert_eq!(
            evaluate_target(&website_target("example.com"), &[intention]),
            blocked_website_decision(1, "Deep Work".to_string(), "example.com".to_string(),)
        );
    }

    #[test]
    fn blocks_unlisted_apps_in_allow_target_scope() {
        let intention = ActiveBlockIntention {
            id: 1,
            name: "Deep Work".to_string(),
            session_id: TEST_SESSION_ID,
            session_started_at: TEST_SESSION_STARTED_AT,
            session_automatic_end_at: TEST_SESSION_AUTOMATIC_END_AT,
            block: block(
                IntentionBlockScope::AllowTargets,
                vec![app_target_rule(
                    IntentionBlockTargetAction::Allow,
                    app("com.apple.Terminal"),
                )],
                vec![],
            ),
        };

        assert_eq!(
            evaluate_target(&app_target("com.figma.Desktop"), &[intention]),
            blocked_app_decision(1, "Deep Work".to_string(), "com.figma.Desktop".to_string())
        );
    }

    #[test]
    fn allows_listed_websites_in_allow_target_scope() {
        let intention = ActiveBlockIntention {
            id: 1,
            name: "Deep Work".to_string(),
            session_id: TEST_SESSION_ID,
            session_started_at: TEST_SESSION_STARTED_AT,
            session_automatic_end_at: TEST_SESSION_AUTOMATIC_END_AT,
            block: block(
                IntentionBlockScope::AllowTargets,
                vec![],
                vec![website_target_rule(
                    IntentionBlockTargetAction::Allow,
                    website("docs.rs"),
                )],
            ),
        };

        assert_eq!(
            evaluate_target(&website_target("std.docs.rs"), &[intention]),
            BlockingPolicyDecision::Allowed
        );
    }

    #[test]
    fn blocks_website_exception_over_allow_base_in_allow_target_scope() {
        let intention = ActiveBlockIntention {
            id: 1,
            name: "Deep Work".to_string(),
            session_id: TEST_SESSION_ID,
            session_started_at: TEST_SESSION_STARTED_AT,
            session_automatic_end_at: TEST_SESSION_AUTOMATIC_END_AT,
            block: block(
                IntentionBlockScope::AllowTargets,
                vec![],
                vec![
                    website_target_rule(
                        IntentionBlockTargetAction::Allow,
                        website("studio.youtube.com"),
                    ),
                    website_target_rule(IntentionBlockTargetAction::Block, website("youtube.com")),
                ],
            ),
        };

        assert_eq!(
            evaluate_target(&website_target("studio.youtube.com"), &[intention]),
            blocked_website_decision(1, "Deep Work".to_string(), "studio.youtube.com".to_string(),)
        );
    }

    #[test]
    fn blocks_whole_device_targets() {
        let intention = ActiveBlockIntention {
            id: 1,
            name: "Deep Work".to_string(),
            session_id: TEST_SESSION_ID,
            session_started_at: TEST_SESSION_STARTED_AT,
            session_automatic_end_at: TEST_SESSION_AUTOMATIC_END_AT,
            block: block(IntentionBlockScope::WholeDevice, vec![], vec![]),
        };

        assert_eq!(
            evaluate_target(&website_target("example.com"), &[intention]),
            BlockingPolicyDecision::Blocked(BlockingPolicyViolation {
                intention_id: 1,
                intention_name: "Deep Work".to_string(),
                session_id: TEST_SESSION_ID,
                session_started_at: TEST_SESSION_STARTED_AT,
                session_automatic_end_at: TEST_SESSION_AUTOMATIC_END_AT,
                blocked_target: BlockPolicyTarget::device(),
            })
        );
    }

    #[test]
    fn whole_device_block_takes_priority_over_target_block() {
        let target_block = block_targets_intention(vec![app("com.figma.Desktop")], vec![]);
        let whole_device_block = ActiveBlockIntention {
            id: 2,
            name: "Sleep".to_string(),
            session_id: TEST_SESSION_ID,
            session_started_at: TEST_SESSION_STARTED_AT,
            session_automatic_end_at: TEST_SESSION_AUTOMATIC_END_AT,
            block: block(IntentionBlockScope::WholeDevice, vec![], vec![]),
        };

        assert_eq!(
            evaluate_target(
                &app_target("com.figma.Desktop"),
                &[target_block, whole_device_block]
            ),
            BlockingPolicyDecision::Blocked(BlockingPolicyViolation {
                intention_id: 2,
                intention_name: "Sleep".to_string(),
                session_id: TEST_SESSION_ID,
                session_started_at: TEST_SESSION_STARTED_AT,
                session_automatic_end_at: TEST_SESSION_AUTOMATIC_END_AT,
                blocked_target: BlockPolicyTarget::device(),
            })
        );
    }

    fn block_targets_intention(apps: Vec<App>, websites: Vec<Website>) -> ActiveBlockIntention {
        return ActiveBlockIntention {
            id: 1,
            name: "Deep Work".to_string(),
            session_id: TEST_SESSION_ID,
            session_started_at: TEST_SESSION_STARTED_AT,
            session_automatic_end_at: TEST_SESSION_AUTOMATIC_END_AT,
            block: block(
                IntentionBlockScope::BlockTargets,
                apps.into_iter()
                    .map(|app| IntentionBlockAppTarget {
                        action: IntentionBlockTargetAction::Block,
                        app,
                    })
                    .collect(),
                websites
                    .into_iter()
                    .map(|website| IntentionBlockWebsiteTarget {
                        action: IntentionBlockTargetAction::Block,
                        website,
                    })
                    .collect(),
            ),
        };
    }

    fn block(
        scope: IntentionBlockScope,
        app_targets: Vec<IntentionBlockAppTarget>,
        website_targets: Vec<IntentionBlockWebsiteTarget>,
    ) -> IntentionBlock {
        return IntentionBlock {
            enforcement_mode: IntentionEnforcementMode::Balanced,
            balanced_delay_ms: 15_000,
            scope,
            app_targets,
            website_targets,
        };
    }

    fn app_target_rule(action: IntentionBlockTargetAction, app: App) -> IntentionBlockAppTarget {
        return IntentionBlockAppTarget { action, app };
    }

    fn website_target_rule(
        action: IntentionBlockTargetAction,
        website: Website,
    ) -> IntentionBlockWebsiteTarget {
        return IntentionBlockWebsiteTarget { action, website };
    }

    fn website_target(hostname: &str) -> ActivityTarget {
        return ActivityTarget {
            app_bundle_id: Some("com.apple.Safari".to_string()),
            website_hostname: Some(hostname.to_string()),
        };
    }

    fn app_target(bundle_id: &str) -> ActivityTarget {
        return ActivityTarget {
            app_bundle_id: Some(bundle_id.to_string()),
            website_hostname: None,
        };
    }

    fn blocked_app_decision(
        intention_id: i64,
        intention_name: String,
        bundle_id: String,
    ) -> BlockingPolicyDecision {
        return BlockingPolicyDecision::Blocked(BlockingPolicyViolation {
            intention_id,
            intention_name,
            session_id: TEST_SESSION_ID,
            session_started_at: TEST_SESSION_STARTED_AT,
            session_automatic_end_at: TEST_SESSION_AUTOMATIC_END_AT,
            blocked_target: BlockPolicyTarget::app(bundle_id),
        });
    }

    fn blocked_website_decision(
        intention_id: i64,
        intention_name: String,
        hostname: String,
    ) -> BlockingPolicyDecision {
        return BlockingPolicyDecision::Blocked(BlockingPolicyViolation {
            intention_id,
            intention_name,
            session_id: TEST_SESSION_ID,
            session_started_at: TEST_SESSION_STARTED_AT,
            session_automatic_end_at: TEST_SESSION_AUTOMATIC_END_AT,
            blocked_target: BlockPolicyTarget::website(hostname),
        });
    }

    fn website(hostname: &str) -> Website {
        return Website {
            id: 1,
            hostname: hostname.to_string(),
            name: None,
            icon: None,
            color: None,
        };
    }

    fn app(bundle_id: &str) -> App {
        return App {
            id: 1,
            stable_id: bundle_id.to_string(),
            name: None,
            bundle_id: Some(bundle_id.to_string()),
            process_path: None,
            icon: None,
            color: None,
        };
    }

    const TEST_SESSION_ID: i64 = 10;
    const TEST_SESSION_STARTED_AT: i64 = 1_700_000_000_000;
    const TEST_SESSION_AUTOMATIC_END_AT: Option<i64> = Some(1_700_003_600_000);
}
