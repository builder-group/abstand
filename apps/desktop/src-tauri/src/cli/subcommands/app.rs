use crate::{
    cli::{
        args::ensure_no_args,
        command_name,
        control::{self, ControlRequest},
        CliError,
    },
    common::path::app_bundle_for_executable,
};
use std::{
    env,
    process::{Command, Stdio},
};

pub const COMMAND: &str = "app";

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
        .ok_or_else(|| CliError::new("missing app command"))?;
    return match command.as_str() {
        "start" => {
            ensure_no_args("app start", command_args)?;
            start()
        }
        _ => Err(CliError::unknown_command(
            COMMAND,
            command,
            format!("{} app --help", command_name()),
        )),
    };
}

pub fn status(args: &[String]) -> Result<(), CliError> {
    ensure_no_args("status", args)?;
    let result = control::send(&ControlRequest::Status).map_err(CliError::new)?;
    let json = serde_json::to_string_pretty(&result).map_err(CliError::from_display)?;
    println!("{}", json);
    return Ok(());
}

fn start() -> Result<(), CliError> {
    let executable_path = env::current_exe().map_err(CliError::from_display)?;
    if let Some(app_bundle_path) = app_bundle_for_executable(&executable_path) {
        let status = Command::new("open")
            // Note: The CLI shares the bundle identity, so macOS could activate this exiting process
            .arg("-n")
            .arg(app_bundle_path)
            .status()
            .map_err(CliError::from_display)?;
        if !status.success() {
            return Err(CliError::new(format!("open exited with {}", status)));
        }
    } else {
        Command::new(executable_path)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(CliError::from_display)?;
    }

    println!("Abstand start requested.");
    return Ok(());
}

fn print_help() {
    println!(
        "Usage:\n  {} app start\n\nCommands:\n  start    Start Abstand or bring the running app to the foreground.",
        command_name()
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(values: &[&str]) -> Vec<String> {
        return values.iter().map(|value| value.to_string()).collect();
    }

    #[test]
    fn invalid_commands_are_rejected_before_launching() {
        assert!(run(&args(&["start", "unexpected"])).is_err());
        assert!(run(&args(&["stop"])).is_err());
    }
}
