use super::CliError;
use crate::common::time::{local_day_bounds_containing, local_day_bounds_for_date, unix_ms_now};
use chrono::NaiveDate;

pub fn parse_cli_time_range(
    args: &[String],
    options: CliTimeRangeOptions,
) -> Result<CliTimeRange, CliError> {
    let mut since_duration_ms: Option<i64> = None;
    let mut date: Option<NaiveDate> = None;
    let mut is_today = false;
    let mut from: Option<i64> = None;
    let mut to: Option<i64> = None;
    let mut index = 0;

    while index < args.len() {
        let arg = &args[index];
        match arg.as_str() {
            "--since" => {
                let value = next_option_value(args, index, "--since")?;
                if since_duration_ms.is_some() {
                    return Err(duplicate_option_error(options.command_path, "--since"));
                }

                since_duration_ms = Some(parse_duration_ms(value)?);
                index += 2;
            }
            "--today" => {
                if is_today {
                    return Err(duplicate_option_error(options.command_path, "--today"));
                }

                is_today = true;
                index += 1;
            }
            "--date" => {
                let value = next_option_value(args, index, "--date")?;
                if date.is_some() {
                    return Err(duplicate_option_error(options.command_path, "--date"));
                }

                date = Some(parse_local_date(value)?);
                index += 2;
            }
            "--from" => {
                let value = next_option_value(args, index, "--from")?;
                if from.is_some() {
                    return Err(duplicate_option_error(options.command_path, "--from"));
                }

                from = Some(parse_unix_ms("--from", value)?);
                index += 2;
            }
            "--to" => {
                let value = next_option_value(args, index, "--to")?;
                if to.is_some() {
                    return Err(duplicate_option_error(options.command_path, "--to"));
                }

                to = Some(parse_unix_ms("--to", value)?);
                index += 2;
            }
            _ => {
                return Err(CliError::new(format!(
                    "unknown {} option: {}\n\nRun `{}` for usage.",
                    options.command_path, arg, options.help_command
                )));
            }
        }
    }

    let mode_count = usize::from(since_duration_ms.is_some())
        + usize::from(is_today)
        + usize::from(date.is_some())
        + usize::from(from.is_some() || to.is_some());
    if mode_count > 1 {
        return Err(CliError::new(format!(
            "use only one {} time mode: --since, --today, --date, or --from/--to",
            options.command_path
        )));
    }

    if let Some(since_duration_ms) = since_duration_ms {
        let to = unix_ms_now();
        let from = to.checked_sub(since_duration_ms).ok_or_else(|| {
            CliError::new(format!("{} --since is too large", options.command_path))
        })?;

        return CliTimeRange::new(from, to, options.command_path);
    }

    if is_today {
        let bounds = local_day_bounds_containing(unix_ms_now())
            .ok_or_else(|| CliError::new("could not resolve today's local day bounds"))?;
        return CliTimeRange::new(bounds.start_at, bounds.end_at, options.command_path);
    }

    if let Some(date) = date {
        let bounds = local_day_bounds_for_date(date).ok_or_else(|| {
            CliError::new(format!("invalid local date: {}", date.format("%Y-%m-%d")))
        })?;
        return CliTimeRange::new(bounds.start_at, bounds.end_at, options.command_path);
    }

    if from.is_none() && to.is_none() {
        let to = unix_ms_now();
        let from = to - options.default_since_ms;
        return CliTimeRange::new(from, to, options.command_path);
    }

    return CliTimeRange::new(
        from.ok_or_else(|| CliError::new(format!("missing --from for {}", options.command_path)))?,
        to.ok_or_else(|| CliError::new(format!("missing --to for {}", options.command_path)))?,
        options.command_path,
    );
}

pub struct CliTimeRangeOptions {
    pub command_path: &'static str,
    pub default_since_ms: i64,
    pub help_command: String,
}

#[derive(Debug, Clone, Copy)]
pub struct CliTimeRange {
    pub from: i64,
    pub to: i64,
}

impl CliTimeRange {
    fn new(from: i64, to: i64, command_path: &str) -> Result<Self, CliError> {
        if to <= from {
            return Err(CliError::new(format!(
                "{} time range must end after it starts: {} <= {}",
                command_path, to, from
            )));
        }

        return Ok(Self { from, to });
    }
}

fn next_option_value<'a>(
    args: &'a [String],
    index: usize,
    option_name: &str,
) -> Result<&'a str, CliError> {
    let value = args
        .get(index + 1)
        .ok_or_else(|| CliError::new(format!("missing value for {}", option_name)))?;
    if value.starts_with("--") {
        return Err(CliError::new(format!("missing value for {}", option_name)));
    }

    return Ok(value);
}

fn duplicate_option_error(command_path: &str, option_name: &str) -> CliError {
    return CliError::new(format!(
        "duplicate {} option: {}",
        command_path, option_name
    ));
}

fn parse_unix_ms(option_name: &str, value: &str) -> Result<i64, CliError> {
    return value.parse::<i64>().map_err(|_| {
        CliError::new(format!(
            "invalid {} value, expected Unix milliseconds: {}",
            option_name, value
        ))
    });
}

fn parse_local_date(value: &str) -> Result<NaiveDate, CliError> {
    return NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| {
        CliError::new(format!(
            "invalid --date value, expected yyyy-mm-dd: {}",
            value
        ))
    });
}

fn parse_duration_ms(value: &str) -> Result<i64, CliError> {
    let (amount, multiplier) = if let Some(amount) = value.strip_suffix("ms") {
        (amount, 1)
    } else if let Some(amount) = value.strip_suffix('s') {
        (amount, 1_000)
    } else if let Some(amount) = value.strip_suffix('m') {
        (amount, 60_000)
    } else if let Some(amount) = value.strip_suffix('h') {
        (amount, 3_600_000)
    } else if let Some(amount) = value.strip_suffix('d') {
        (amount, 86_400_000)
    } else {
        return Err(CliError::new(format!(
            "invalid duration, expected suffix ms, s, m, h, or d: {}",
            value
        )));
    };

    let amount = amount
        .parse::<i64>()
        .map_err(|_| CliError::new(format!("invalid duration: {}", value)))?;
    if amount <= 0 {
        return Err(CliError::new(format!(
            "duration must be greater than zero: {}",
            value
        )));
    }

    return amount
        .checked_mul(multiplier)
        .ok_or_else(|| CliError::new(format!("duration is too large: {}", value)));
}
