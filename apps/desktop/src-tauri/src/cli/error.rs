use std::fmt;

#[derive(Debug)]
pub struct CliError {
    message: String,
}

impl CliError {
    pub fn new(message: impl Into<String>) -> Self {
        return Self {
            message: message.into(),
        };
    }

    pub fn from_display(error: impl fmt::Display) -> Self {
        return Self::new(error.to_string());
    }

    pub fn unknown_command(command_group: &str, command: &str, help_command: String) -> Self {
        return Self::new(format!(
            "unknown {} command: {}\n\nRun `{}` for usage.",
            command_group, command, help_command
        ));
    }
}

impl fmt::Display for CliError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return write!(f, "{}", self.message);
    }
}
