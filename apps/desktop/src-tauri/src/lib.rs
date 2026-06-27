mod app;
mod cli;
mod common;
mod environment;
mod modules;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    app::run();
}

pub fn try_run_cli_from_args() -> Option<i32> {
    return cli::try_run_from_args();
}
