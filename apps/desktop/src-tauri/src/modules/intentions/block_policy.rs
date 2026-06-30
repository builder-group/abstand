use super::intention::IntentionBlockScope;
use std::collections::BTreeSet;

/// Subject evaluated against a block policy.
///
/// Browser activity can carry both app and website identities.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BlockPolicySubject {
    app: Option<BlockPolicyTarget>,
    website: Option<BlockPolicyTarget>,
}

impl BlockPolicySubject {
    pub fn app(bundle_id: impl Into<String>) -> Self {
        return Self::from_target(BlockPolicyTarget::app(bundle_id));
    }

    pub fn website(hostname: impl Into<String>, path: Option<String>) -> Self {
        return Self::from_target(BlockPolicyTarget::website(hostname, path));
    }

    pub fn device() -> Self {
        return Self::from_target(BlockPolicyTarget::device());
    }

    pub fn from_target(target: BlockPolicyTarget) -> Self {
        return match target {
            BlockPolicyTarget::App { .. } => Self {
                app: Some(target),
                website: None,
            },
            BlockPolicyTarget::Website { .. } => Self {
                app: None,
                website: Some(target),
            },
            BlockPolicyTarget::Device => Self {
                app: None,
                website: None,
            },
        };
    }

    pub fn app_and_website(
        app_bundle_id: impl Into<String>,
        website_hostname: impl Into<String>,
        website_path: Option<String>,
    ) -> Self {
        return Self {
            app: Some(BlockPolicyTarget::app(app_bundle_id)),
            website: Some(BlockPolicyTarget::website(website_hostname, website_path)),
        };
    }

    pub fn is_blocked_by(
        &self,
        scope: IntentionBlockScope,
        block_targets: &BTreeSet<BlockPolicyTarget>,
        allow_targets: &BTreeSet<BlockPolicyTarget>,
    ) -> bool {
        return self
            .blocked_target(scope, block_targets, allow_targets)
            .is_some();
    }

    pub fn blocked_target(
        &self,
        scope: IntentionBlockScope,
        block_targets: &BTreeSet<BlockPolicyTarget>,
        allow_targets: &BTreeSet<BlockPolicyTarget>,
    ) -> Option<BlockPolicyTarget> {
        let block_match = self.matching_target(block_targets);
        let allow_match = self.matching_target(allow_targets);

        return match scope {
            IntentionBlockScope::WholeDevice => Some(BlockPolicyTarget::device()),
            IntentionBlockScope::BlockTargets if allow_match.is_some() => None,
            IntentionBlockScope::BlockTargets => block_match,
            IntentionBlockScope::AllowTargets if block_match.is_some() => block_match,
            IntentionBlockScope::AllowTargets if allow_match.is_some() => None,
            IntentionBlockScope::AllowTargets => Some(self.most_specific_target()),
        };
    }

    fn matching_target(
        &self,
        covering_targets: &BTreeSet<BlockPolicyTarget>,
    ) -> Option<BlockPolicyTarget> {
        return self
            .app
            .as_ref()
            .filter(|target| target.is_covered_by(covering_targets))
            .cloned()
            .or_else(|| {
                self.website
                    .as_ref()
                    .filter(|target| target.is_covered_by(covering_targets))
                    .cloned()
            });
    }

    fn most_specific_target(&self) -> BlockPolicyTarget {
        return self
            .website
            .clone()
            .or_else(|| self.app.clone())
            .unwrap_or_else(BlockPolicyTarget::device);
    }
}

/// Atomic target identity matched by block policy rules.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum BlockPolicyTarget {
    App {
        bundle_id: String,
    },
    Website {
        hostname: String,
        path: Option<String>,
    },
    Device,
}

impl BlockPolicyTarget {
    pub fn app(bundle_id: impl Into<String>) -> Self {
        return Self::App {
            bundle_id: bundle_id.into(),
        };
    }

    pub fn website(hostname: impl Into<String>, path: Option<String>) -> Self {
        return Self::Website {
            hostname: hostname.into(),
            path,
        };
    }

    pub fn device() -> Self {
        return Self::Device;
    }

