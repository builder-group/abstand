//! Routes command-line invocations before the Tauri app starts.

pub mod args;
pub mod commands;
#[cfg(target_os = "macos")]
pub mod control;
pub mod error;
mod installer;
pub mod subcommands;
pub mod time_range;

use crate::environment::configs::app::AppConfig;
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
        "version" | "--version" | "-V" => {
            print_version();
            Some(0)
        }
        subcommands::activity::COMMAND => Some(exit_code(subcommands::activity::run(command_args))),
        #[cfg(target_os = "macos")]
        subcommands::app::COMMAND => Some(exit_code(subcommands::app::run(command_args))),
        #[cfg(target_os = "macos")]
        subcommands::intention::COMMAND => {
            Some(exit_code(subcommands::intention::run(command_args)))
        }
        #[cfg(target_os = "macos")]
        "status" => Some(exit_code(subcommands::app::status(command_args))),
        #[cfg(target_os = "macos")]
        subcommands::recovery_agent::COMMAND => {
            Some(exit_code(subcommands::recovery_agent::run(command_args)))
        }
        // Note: Unknown flags may be app-launch metadata such as macOS's -psn_...
        // Let Tauri handle them so normal app startup still works
        command if command.starts_with("-") => None,
        _ => Some(exit_code(Err(CliError::unknown_command(
            "top-level",
            command,
            format!("{} --help", command_name()),
        )))),
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
    let mut commands = vec![
        "  activity          Activity tracking commands.",
        "  version           Print the Abstand CLI version.",
    ];
    #[cfg(target_os = "macos")]
    commands.extend([
        "  app               Start the desktop app.",
        "  intention         List, create, start, stop, or delete Intentions.",
        "  status            Print live app and session status as JSON.",
        "  recovery-agent    Manage the recovery agent.",
    ]);

    println!(
        "Usage:\n  {} <command> [options]\n\nCommands:\n{}",
        command_name(),
        commands.join("\n")
    );
}

fn print_version() {
    println!("{} {}", command_name(), AppConfig::display_version());
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
