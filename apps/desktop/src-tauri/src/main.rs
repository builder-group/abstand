// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if let Some(exit_code) = abstand_lib::try_run_cli_from_args() {
        std::process::exit(exit_code);
    }

    abstand_lib::run();
}
