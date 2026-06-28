use crate::{
    cli::{args, command_name, CliError},
    modules::recovery_agent::{self as recovery_agent_module, agent::RecoveryAgent},
};
use std::sync::atomic::{AtomicBool, Ordering};

pub const COMMAND: &str = "recovery-agent";
pub const RELAUNCHED_BY_AGENT_ARG: &str = "--recovery-agent-relaunched";

pub fn run(args: &[String]) -> Result<(), CliError> {
    if args.is_empty()
        || args
            .first()
            .is_some_and(|arg| arg == "help" || arg == "--help" || arg == "-h")
    {
        print_help();
        return Ok(());
    }

    let (command, command_args) = args
        .split_first()
        .ok_or_else(|| CliError::new("missing recovery-agent command"))?;

    return match command.as_str() {
        "run" => {
            args::ensure_no_args("recovery-agent run", command_args)?;
            recovery_agent_module::run_watchdog()
                .map_err(|error| CliError::new(format!("Recovery agent failed: {}", error)))
        }
        "status" => {
            args::ensure_no_args("recovery-agent status", command_args)?;
            let status = current_agent()?.status().map_err(CliError::from_display)?;
            println!("configured: {}", status.is_configured);
            println!("loaded: {}", status.is_loaded);
            println!("enabled: {}", status.is_enabled);
            Ok(())
        }
        "install" => {
            args::ensure_no_args("recovery-agent install", command_args)?;
            current_agent()?.enable().map_err(CliError::from_display)?;
            println!("Recovery agent installed.");
            Ok(())
        }
        "uninstall" => {
            args::ensure_no_args("recovery-agent uninstall", command_args)?;
            current_agent()?.disable().map_err(CliError::from_display)?;
            println!("Recovery agent uninstalled.");
            Ok(())
        }
        "plist-path" => {
            args::ensure_no_args("recovery-agent plist-path", command_args)?;
            println!("{}", current_agent()?.plist_path().display());
            Ok(())
        }
        _ => Err(CliError::unknown_command(
            COMMAND,
            command,
            format!("{} recovery-agent --help", command_name()),
        )),
    };
}

fn print_help() {
    println!(
        "Usage:\n  {} recovery-agent <command>\n\nCommands:\n  run          Run the recovery-agent watchdog process.\n  status       Print recovery-agent status.\n  install      Install and load the recovery-agent LaunchAgent.\n  uninstall    Unload and remove the recovery-agent LaunchAgent.\n  plist-path   Print the recovery-agent LaunchAgent plist path.",
        command_name()
    );
}

fn current_agent() -> Result<RecoveryAgent, CliError> {
    return RecoveryAgent::for_current_app().map_err(CliError::from_display);
}

/// Returns `true` once when the current process was relaunched by the recovery agent.
pub fn consume_relaunched_by_agent_arg() -> bool {
    static DID_CONSUME: AtomicBool = AtomicBool::new(false);

    if DID_CONSUME.swap(true, Ordering::SeqCst) {
        return false;
    }

    return std::env::args().any(|arg| arg == RELAUNCHED_BY_AGENT_ARG);
}
