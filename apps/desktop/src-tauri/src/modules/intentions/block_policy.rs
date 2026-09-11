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
        if scope == IntentionBlockScope::WholeDevice {
            return Some(BlockPolicyTarget::device());
        }

        // Note: Keep app and website decisions separate so allowing a browser does not
        // implicitly allow every website opened in it
        let target_is_blocked = |target: &&BlockPolicyTarget| {
            let matches_block = target.is_covered_by(block_targets);
            let matches_allow = target.is_covered_by(allow_targets);

            return match scope {
                IntentionBlockScope::BlockTargets => matches_block && !matches_allow,
                IntentionBlockScope::AllowTargets => matches_block || !matches_allow,
                IntentionBlockScope::WholeDevice => unreachable!(),
            };
        };

        let blocked_target = self
            .app
            .as_ref()
            .filter(target_is_blocked)
            .cloned()
            .or_else(|| self.website.as_ref().filter(target_is_blocked).cloned());
        if blocked_target.is_some() {
            return blocked_target;
        }

        // Note: Allow selected fails closed when no app or website identity is available
        if scope == IntentionBlockScope::AllowTargets
            && self.app.is_none()
            && self.website.is_none()
        {
            return Some(BlockPolicyTarget::device());
        }

        return None;
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
    return WebsitePathRule::from_path(covering_path).matches(candidate_path);
}

