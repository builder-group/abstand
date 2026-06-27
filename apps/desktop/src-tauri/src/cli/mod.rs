//! Routes command-line invocations before the Tauri app starts.

pub mod activity;
mod args;
pub mod error;
#[cfg(target_os = "macos")]
pub mod recovery_agent;

use error::CliError;
use std::{env, path::Path};

pub fn try_run_from_args() -> Option<i32> {
    let args = env::args().skip(1).collect::<Vec<_>>();
    if args.is_empty() {
        return None;
    }

    let (command, command_args) = args.split_first()?;
    return match command.as_str() {
        "help" | "--help" | "-h" => {
            print_help();
            Some(0)
        }
        activity::COMMAND => Some(exit_code(activity::run(command_args))),
        #[cfg(target_os = "macos")]
        recovery_agent::COMMAND => Some(exit_code(recovery_agent::run(command_args))),
        _ => None,
    };
}

fn exit_code(result: Result<(), CliError>) -> i32 {
    return match result {
        Ok(()) => 0,
        Err(error) => {
            eprintln!("{}", error);
            1
        }
    };
}

fn print_help() {
    let mut commands = vec!["  activity          Activity tracking commands."];
    #[cfg(target_os = "macos")]
    commands.push("  recovery-agent    Manage the recovery agent.");

    println!(
        "Usage:\n  {} <command> [options]\n\nCommands:\n{}",
        command_name(),
        commands.join("\n")
    );
}

/// Returns the executable name used in CLI help and error messages.
pub fn command_name() -> String {
    return env::args()
        .next()
        .and_then(|arg| {
            Path::new(&arg)
                .file_name()
                .map(|name| name.to_string_lossy().to_string())
        })
        .unwrap_or_else(|| "abstand".to_string());
}
