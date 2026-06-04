use super::{
    cli, recovery_condition,
    user_launch_agent::{UserLaunchAgent, UserLaunchAgentConfig},
};
use crate::environment::{
    configs::app::AppConfig,
    path::{get_app_support_dir, get_user_launch_agents_dir},
};
use serde::Serialize;
use std::{
    env,
    error::Error,
    path::{Path, PathBuf},
};

/// Installs and controls the agent that reopens Abstand during active Strict Enforcement.
pub struct RecoveryAgent {
    user_launch_agent: UserLaunchAgent,
}

impl RecoveryAgent {
    pub fn for_current_app() -> Result<Self, Box<dyn Error>> {
        let user_launch_agent = UserLaunchAgent::new(UserLaunchAgentConfig {
            label: label(),
            executable_path: env::current_exe()?,
            arguments: vec![cli::RUN_AGENT_ARG.to_string()],
            bundle_identifiers: vec![AppConfig::bundle_identifier().to_string()],
            plist_path: plist_path()?,
            log_dir: log_dir()?,
        });

        return Ok(Self { user_launch_agent });
    }

    pub fn enable(&self) -> Result<(), Box<dyn Error>> {
        self.user_launch_agent.enable()?;
        return Ok(());
    }

    /// Disables the recovery agent unless Strict Enforcement is currently active.
    pub fn disable(&self) -> Result<(), Box<dyn Error>> {
        if recovery_condition::should_recover_app_blocking()? {
            return Err("Strict Enforcement is active".into());
        }

        return self.disable_unchecked();
    }

    /// Disables the recovery agent without checking active Strict Enforcement.
    pub fn disable_unchecked(&self) -> Result<(), Box<dyn Error>> {
        self.user_launch_agent.disable()?;
        return Ok(());
    }

    pub fn status(&self) -> Result<RecoveryAgentStatus, Box<dyn Error>> {
        let is_configured = self.user_launch_agent.is_configured();
        let is_loaded = self.user_launch_agent.is_loaded()?;

        return Ok(RecoveryAgentStatus {
            is_configured,
            is_loaded,
            is_enabled: is_configured && is_loaded,
        });
    }

    pub fn plist_path(&self) -> &Path {
        return self.user_launch_agent.plist_path();
    }
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryAgentStatus {
    /// Set to `true` when the recovery agent plist exists in the user's LaunchAgents folder.
    pub is_configured: bool,
    /// Set to `true` when launchd has loaded the recovery agent job for the current user.
    pub is_loaded: bool,
    /// Set to `true` when the recovery agent is both configured and loaded.
    pub is_enabled: bool,
}

fn plist_path() -> Result<PathBuf, Box<dyn Error>> {
    return Ok(get_user_launch_agents_dir()?.join(format!("{}.plist", label())));
}

fn log_dir() -> Result<PathBuf, Box<dyn Error>> {
    return Ok(app_data_dir()?.join("logs"));
}

fn app_data_dir() -> Result<PathBuf, Box<dyn Error>> {
    return get_app_support_dir(AppConfig::bundle_identifier());
}

fn label() -> String {
    return format!("{}.recovery-agent", AppConfig::bundle_identifier());
}