enum WebsitePathRule<'a> {
    Any,
    Prefix(&'a str),
    Wildcard(&'a str),
}

impl<'a> WebsitePathRule<'a> {
    fn from_path(path: Option<&'a str>) -> Self {
        let Some(path) = path else {
            return Self::Any;
        };

        if path.contains('*') {
            return Self::Wildcard(path);
        }

        return Self::Prefix(path);
    }

    fn matches(&self, candidate_path: Option<&str>) -> bool {
        return match self {
            Self::Any => true,
            Self::Prefix(path) => candidate_path
                .is_some_and(|candidate_path| path_prefix_matches_target(path, candidate_path)),
            Self::Wildcard(pattern) => candidate_path.is_some_and(|candidate_path| {
                path_wildcard_matches_target(pattern, candidate_path)
            }),
        };
    }
}

fn path_prefix_matches_target(covering_path: &str, candidate_path: &str) -> bool {
    return candidate_path == covering_path
        || candidate_path
            .strip_prefix(covering_path)
            .is_some_and(|suffix| suffix.starts_with('/'));
}

fn path_wildcard_matches_target(covering_path: &str, candidate_path: &str) -> bool {
    let covering_segments = path_segments(covering_path);
    let candidate_segments = path_segments(candidate_path);
    if covering_segments.len() > candidate_segments.len() {
        return false;
    }

    return covering_segments.iter().zip(candidate_segments.iter()).all(
        |(covering_segment, candidate_segment)| {
            path_segment_matches_pattern(covering_segment, candidate_segment)
        },
    );
}

fn path_segments(path: &str) -> Vec<&str> {
    return path.trim_start_matches('/').split('/').collect();
}

fn path_segment_matches_pattern(pattern: &str, value: &str) -> bool {
    if !pattern.contains('*') {
        return pattern == value;
    }

    let mut parts = pattern
        .split('*')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    if parts.is_empty() {
        return true;
    }

    let starts_with_wildcard = pattern.starts_with('*');
    let ends_with_wildcard = pattern.ends_with('*');
    let mut remaining = value;

    let search_parts = if starts_with_wildcard {
        parts.as_slice()
    } else {
        let first_part = parts.remove(0);
        let Some(next_remaining) = remaining.strip_prefix(first_part) else {
            return false;
        };
        remaining = next_remaining;
        parts.as_slice()
    };

    let middle_part_count = if ends_with_wildcard {
        search_parts.len()
    } else {
        search_parts.len().saturating_sub(1)
    };
    for part in &search_parts[..middle_part_count] {
        let Some(part_start) = remaining.find(part) else {
            return false;
        };
        remaining = &remaining[part_start + part.len()..];
    }

    if ends_with_wildcard {
        return true;
    }

    let Some(last_part) = search_parts.last() else {
        return remaining.is_empty();
    };
    return remaining.ends_with(last_part);
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
    fn website_targets_cover_path_wildcards_within_segments() {
        let team_target = BlockPolicyTarget::website("example.com", Some("/team-*".to_string()));
        let team = BlockPolicyTarget::website("app.example.com", Some("/team-alpha".to_string()));
        let team_child =
            BlockPolicyTarget::website("app.example.com", Some("/team-alpha/members".to_string()));
        let dashboard =
            BlockPolicyTarget::website("app.example.com", Some("/dashboard".to_string()));

        assert!(team_target.covers(&team));
        assert!(team_target.covers(&team_child));
        assert!(!team_target.covers(&dashboard));
    }

    #[test]
    fn website_targets_cover_path_wildcard_middle_segments() {
        let reports_target =
            BlockPolicyTarget::website("example.com", Some("/*/reports".to_string()));
        let reports =
            BlockPolicyTarget::website("app.example.com", Some("/finance/reports".to_string()));
        let reports_child = BlockPolicyTarget::website(
            "app.example.com",
            Some("/finance/reports/2026".to_string()),
        );
        let nested_reports = BlockPolicyTarget::website(
            "app.example.com",
            Some("/teams/finance/reports".to_string()),
        );

        assert!(reports_target.covers(&reports));
        assert!(reports_target.covers(&reports_child));
        assert!(!reports_target.covers(&nested_reports));
    }

    #[test]
    fn website_targets_do_not_let_path_wildcards_cross_segments() {
        let team_reports_target =
            BlockPolicyTarget::website("example.com", Some("/team-*/reports".to_string()));
        let direct_reports =
            BlockPolicyTarget::website("app.example.com", Some("/team-alpha/reports".to_string()));
        let nested_reports = BlockPolicyTarget::website(
            "app.example.com",
            Some("/team-alpha/archive/reports".to_string()),
        );

        assert!(team_reports_target.covers(&direct_reports));
        assert!(!team_reports_target.covers(&nested_reports));
    }

    #[test]
    fn path_segments_match_wildcard_patterns() {
        let cases = [
            ("*", "", true),
            ("*", "team-alpha", true),
            ("team-*", "team-alpha", true),
            ("team-*", "team-", true),
            ("team-*", "team", false),
            ("*-reports", "finance-reports", true),
            ("*-reports", "reports-finance", false),
            ("team-*-reports", "team-alpha-reports", true),
            ("team-*-reports", "team-alpha-monthly-reports", true),
            ("team-*-reports", "team-reports-alpha", false),
            ("team-*report*", "team-monthly-report-2026", true),
        ];

        for (pattern, value, expected) in cases {
            assert_eq!(
                path_segment_matches_pattern(pattern, value),
                expected,
                "pattern={pattern} value={value}"
            );
        }
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
    fn exceptions_only_override_targets_in_the_same_layer() {
        let mut block_targets = BTreeSet::new();
        block_targets.insert(BlockPolicyTarget::app("com.apple.Safari"));
        let mut allow_targets = BTreeSet::new();
        allow_targets.insert(BlockPolicyTarget::website("example.com", None));
        let subject = BlockPolicySubject::app_and_website("com.apple.Safari", "example.com", None);

        assert_eq!(
            subject.blocked_target(
                IntentionBlockScope::BlockTargets,
                &block_targets,
                &allow_targets,
            ),
            Some(BlockPolicyTarget::app("com.apple.Safari"))
        );

        let mut block_targets = BTreeSet::new();
        block_targets.insert(BlockPolicyTarget::website("example.com", None));
        let mut allow_targets = BTreeSet::new();
        allow_targets.insert(BlockPolicyTarget::app("com.apple.Safari"));

        assert_eq!(
            subject.blocked_target(
                IntentionBlockScope::BlockTargets,
                &block_targets,
                &allow_targets,
            ),
            Some(BlockPolicyTarget::website("example.com", None))
        );
    }

    #[test]
    fn allow_target_scope_requires_app_and_website_matches() {
        let block_targets = BTreeSet::new();
        let mut allow_targets = BTreeSet::new();
        allow_targets.insert(BlockPolicyTarget::app("com.apple.Safari"));
        allow_targets.insert(BlockPolicyTarget::website("example.com", None));

        assert_eq!(
            BlockPolicySubject::app_and_website("com.apple.Safari", "example.com", None)
                .blocked_target(
                    IntentionBlockScope::AllowTargets,
                    &block_targets,
                    &allow_targets,
                ),
            None
        );
        assert_eq!(
            BlockPolicySubject::app_and_website("com.google.Chrome", "example.com", None)
                .blocked_target(
                    IntentionBlockScope::AllowTargets,
                    &block_targets,
                    &allow_targets,
                ),
            Some(BlockPolicyTarget::app("com.google.Chrome"))
        );
        assert_eq!(
            BlockPolicySubject::app_and_website("com.apple.Safari", "other.com", None)
                .blocked_target(
                    IntentionBlockScope::AllowTargets,
                    &block_targets,
                    &allow_targets,
                ),
            Some(BlockPolicyTarget::website("other.com", None))
        );
    }

    #[test]
    fn subjects_without_identity_follow_scope_defaults() {
        let targets = BTreeSet::new();
        let subject = BlockPolicySubject::device();

        assert_eq!(
            subject.blocked_target(IntentionBlockScope::BlockTargets, &targets, &targets),
            None
        );
        assert_eq!(
            subject.blocked_target(IntentionBlockScope::AllowTargets, &targets, &targets),
            Some(BlockPolicyTarget::device())
        );
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
