use super::recovery_condition::RecoveryConditionProbe;
use crate::{cli, common::path::app_bundle_for_executable, environment::configs::app::AppConfig};
use std::{
    error::Error,
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::{Duration, Instant},
};

/// Runs the long-lived recovery agent process.
///
/// This process is started by launchd, not Tauri. It only relaunches Abstand
/// when Balanced or Strict Enforcement is active and the main app process is gone.
pub fn run() -> Result<(), Box<dyn Error>> {
    let current_exe = std::env::current_exe()?;
    let launch_target = AppLaunchTarget::resolve(&current_exe);
    let db_runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    let mut recovery_condition = RecoveryConditionProbe::new()?;

    // TODO: Replace active-session polling with an NSWorkspace termination watcher
    loop {
        let should_recover_app = match db_runtime.block_on(recovery_condition.should_recover_app())
        {
            Ok(value) => value,
            Err(error) => {
                eprintln!("Recovery agent condition check failed: {}", error);
                recovery_condition = RecoveryConditionProbe::new()?;
                thread::sleep(IDLE_CHECK_INTERVAL);
                continue;
            }
        };

        if !should_recover_app {
            thread::sleep(IDLE_CHECK_INTERVAL);
            continue;
        }

        if !is_main_app_running() {
            // Note: Give a planned app restart time to appear before recovering it
            thread::sleep(RELAUNCH_GRACE_PERIOD);
            if !is_main_app_running() {
                println!("Recovery agent restarting Abstand");
                if let Err(error) = launch_target.launch() {
                    eprintln!("Recovery agent failed to restart Abstand: {}", error);
                    thread::sleep(IDLE_CHECK_INTERVAL);
                    continue;
                }

                // Note: `open -n` can succeed before Launch Services starts the app
                let launched_at = Instant::now();
                while !is_main_app_running() && launched_at.elapsed() < RELAUNCH_STARTUP_TIMEOUT {
                    thread::sleep(ACTIVE_CHECK_INTERVAL);
                }
            }
        }

        thread::sleep(ACTIVE_CHECK_INTERVAL);
    }
}

fn is_main_app_running() -> bool {
    return abstand_macos::is_app_running(AppConfig::bundle_identifier(), std::process::id())
        || cli::control::is_control_server_reachable();
}

const IDLE_CHECK_INTERVAL: Duration = Duration::from_secs(10);
const ACTIVE_CHECK_INTERVAL: Duration = Duration::from_secs(2);
const RELAUNCH_GRACE_PERIOD: Duration = Duration::from_secs(2);
const RELAUNCH_STARTUP_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Debug, Clone)]
enum AppLaunchTarget {
    AppBundle(PathBuf),
    Executable(PathBuf),
}

impl AppLaunchTarget {
    /// Resolves the target used to relaunch Abstand.
    ///
    /// Prefers the `.app` bundle so macOS applies normal app activation semantics,
    /// and falls back to the executable path for dev builds.
    fn resolve(executable_path: &Path) -> Self {
        if let Some(app_bundle_path) = app_bundle_for_executable(executable_path) {
            return Self::AppBundle(app_bundle_path);
        }

        return Self::Executable(executable_path.to_path_buf());
    }

    fn launch(&self) -> Result<(), Box<dyn Error>> {
        match self {
            Self::AppBundle(app_bundle_path) => {
                let status = Command::new("open")
                    // Note: Force a new instance because the watchdog shares the app's bundle identifier
                    .arg("-n")
                    .arg(app_bundle_path)
                    .arg("--args")
                    .arg(cli::subcommands::recovery_agent::RELAUNCHED_BY_AGENT_ARG)
                    .status()?;

                if !status.success() {
                    return Err(format!("open exited with {}", status).into());
                }
            }
            Self::Executable(executable_path) => {
                Command::new(executable_path)
                    .arg(cli::subcommands::recovery_agent::RELAUNCHED_BY_AGENT_ARG)
                    .spawn()?;
            }
        }

        return Ok(());
    }
}
