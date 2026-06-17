use super::intention::IntentionBlockScope;
use std::collections::BTreeSet;

/// Comparable target used by block policy evaluation.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum BlockPolicyTarget {
    App { bundle_id: String },
    Website { hostname: String },
    Device,
}

impl BlockPolicyTarget {
    pub fn app(bundle_id: impl Into<String>) -> Self {
        return Self::App {
            bundle_id: bundle_id.into(),
        };
    }

    pub fn website(hostname: impl Into<String>) -> Self {
        return Self::Website {
            hostname: hostname.into(),
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
                Self::Website { hostname: covering },
                Self::Website {
                    hostname: candidate,
                },
            ) => hostname_matches_target(candidate, covering),
            (Self::Device, Self::Device) => true,
            _ => false,
        };
    }

    pub fn is_blocked_by(
        &self,
        scope: IntentionBlockScope,
        block_targets: &BTreeSet<Self>,
        allow_targets: &BTreeSet<Self>,
    ) -> bool {
        return is_blocked_by_matches(
            scope,
            self.is_covered_by(block_targets),
            self.is_covered_by(allow_targets),
        );
    }

    fn is_covered_by(&self, covering_targets: &BTreeSet<Self>) -> bool {
        return covering_targets
            .iter()
            .any(|covering_target| covering_target.covers(self));
    }
}

fn is_blocked_by_matches(
    scope: IntentionBlockScope,
    matches_block_target: bool,
    matches_allow_target: bool,
) -> bool {
    return match scope {
        IntentionBlockScope::BlockTargets => matches_block_target && !matches_allow_target,
        IntentionBlockScope::AllowTargets => matches_block_target || !matches_allow_target,
        IntentionBlockScope::WholeDevice => true,
    };
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

    #[test]
    fn app_targets_cover_only_exact_app_identity() {
        let target = BlockPolicyTarget::app("com.apple.Terminal");

        assert!(BlockPolicyTarget::app("com.apple.Terminal").covers(&target));
        assert!(!BlockPolicyTarget::app("com.apple.Safari").covers(&target));
        assert!(!BlockPolicyTarget::website("com.apple.Terminal").covers(&target));
        assert!(!BlockPolicyTarget::device().covers(&target));
    }

    #[test]
    fn website_targets_cover_exact_and_subdomain_hosts() {
        let exact = BlockPolicyTarget::website("youtube.com");
        let subdomain = BlockPolicyTarget::website("studio.youtube.com");
        let sibling = BlockPolicyTarget::website("notyoutube.com");

        assert!(BlockPolicyTarget::website("youtube.com").covers(&exact));
        assert!(BlockPolicyTarget::website("youtube.com").covers(&subdomain));
        assert!(!BlockPolicyTarget::website("youtube.com").covers(&sibling));
    }

    #[test]
    fn block_target_scope_lets_allow_exception_win() {
        let mut block_targets = BTreeSet::new();
        block_targets.insert(BlockPolicyTarget::website("youtube.com"));
        let mut allow_targets = BTreeSet::new();
        allow_targets.insert(BlockPolicyTarget::website("studio.youtube.com"));

        assert!(
            !BlockPolicyTarget::website("studio.youtube.com").is_blocked_by(
                IntentionBlockScope::BlockTargets,
                &block_targets,
                &allow_targets,
            )
        );
        assert!(BlockPolicyTarget::website("www.youtube.com").is_blocked_by(
            IntentionBlockScope::BlockTargets,
            &block_targets,
            &allow_targets,
        ));
        assert!(!BlockPolicyTarget::website("google.com").is_blocked_by(
            IntentionBlockScope::BlockTargets,
            &block_targets,
            &allow_targets,
        ));
    }

    #[test]
    fn allow_target_scope_blocks_by_default_and_lets_block_exception_win() {
        let mut block_targets = BTreeSet::new();
        block_targets.insert(BlockPolicyTarget::website("studio.youtube.com"));
        let mut allow_targets = BTreeSet::new();
        allow_targets.insert(BlockPolicyTarget::website("youtube.com"));

        assert!(
            !BlockPolicyTarget::website("www.youtube.com").is_blocked_by(
                IntentionBlockScope::AllowTargets,
                &block_targets,
                &allow_targets,
            )
        );
        assert!(
            BlockPolicyTarget::website("studio.youtube.com").is_blocked_by(
                IntentionBlockScope::AllowTargets,
                &block_targets,
                &allow_targets,
            )
        );
        assert!(BlockPolicyTarget::website("google.com").is_blocked_by(
            IntentionBlockScope::AllowTargets,
            &block_targets,
            &allow_targets,
        ));
    }

    #[test]
    fn whole_device_scope_ignores_target_matches() {
        let targets = BTreeSet::new();

        assert!(BlockPolicyTarget::device().is_blocked_by(
            IntentionBlockScope::WholeDevice,
            &targets,
            &targets,
        ));
        assert!(BlockPolicyTarget::website("example.com").is_blocked_by(
            IntentionBlockScope::WholeDevice,
            &targets,
            &targets,
        ));
        assert!(BlockPolicyTarget::device().covers(&BlockPolicyTarget::device()));
        assert!(!BlockPolicyTarget::device().covers(&BlockPolicyTarget::website("example.com")));
    }
}
