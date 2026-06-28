use crate::cli::{
    command_name,
    time_range::{parse_cli_time_range, CliTimeRange, CliTimeRangeOptions},
    CliError,
};
use crate::{
    common::time::unix_ms_now,
    modules::activity::{
        foreground::ForegroundActivity,
        repository::{ForegroundActivityRepository, ListForegroundActivitiesForTimeRangeInput},
    },
    modules::db::database::{default_app_db_path, Database},
};
use serde::Serialize;

pub const COMMAND: &str = "foreground";

pub fn run(args: &[String]) -> Result<(), CliError> {
    if args
        .first()
        .is_some_and(|arg| arg == "help" || arg == "--help" || arg == "-h")
    {
        print_help();
        return Ok(());
    }

    let time_range = parse_time_range(args)?;
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
            generated_at: unix_ms_now(),
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
    generated_at: i64,
    activities: Vec<ForegroundActivity>,
}

fn print_help() {
    println!(
        "Usage:\n  {0} activity foreground [--since <duration>]\n  {0} activity foreground --today\n  {0} activity foreground --date <yyyy-mm-dd>\n  {0} activity foreground --from <unix-ms> --to <unix-ms>\n\nOptions:\n  --since   Duration ending now, such as 30m, 24h, or 7d. Defaults to 24h.\n            Requires one of these suffixes: ms, s, m, h, d.\n  --today   Local calendar day containing now.\n  --date    Local calendar day for a date such as 2026-06-27.\n  --from    Inclusive Unix millisecond range start.\n  --to      Exclusive Unix millisecond range end.",
        command_name()
    );
}

fn parse_time_range(args: &[String]) -> Result<CliTimeRange, CliError> {
    return parse_cli_time_range(
        args,
        CliTimeRangeOptions {
            command_path: "activity foreground",
            default_since_ms: 24 * 60 * 60 * 1_000,
            help_command: format!("{} activity foreground --help", command_name()),
        },
    );
}
