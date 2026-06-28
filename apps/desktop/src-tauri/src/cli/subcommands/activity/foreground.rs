use crate::cli::{
    command_name,
    time_range::{parse_cli_time_range, CliTimeRange, CliTimeRangeOptions},
    CliError,
};
use crate::{
    common::time::unix_ms_now,
    modules::{
        activity::{
            foreground::{ForegroundActivity, ForegroundActivityCaptureLevel},
            repository::{ForegroundActivityRepository, ListForegroundActivitiesForTimeRangeInput},
        },
        catalog::{
            repository::CatalogRepository,
            types::{App, Website},
        },
        db::database::{default_app_db_path, Database},
    },
};
use serde::Serialize;
use sqlx::{Pool, Sqlite};
use std::collections::{BTreeSet, HashMap};

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

        let output = build_output(&database.pool, time_range).await?;
        let json = serde_json::to_string_pretty(&output).map_err(CliError::from_display)?;
        println!("{}", json);

        return Ok(());
    });
}

async fn build_output(
    pool: &Pool<Sqlite>,
    time_range: CliTimeRange,
) -> Result<ForegroundActivityOutput, CliError> {
    let generated_at = unix_ms_now();
    let effective_to = generated_at.min(time_range.to).max(time_range.from);
    let activities = ForegroundActivityRepository::list_for_time_range(
        pool,
        ListForegroundActivitiesForTimeRangeInput {
            started_at: time_range.from,
            ended_at: time_range.to,
        },
    )
    .await
    .map_err(CliError::from_display)?;

    let catalog = ForegroundCatalog::load(pool, &activities).await?;

    let mut intervals = Vec::new();
    for activity in activities {
        let interval = build_foreground_interval(activity, time_range, effective_to, &catalog)?;
        if interval.duration_ms > 0 {
            intervals.push(interval);
        }
    }

    return Ok(ForegroundActivityOutput {
        from: time_range.from,
        to: time_range.to,
        effective_to,
        generated_at,
        intervals,
    });
}

fn build_foreground_interval(
    activity: ForegroundActivity,
    time_range: CliTimeRange,
    effective_to: i64,
    catalog: &ForegroundCatalog,
) -> Result<ForegroundActivityInterval, CliError> {
    let Some(app) = catalog.apps_by_id.get(&activity.app_id) else {
        return Err(CliError::new(format!(
            "missing app {} for foreground activity {}",
            activity.app_id, activity.id
        )));
    };

    let website = match activity.website_id {
        Some(website_id) => {
            let Some(website) = catalog.websites_by_id.get(&website_id) else {
                return Err(CliError::new(format!(
                    "missing website {} for foreground activity {}",
                    website_id, activity.id
                )));
            };
            Some(ForegroundActivityWebsite::from_website(website))
        }
        None => None,
    };

    let started_at = activity.started_at.max(time_range.from);
    let original_started_at = (started_at != activity.started_at).then_some(activity.started_at);
    let ended_at = activity.ended_at.unwrap_or(effective_to).min(effective_to);
    let ended_at = ended_at.max(started_at);
    let original_ended_at = (activity.ended_at != Some(ended_at)).then_some(activity.ended_at);

    return Ok(ForegroundActivityInterval {
        id: activity.id,
        started_at,
        original_started_at,
        ended_at,
        original_ended_at,
        duration_ms: ended_at - started_at,
        capture_level: activity.capture_level,
        app: ForegroundActivityApp::from_app(app),
        window: ForegroundActivityWindow::from_details(activity.window_title),
        browser: ForegroundActivityBrowser::from_details(
            activity.browser_url,
            activity.browser_is_private,
        ),
        website,
    });
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ForegroundActivityOutput {
    from: i64,
    to: i64,
    effective_to: i64,
    generated_at: i64,
    intervals: Vec<ForegroundActivityInterval>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ForegroundActivityInterval {
    id: i64,
    started_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    original_started_at: Option<i64>,
    ended_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    original_ended_at: Option<Option<i64>>,
    duration_ms: i64,
    capture_level: ForegroundActivityCaptureLevel,
    app: ForegroundActivityApp,
    window: Option<ForegroundActivityWindow>,
    browser: Option<ForegroundActivityBrowser>,
    website: Option<ForegroundActivityWebsite>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ForegroundActivityApp {
    stable_id: String,
    name: Option<String>,
    bundle_id: Option<String>,
}

impl ForegroundActivityApp {
    fn from_app(app: &App) -> Self {
        return Self {
            stable_id: app.stable_id.clone(),
            name: app.name.clone(),
            bundle_id: app.bundle_id.clone(),
        };
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ForegroundActivityWebsite {
    hostname: String,
    name: Option<String>,
}

impl ForegroundActivityWebsite {
    fn from_website(website: &Website) -> Self {
        return Self {
            hostname: website.hostname.clone(),
            name: website.name.clone(),
        };
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ForegroundActivityWindow {
    title: String,
}

impl ForegroundActivityWindow {
    fn from_details(title: Option<String>) -> Option<Self> {
        return title
            .map(|title| title.trim().to_string())
            .filter(|title| !title.is_empty())
            .map(|title| Self { title });
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ForegroundActivityBrowser {
    url: Option<String>,
    is_private: Option<bool>,
}

impl ForegroundActivityBrowser {
    fn from_details(url: Option<String>, is_private: Option<bool>) -> Option<Self> {
        if url.is_none() && is_private.is_none() {
            return None;
        }

        return Some(Self { url, is_private });
    }
}

struct ForegroundCatalog {
    apps_by_id: HashMap<i64, App>,
    websites_by_id: HashMap<i64, Website>,
}

impl ForegroundCatalog {
    async fn load(
        pool: &Pool<Sqlite>,
        activities: &[ForegroundActivity],
    ) -> Result<Self, CliError> {
        let apps_by_id = Self::load_apps_by_id(pool, activities).await?;
        let websites_by_id = Self::load_websites_by_id(pool, activities).await?;

        return Ok(Self {
            apps_by_id,
            websites_by_id,
        });
    }

    async fn load_apps_by_id(
        pool: &Pool<Sqlite>,
        activities: &[ForegroundActivity],
    ) -> Result<HashMap<i64, App>, CliError> {
        let app_ids = activities
            .iter()
            .map(|activity| activity.app_id)
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        let apps = CatalogRepository::get_apps_by_ids(pool, &app_ids)
            .await
            .map_err(CliError::from_display)?;

        return Ok(apps.into_iter().map(|app| (app.id, app)).collect());
    }

    async fn load_websites_by_id(
        pool: &Pool<Sqlite>,
        activities: &[ForegroundActivity],
    ) -> Result<HashMap<i64, Website>, CliError> {
        let website_ids = activities
            .iter()
            .filter_map(|activity| activity.website_id)
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        let websites = CatalogRepository::get_websites_by_ids(pool, &website_ids)
            .await
            .map_err(CliError::from_display)?;

        return Ok(websites
            .into_iter()
            .map(|website| (website.id, website))
            .collect());
    }
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