    pub fn covers(&self, target: &Self) -> bool {
        return match (self, target) {
            (
                Self::App {
                    bundle_id: covering,
                },
                Self::App {
                    bundle_id: candidate,
                },
            ) => covering == candidate,
            (
                Self::Website {
                    hostname: covering,
                    path: covering_path,
                },
                Self::Website {
                    hostname: candidate,
                    path: candidate_path,
                },
            ) => {
                hostname_matches_target(candidate, covering)
                    && path_matches_target(covering_path.as_deref(), candidate_path.as_deref())
            }
            (Self::Device, Self::Device) => true,
            _ => false,
        };
    }

    fn is_covered_by(&self, covering_targets: &BTreeSet<Self>) -> bool {
        return covering_targets
            .iter()
            .any(|covering_target| covering_target.covers(self));
    }
}

fn hostname_matches_target(hostname: &str, target_hostname: &str) -> bool {
    return hostname == target_hostname
        || hostname
            .strip_suffix(target_hostname)
            .is_some_and(|prefix| prefix.ends_with('.'));
}

fn path_matches_target(covering_path: Option<&str>, candidate_path: Option<&str>) -> bool {
    let Some(covering_path) = covering_path else {
        return true;
    };
    let Some(candidate_path) = candidate_path else {
        return false;
    };

    return candidate_path == covering_path
        || candidate_path
            .strip_prefix(covering_path)
            .is_some_and(|suffix| suffix.starts_with('/'));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_targets_cover_only_exact_app_identity() {
        let target = BlockPolicyTarget::app("com.apple.Terminal");

        assert!(BlockPolicyTarget::app("com.apple.Terminal").covers(&target));
        assert!(!BlockPolicyTarget::app("com.apple.Safari").covers(&target));
        assert!(!BlockPolicyTarget::website("com.apple.Terminal", None).covers(&target));
        assert!(!BlockPolicyTarget::device().covers(&target));
    }

    #[test]
    fn website_targets_cover_exact_and_subdomain_hosts() {
        let exact = BlockPolicyTarget::website("youtube.com", None);
        let subdomain = BlockPolicyTarget::website("studio.youtube.com", None);
        let sibling = BlockPolicyTarget::website("notyoutube.com", None);

        assert!(BlockPolicyTarget::website("youtube.com", None).covers(&exact));
        assert!(BlockPolicyTarget::website("youtube.com", None).covers(&subdomain));
        assert!(!BlockPolicyTarget::website("youtube.com", None).covers(&sibling));
    }

    #[test]
    fn website_targets_cover_matching_paths() {
        let watch_target = BlockPolicyTarget::website("youtube.com", Some("/watch".to_string()));
        let watch = BlockPolicyTarget::website("www.youtube.com", Some("/watch".to_string()));
        let watch_child =
            BlockPolicyTarget::website("www.youtube.com", Some("/watch/abc".to_string()));
        let watching = BlockPolicyTarget::website("www.youtube.com", Some("/watching".to_string()));

        assert!(BlockPolicyTarget::website("youtube.com", None).covers(&watch));
        assert!(watch_target.covers(&watch));
        assert!(watch_target.covers(&watch_child));
        assert!(!watch_target.covers(&watching));
        assert!(!watch_target.covers(&BlockPolicyTarget::website("www.youtube.com", None)));
    }

    #[test]
    fn block_target_scope_lets_allow_exception_win() {
        let mut block_targets = BTreeSet::new();
        block_targets.insert(BlockPolicyTarget::website("youtube.com", None));
        let mut allow_targets = BTreeSet::new();
        allow_targets.insert(BlockPolicyTarget::website("studio.youtube.com", None));

        assert!(
            !BlockPolicySubject::website("studio.youtube.com", None).is_blocked_by(
                IntentionBlockScope::BlockTargets,
                &block_targets,
                &allow_targets,
            )
        );
        assert!(
            BlockPolicySubject::website("www.youtube.com", None).is_blocked_by(
                IntentionBlockScope::BlockTargets,
                &block_targets,
                &allow_targets,
            )
        );
        assert!(
            !BlockPolicySubject::website("google.com", None).is_blocked_by(
                IntentionBlockScope::BlockTargets,
                &block_targets,
                &allow_targets,
            )
        );
    }

    #[test]
    fn block_target_scope_lets_path_exception_win() {
        let mut block_targets = BTreeSet::new();
        block_targets.insert(BlockPolicyTarget::website("youtube.com", None));
        let mut allow_targets = BTreeSet::new();
        allow_targets.insert(BlockPolicyTarget::website(
            "youtube.com",
            Some("/watch".to_string()),
        ));

        assert!(
            !BlockPolicySubject::website("www.youtube.com", Some("/watch".to_string()))
                .is_blocked_by(
                    IntentionBlockScope::BlockTargets,
                    &block_targets,
                    &allow_targets,
                )
        );
        assert!(
            BlockPolicySubject::website("www.youtube.com", Some("/shorts".to_string()))
                .is_blocked_by(
                    IntentionBlockScope::BlockTargets,
                    &block_targets,
                    &allow_targets,
                )
        );
    }

    #[test]
    fn allow_target_scope_respects_path_targets() {
        let block_targets = BTreeSet::new();
        let mut allow_targets = BTreeSet::new();
        allow_targets.insert(BlockPolicyTarget::website(
            "youtube.com",
            Some("/watch".to_string()),
        ));

        assert!(
            !BlockPolicySubject::website("www.youtube.com", Some("/watch/abc".to_string()))
                .is_blocked_by(
                    IntentionBlockScope::AllowTargets,
                    &block_targets,
                    &allow_targets,
                )
        );
        assert!(
            BlockPolicySubject::website("www.youtube.com", Some("/shorts".to_string()))
                .is_blocked_by(
                    IntentionBlockScope::AllowTargets,
                    &block_targets,
                    &allow_targets,
                )
        );
        assert!(
            BlockPolicySubject::website("www.youtube.com", None).is_blocked_by(
                IntentionBlockScope::AllowTargets,
                &block_targets,
                &allow_targets,
            )
        );
    }

    #[test]
    fn allow_target_scope_blocks_by_default_and_lets_block_exception_win() {
        let mut block_targets = BTreeSet::new();
        block_targets.insert(BlockPolicyTarget::website("studio.youtube.com", None));
        let mut allow_targets = BTreeSet::new();
        allow_targets.insert(BlockPolicyTarget::website("youtube.com", None));

        assert!(
            !BlockPolicySubject::website("www.youtube.com", None).is_blocked_by(
                IntentionBlockScope::AllowTargets,
                &block_targets,
                &allow_targets,
            )
        );
        assert!(
            BlockPolicySubject::website("studio.youtube.com", None).is_blocked_by(
                IntentionBlockScope::AllowTargets,
                &block_targets,
                &allow_targets,
            )
        );
        assert!(
            BlockPolicySubject::website("google.com", None).is_blocked_by(
                IntentionBlockScope::AllowTargets,
                &block_targets,
                &allow_targets,
            )
        );
    }

    #[test]
    fn subject_lets_website_exception_override_app_base() {
        let mut block_targets = BTreeSet::new();
        block_targets.insert(BlockPolicyTarget::app("com.apple.Safari"));
        let mut allow_targets = BTreeSet::new();
        allow_targets.insert(BlockPolicyTarget::website("example.com", None));
        let subject = BlockPolicySubject::app_and_website("com.apple.Safari", "example.com", None);

        assert!(!subject.is_blocked_by(
            IntentionBlockScope::BlockTargets,
            &block_targets,
            &allow_targets,
        ));
    }

    #[test]
    fn subject_lets_website_exception_override_app_allow_base() {
        let mut block_targets = BTreeSet::new();
        block_targets.insert(BlockPolicyTarget::website("example.com", None));
        let mut allow_targets = BTreeSet::new();
        allow_targets.insert(BlockPolicyTarget::app("com.apple.Safari"));
        let subject = BlockPolicySubject::app_and_website("com.apple.Safari", "example.com", None);

        assert!(subject.is_blocked_by(
            IntentionBlockScope::AllowTargets,
            &block_targets,
            &allow_targets,
        ));
    }

    #[test]
    fn whole_device_scope_ignores_target_matches() {
        let targets = BTreeSet::new();

        assert!(BlockPolicySubject::device().is_blocked_by(
            IntentionBlockScope::WholeDevice,
            &targets,
            &targets,
        ));
        assert!(
            BlockPolicySubject::website("example.com", None).is_blocked_by(
                IntentionBlockScope::WholeDevice,
                &targets,
                &targets,
            )
        );
        assert!(BlockPolicyTarget::device().covers(&BlockPolicyTarget::device()));
        assert!(
            !BlockPolicyTarget::device().covers(&BlockPolicyTarget::website("example.com", None,))
        );
    }
}
