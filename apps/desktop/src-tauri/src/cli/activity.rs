use super::{command_name, CliError};

pub const COMMAND: &str = "activity";

pub fn run(args: &[String]) -> Result<(), CliError> {
    if args.is_empty()
        || args
            .first()
            .is_some_and(|arg| arg == "help" || arg == "--help" || arg == "-h")
    {
        print_help();
        return Ok(());
    }

    let (command, _) = args
        .split_first()
        .ok_or_else(|| CliError::new("missing activity command"))?;

    return Err(CliError::unknown_command(
        COMMAND,
        command,
        format!("{} activity --help", command_name()),
    ));
}

fn print_help() {
    println!(
        "Usage:\n  {} activity <command>\n\nCommands:\n  No activity commands are available yet.",
        command_name()
    );
}
