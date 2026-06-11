use crate::modules::{
    activity::types::ActivityTarget,
    db::types::DatabaseState,
    intentions::{
        condition_timing,
        intention::{IntentionBehavior, IntentionBlock, IntentionBlockScope},
        repository::{
            IntentionRepository, IntentionRepositoryError, IntentionSessionRepository,
            IntentionSessionRepositoryError,
        },
    },
};
use std::{
    collections::{HashMap, HashSet},
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
    pub blocked_target: BlockingPolicyTarget,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BlockingPolicyTarget {
    App { bundle_id: String },
    Website { hostname: String },
    Device,
}

fn evaluate_target(
    target: &ActivityTarget,
    active_blocks: &[ActiveBlockIntention],
) -> BlockingPolicyDecision {
    for intention in active_blocks {
        if let Some(blocked_target) = blocked_target_for_block(&intention.block, target) {
            return BlockingPolicyDecision::Blocked(BlockingPolicyViolation {
                intention_id: intention.id,
                intention_name: intention.name.clone(),
                session_id: intention.session_id,
                session_started_at: intention.session_started_at,
                session_automatic_end_at: intention.session_automatic_end_at,
                blocked_target,
            });
        }
    }

    return BlockingPolicyDecision::Allowed;
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
) -> Option<BlockingPolicyTarget> {
    return match block.scope {
        IntentionBlockScope::BlockTargets => {
            matching_app_target(block, target).or_else(|| matching_website_target(block, target))
        }
        IntentionBlockScope::AllowTargets => {
            if matching_app_target(block, target).is_some()
                || matching_website_target(block, target).is_some()
            {
                return None;
            }

            if let Some(hostname) = target.website_hostname.as_deref() {
                return Some(BlockingPolicyTarget::Website {
                    hostname: hostname.to_string(),
                });
            }

            if let Some(bundle_id) = target.app_bundle_id.as_deref() {
                return Some(BlockingPolicyTarget::App {
                    bundle_id: bundle_id.to_string(),
                });
            }

            Some(BlockingPolicyTarget::Device)
        }
        IntentionBlockScope::WholeDevice => Some(BlockingPolicyTarget::Device),
    };
}

fn matching_app_target(
    block: &IntentionBlock,
    target: &ActivityTarget,
) -> Option<BlockingPolicyTarget> {
    let Some(bundle_id) = target.app_bundle_id.as_deref() else {
        return None;
    };

    return block.apps.iter().find_map(|app| {
        if app.bundle_id.as_deref() == Some(bundle_id) {
            return Some(BlockingPolicyTarget::App {
                bundle_id: bundle_id.to_string(),
            });
        }
        return None;
    });
}

fn matching_website_target(
    block: &IntentionBlock,
    target: &ActivityTarget,
) -> Option<BlockingPolicyTarget> {
    let Some(hostname) = target.website_hostname.as_deref() else {
        return None;
    };

    return block.websites.iter().find_map(|website| {
        if hostname_matches_target(hostname, &website.hostname) {
            return Some(BlockingPolicyTarget::Website {
                hostname: hostname.to_string(),
            });
        }
        return None;
    });
}

fn hostname_matches_target(hostname: &str, target_hostname: &str) -> bool {
    return hostname == target_hostname
        || hostname
            .strip_suffix(target_hostname)
            .is_some_and(|prefix| prefix.ends_with('.'));
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
        evaluate_target, ActiveBlockIntention, BlockingPolicyDecision, BlockingPolicyTarget,
        BlockingPolicyViolation, IntentionBlock, IntentionBlockScope,
    };
    use crate::modules::{
        activity::types::ActivityTarget,
        catalog::types::{App, Website},
        intentions::intention::IntentionEnforcementMode,
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
    fn blocks_exact_and_subdomain_website_targets() {
        let intention = block_targets_intention(vec![], vec![website("example.com")]);

        assert_eq!(
            evaluate_target(&website_target("news.example.com"), &[intention]),
            blocked_website_decision(1, "Deep Work".to_string(), "news.example.com".to_string(),)
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
    fn allows_unlisted_websites_in_block_target_scope() {
        let intention = block_targets_intention(vec![], vec![website("example.com")]);

        assert_eq!(
            evaluate_target(&website_target("allowed.com"), &[intention]),
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
                vec![website("docs.rs")],
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
                vec![app("com.apple.Terminal")],
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
                vec![website("docs.rs")],
            ),
        };

        assert_eq!(
            evaluate_target(&website_target("std.docs.rs"), &[intention]),
            BlockingPolicyDecision::Allowed
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
                blocked_target: BlockingPolicyTarget::Device,
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
            block: block(IntentionBlockScope::BlockTargets, apps, websites),
        };
    }

    fn block(scope: IntentionBlockScope, apps: Vec<App>, websites: Vec<Website>) -> IntentionBlock {
        return IntentionBlock {
            enforcement_mode: IntentionEnforcementMode::Balanced,
            scope,
            apps,
            websites,
        };
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
            blocked_target: BlockingPolicyTarget::App { bundle_id },
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
            blocked_target: BlockingPolicyTarget::Website { hostname },
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
