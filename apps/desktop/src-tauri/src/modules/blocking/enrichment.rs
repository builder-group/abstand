use super::{
    policy::BlockingPolicyViolation,
    types::{BlockedTarget, BlockingViolation},
};
use crate::modules::{
    activity::types::ActivityFocus, catalog::resolver, intentions::block_policy::BlockPolicyTarget,
};
use tauri::AppHandle;

pub async fn enrich_blocking_violation(
    app: &AppHandle,
    policy_violation: &BlockingPolicyViolation,
    focus: &ActivityFocus,
) -> BlockingViolation {
    return BlockingViolation {
        intention_id: policy_violation.intention_id,
        intention_name: policy_violation.intention_name.clone(),
        session_id: policy_violation.session_id,
        session_started_at: policy_violation.session_started_at,
        session_automatic_end_at: policy_violation.session_automatic_end_at,
        blocked_target: enrich_blocked_target(app, &policy_violation.blocked_target, focus).await,
    };
}

async fn enrich_blocked_target(
    app: &AppHandle,
    target: &BlockPolicyTarget,
    focus: &ActivityFocus,
) -> BlockedTarget {
    return match target {
        BlockPolicyTarget::App { bundle_id } => {
            let catalog_app = match resolver::resolve_app_by_bundle_id(app, bundle_id).await {
                Ok(app) => app,
                Err(error) => {
                    log::warn!(
                        target: LOG_TARGET,
                        "failed to enrich blocked app {}: {}",
                        bundle_id,
                        error
                    );
                    None
                }
            };
            let display_name = focus
                .target
                .app_bundle_id
                .as_deref()
                .filter(|focused_bundle_id| *focused_bundle_id == bundle_id)
                .and(focus.app_name.as_deref())
                .or(catalog_app.as_ref().and_then(|app| app.name.as_deref()))
                .unwrap_or(bundle_id)
                .to_string();

            BlockedTarget::App {
                bundle_id: bundle_id.clone(),
                display_name,
                icon: catalog_app.as_ref().and_then(|app| app.icon.clone()),
                color: catalog_app.and_then(|app| app.color),
            }
        }
        BlockPolicyTarget::Website { hostname } => {
            let catalog_website = match resolver::resolve_website_by_hostname(app, hostname).await {
                Ok(website) => website,
                Err(error) => {
                    log::warn!(
                        target: LOG_TARGET,
                        "failed to enrich blocked website {}: {}",
                        hostname,
                        error
                    );
                    None
                }
            };
            let display_name = catalog_website
                .as_ref()
                .and_then(|website| website.name.as_deref())
                .unwrap_or(hostname)
                .to_string();

            BlockedTarget::Website {
                hostname: hostname.clone(),
                display_name,
                icon: catalog_website
                    .as_ref()
                    .and_then(|website| website.icon.clone()),
                color: catalog_website.and_then(|website| website.color),
            }
        }
        BlockPolicyTarget::Device => BlockedTarget::Device {
            display_name: "This device".to_string(),
        },
    };
}

const LOG_TARGET: &str = "modules::blocking::enrichment";
