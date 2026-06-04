mod app;
mod common;
mod environment;
mod modules;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    app::run();
}

#[cfg(target_os = "macos")]
pub fn try_run_recovery_agent_from_args() -> bool {
    return modules::recovery_agent::cli::try_run_from_args();
}
