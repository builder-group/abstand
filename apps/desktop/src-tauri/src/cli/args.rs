use super::CliError;

pub fn ensure_no_args(command_path: &str, args: &[String]) -> Result<(), CliError> {
    if args.is_empty() {
        return Ok(());
    }

    return Err(CliError::new(format!(
        "unexpected arguments for {}: {}",
        command_path,
        args.join(" ")
    )));
}
