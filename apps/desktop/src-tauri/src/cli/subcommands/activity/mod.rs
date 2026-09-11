use crate::cli::{command_name, CliError};

mod foreground;

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

    let (command, command_args) = args
        .split_first()
        .ok_or_else(|| CliError::new("missing activity command"))?;

    return match command.as_str() {
        foreground::COMMAND => foreground::run(command_args),
        _ => Err(CliError::unknown_command(
            COMMAND,
            command,
            format!("{} activity --help", command_name()),
        )),
    };
}

fn print_help() {
    println!(
        "Usage:\n  {} activity <command>\n\nCommands:\n  foreground   Print foreground activity intervals as JSON.",
        command_name()
    );
}
