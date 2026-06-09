use super::types::{BlockedTarget, BlockingDecision, BlockingViolation};
use crate::modules::{
    activity::types::ActivityTarget,
    db::types::DatabaseState,
    intentions::{
        intention::{IntentionBehavior, IntentionBlock, IntentionBlockScope},
        repository::{
            IntentionRepository, IntentionRepositoryError, IntentionSessionRepository,
            IntentionSessionRepositoryError,
        },
    },
};
use std::{collections::HashSet, fmt};
use tauri::{AppHandle, Manager};

pub async fn evaluate_active_target(
    app: &AppHandle,
    target: &ActivityTarget,
) -> Result<BlockingDecision, BlockingPolicyError> {
    let pool = app.state::<DatabaseState>().pool.clone();
    let active_sessions = IntentionSessionRepository::get_active_sessions(&pool).await?;
    if active_sessions.is_empty() {
        return Ok(BlockingDecision::Allowed);
    }

    let active_intention_ids = active_sessions
        .into_iter()
        .map(|session| session.intention_id)
        .collect::<HashSet<_>>();
    let intentions = IntentionRepository::get_all(&pool).await?;
    let active_blocks = intentions
        .into_iter()
        .filter(|intention| active_intention_ids.contains(&intention.id))
        .filter_map(|intention| match intention.behavior {
            IntentionBehavior::Block(block) => Some(ActiveBlockIntention {
                id: intention.id,
                name: intention.name,
                block,
            }),
            IntentionBehavior::Break => None,
        })
        .collect::<Vec<_>>();

    return Ok(evaluate_target(target, &active_blocks));
}

pub fn evaluate_target(
    target: &ActivityTarget,
    active_blocks: &[ActiveBlockIntention],
) -> BlockingDecision {
    for intention in active_blocks {
        if let Some(blocked_target) = blocked_target_for_block(&intention.block, target) {
            return BlockingDecision::Blocked(BlockingViolation {
                intention_id: intention.id,
                intention_name: intention.name.clone(),
                blocked_target,
            });
        }
    }

    return BlockingDecision::Allowed;
}

#[derive(Debug, Clone)]
pub struct ActiveBlockIntention {
    pub id: i64,
    pub name: String,
    pub block: IntentionBlock,
}

fn blocked_target_for_block(
    block: &IntentionBlock,
    target: &ActivityTarget,
) -> Option<BlockedTarget> {
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
                return Some(BlockedTarget::Website {
                    hostname: hostname.to_string(),
                });
            }

            if let Some(bundle_id) = target.app_bundle_id.as_deref() {
                return Some(BlockedTarget::App {
                    bundle_id: bundle_id.to_string(),
                });
            }

            Some(BlockedTarget::Device)
        }
        IntentionBlockScope::WholeDevice => Some(BlockedTarget::Device),
    };
}

fn matching_app_target(block: &IntentionBlock, target: &ActivityTarget) -> Option<BlockedTarget> {
    let Some(bundle_id) = target.app_bundle_id.as_deref() else {
        return None;
    };

    return block.apps.iter().find_map(|app| {
        if app.bundle_id.as_deref() == Some(bundle_id) {
            return Some(BlockedTarget::App {
                bundle_id: bundle_id.to_string(),
            });
        }
        return None;
    });
}

fn matching_website_target(
    block: &IntentionBlock,
    target: &ActivityTarget,
) -> Option<BlockedTarget> {
    let Some(hostname) = target.website_hostname.as_deref() else {
        return None;
    };

    return block.websites.iter().find_map(|website| {
        if hostname_matches_target(hostname, &website.hostname) {
            return Some(BlockedTarget::Website {
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
    use super::{evaluate_target, ActiveBlockIntention, IntentionBlock, IntentionBlockScope};
    use crate::modules::{
        activity::types::ActivityTarget,
        blocking::types::{BlockedTarget, BlockingDecision, BlockingViolation},
        catalog::types::{App, Website},
        intentions::intention::IntentionEnforcementMode,
    };

    #[test]
    fn allows_when_no_block_intentions_are_active() {
        let target = website_target("example.com");

        assert_eq!(evaluate_target(&target, &[]), BlockingDecision::Allowed);
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
            BlockingDecision::Allowed
        );
    }

    #[test]
    fn blocks_unlisted_websites_in_allow_target_scope() {
        let intention = ActiveBlockIntention {
            id: 1,
            name: "Deep Work".to_string(),
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
            block: block(
                IntentionBlockScope::AllowTargets,
                vec![],
                vec![website("docs.rs")],
            ),
        };

        assert_eq!(
            evaluate_target(&website_target("std.docs.rs"), &[intention]),
            BlockingDecision::Allowed
        );
    }

    #[test]
    fn blocks_whole_device_targets() {
        let intention = ActiveBlockIntention {
            id: 1,
            name: "Deep Work".to_string(),
            block: block(IntentionBlockScope::WholeDevice, vec![], vec![]),
        };

        assert_eq!(
            evaluate_target(&website_target("example.com"), &[intention]),
            BlockingDecision::Blocked(BlockingViolation {
                intention_id: 1,
                intention_name: "Deep Work".to_string(),
                blocked_target: BlockedTarget::Device,
            })
        );
    }

    fn block_targets_intention(apps: Vec<App>, websites: Vec<Website>) -> ActiveBlockIntention {
        return ActiveBlockIntention {
            id: 1,
            name: "Deep Work".to_string(),
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
    ) -> BlockingDecision {
        return BlockingDecision::Blocked(BlockingViolation {
            intention_id,
            intention_name,
            blocked_target: BlockedTarget::App { bundle_id },
        });
    }

    fn blocked_website_decision(
        intention_id: i64,
        intention_name: String,
        hostname: String,
    ) -> BlockingDecision {
        return BlockingDecision::Blocked(BlockingViolation {
            intention_id,
            intention_name,
            blocked_target: BlockedTarget::Website { hostname },
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
}
