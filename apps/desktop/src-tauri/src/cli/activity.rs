use super::{command_name, CliError};
use crate::{
    common::time::unix_ms_now,
    modules::activity::{
        foreground::ForegroundActivity,
        repository::{ForegroundActivityRepository, ListForegroundActivitiesForTimeRangeInput},
    },
    modules::db::database::{default_app_db_path, Database},
};
use serde::Serialize;

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
        "foreground" => run_foreground(command_args),
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

fn run_foreground(args: &[String]) -> Result<(), CliError> {
    if args
        .first()
        .is_some_and(|arg| arg == "help" || arg == "--help" || arg == "-h")
    {
        print_foreground_help();
        return Ok(());
    }

    let time_range = parse_foreground_time_range(args)?;
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(CliError::from_display)?;

    return runtime.block_on(async move {
        let db_path = default_app_db_path().map_err(CliError::from_display)?;
        if !db_path.exists() {
            return Err(CliError::new(format!(
                "activity database does not exist: {}",
                db_path.display()
            )));
        }

        let database = Database::open_read_only(db_path)
            .await
            .map_err(CliError::from_display)?;

        let activities = ForegroundActivityRepository::list_for_time_range(
            &database.pool,
            ListForegroundActivitiesForTimeRangeInput {
                started_at: time_range.from,
                ended_at: time_range.to,
            },
        )
        .await
        .map_err(CliError::from_display)?;

        let output = ForegroundActivityOutput {
            from: time_range.from,
            to: time_range.to,
            activities,
        };
        let json = serde_json::to_string_pretty(&output).map_err(CliError::from_display)?;
        println!("{}", json);

        return Ok(());
    });
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ForegroundActivityOutput {
    from: i64,
    to: i64,
    activities: Vec<ForegroundActivity>,
}

fn print_foreground_help() {
    println!(
        "Usage:\n  {0} activity foreground [--since <duration>]\n  {0} activity foreground --from <unix-ms> --to <unix-ms>\n\nOptions:\n  --since   Duration ending now, such as 30m, 24h, or 7d. Defaults to 24h.\n            Requires one of these suffixes: ms, s, m, h, d.\n  --from    Inclusive Unix millisecond range start.\n  --to      Exclusive Unix millisecond range end.",
        command_name()
    );
}

fn parse_foreground_time_range(args: &[String]) -> Result<ForegroundTimeRange, CliError> {
    let mut since_duration_ms: Option<i64> = None;
    let mut from: Option<i64> = None;
    let mut to: Option<i64> = None;
    let mut index = 0;

    while index < args.len() {
        let arg = &args[index];
        match arg.as_str() {
            "--since" => {
                let value = next_option_value(args, index, "--since")?;
                set_unique_time_option(
                    &mut since_duration_ms,
                    "--since",
                    parse_duration_ms(value)?,
                )?;
                index += 2;
            }
            "--from" => {
                let value = next_option_value(args, index, "--from")?;
                set_unique_time_option(&mut from, "--from", parse_unix_ms("--from", value)?)?;
                index += 2;
            }
            "--to" => {
                let value = next_option_value(args, index, "--to")?;
                set_unique_time_option(&mut to, "--to", parse_unix_ms("--to", value)?)?;
                index += 2;
            }
            _ => {
                return Err(CliError::new(format!(
                    "unknown activity foreground option: {}\n\nRun `{}` for usage.",
                    arg,
                    foreground_help_command()
                )));
            }
        }
    }

    if since_duration_ms.is_some() && (from.is_some() || to.is_some()) {
        return Err(CliError::new(
            "use either --since or --from/--to, not both".to_string(),
        ));
    }

    if let Some(since_duration_ms) = since_duration_ms {
        let to = unix_ms_now();
        let from = to
            .checked_sub(since_duration_ms)
            .ok_or_else(|| CliError::new("activity foreground --since is too large"))?;

        return ForegroundTimeRange::new(from, to);
    }

    if from.is_none() && to.is_none() {
        let to = unix_ms_now();
        let from = to - DEFAULT_FOREGROUND_SINCE_MS;
        return ForegroundTimeRange::new(from, to);
    }

    return ForegroundTimeRange::new(
        from.ok_or_else(|| CliError::new("missing --from for activity foreground"))?,
        to.ok_or_else(|| CliError::new("missing --to for activity foreground"))?,
    );
}

#[derive(Debug, Clone, Copy)]
struct ForegroundTimeRange {
    from: i64,
    to: i64,
}

impl ForegroundTimeRange {
    fn new(from: i64, to: i64) -> Result<Self, CliError> {
        if to <= from {
            return Err(CliError::new(format!(
                "activity foreground time range must end after it starts: {} <= {}",
                to, from
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

fn set_unique_time_option(
    target: &mut Option<i64>,
    option_name: &str,
    value: i64,
) -> Result<(), CliError> {
    if target.is_some() {
        return Err(CliError::new(format!(
            "duplicate activity foreground option: {}",
            option_name
        )));
    }

    *target = Some(value);
    return Ok(());
}

fn parse_unix_ms(option_name: &str, value: &str) -> Result<i64, CliError> {
    return value.parse::<i64>().map_err(|_| {
        CliError::new(format!(
            "invalid {} value, expected Unix milliseconds: {}",
            option_name, value
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

fn foreground_help_command() -> String {
    return format!("{} activity foreground --help", command_name());
}

const DEFAULT_FOREGROUND_SINCE_MS: i64 = 24 * 60 * 60 * 1_000;
