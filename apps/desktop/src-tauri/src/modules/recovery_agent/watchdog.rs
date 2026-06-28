use super::recovery_condition::RecoveryConditionProbe;
use crate::{cli, environment::configs::app::AppConfig};
use std::{
    error::Error,
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::Duration,
};

/// Runs the long-lived recovery agent process.
///
/// This process is started by launchd, not Tauri. It only relaunches Abstand
/// when a Strict Enforcement block is active and the main app process is gone.
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

        if !abstand_macos::is_app_running(AppConfig::bundle_identifier(), std::process::id()) {
            println!("Recovery agent restarting Abstand");
            if let Err(error) = launch_target.launch() {
                eprintln!("Recovery agent failed to restart Abstand: {}", error);
                thread::sleep(IDLE_CHECK_INTERVAL);
                continue;
            }
            thread::sleep(RELAUNCH_SETTLE_INTERVAL);
        }

        thread::sleep(ACTIVE_CHECK_INTERVAL);
    }
}

const IDLE_CHECK_INTERVAL: Duration = Duration::from_secs(10);
const ACTIVE_CHECK_INTERVAL: Duration = Duration::from_secs(2);
const RELAUNCH_SETTLE_INTERVAL: Duration = Duration::from_secs(5);

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
        if let Some(app_bundle_path) = app_bundle_path_for_executable(executable_path) {
            return Self::AppBundle(app_bundle_path);
        }

        return Self::Executable(executable_path.to_path_buf());
    }

    fn launch(&self) -> Result<(), Box<dyn Error>> {
        match self {
            Self::AppBundle(app_bundle_path) => {
                let status = Command::new("open")
                    // Note: The watchdog shares the app bundle identifier, so force a new instance
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

/// Returns the `.app` bundle path for executables inside `Contents/MacOS`.
fn app_bundle_path_for_executable(executable_path: &Path) -> Option<PathBuf> {
    let macos_dir = executable_path.parent()?;
    if macos_dir.file_name()? != "MacOS" {
        return None;
    }

    let contents_dir = macos_dir.parent()?;
    if contents_dir.file_name()? != "Contents" {
        return None;
    }

    let app_bundle_path = contents_dir.parent()?;
    if app_bundle_path.extension()? != "app" {
        return None;
    }

    return Some(app_bundle_path.to_path_buf());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_app_bundle_path_for_packaged_executable() {
        let executable_path = Path::new("/Applications/Abstand.app/Contents/MacOS/Abstand");

        assert_eq!(
            app_bundle_path_for_executable(executable_path),
            Some(PathBuf::from("/Applications/Abstand.app"))
        );
    }

    #[test]
    fn returns_none_for_non_app_bundle_executable() {
        let executable_path = Path::new("/Users/test/abstand/target/debug/abstand");

        assert_eq!(app_bundle_path_for_executable(executable_path), None);
    }
}
