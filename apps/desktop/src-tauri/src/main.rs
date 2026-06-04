// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "macos")]
    {
        if abstand_lib::try_run_recovery_agent_from_args() {
            return;
        }
    }

    abstand_lib::run();
}
