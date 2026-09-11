use super::foreground::{ForegroundActivity, ForegroundActivityCaptureLevel};
use sqlx::{FromRow, Pool, Sqlite, Transaction};
use std::fmt;

pub struct ForegroundActivityRepository;

impl ForegroundActivityRepository {
    pub async fn record(
        pool: &Pool<Sqlite>,
        input: RecordForegroundActivityInput,
    ) -> Result<ForegroundActivity, ForegroundActivityRepositoryError> {
        input.validate()?;

        let mut transaction = pool.begin().await?;
        if let Some(active_activity) = Self::get_active(&mut transaction).await? {
            if input.matches_activity(&active_activity) {
                transaction.commit().await?;
                return Ok(active_activity);
            }

            // Note: mado can report the same focus first as an app, then with window or browser detail
            if active_activity.app_id == input.app_id
                && active_activity.capture_level == ForegroundActivityCaptureLevel::App
                && input.capture_level != ForegroundActivityCaptureLevel::App
            {
                let activity =
                    Self::update_activity_details(&mut transaction, &active_activity, input)
                        .await?;
                transaction.commit().await?;
                return Ok(activity);
            }

            Self::close_activity(&mut transaction, &active_activity, input.started_at).await?;
        }

        let activity = Self::insert(&mut transaction, input).await?;
        transaction.commit().await?;
        return Ok(activity);
    }

    pub async fn close_active(
        pool: &Pool<Sqlite>,
        ended_at: i64,
    ) -> Result<(), ForegroundActivityRepositoryError> {
        let mut transaction = pool.begin().await?;
        if let Some(active_activity) = Self::get_active(&mut transaction).await? {
            Self::close_activity(&mut transaction, &active_activity, ended_at).await?;
        }

        transaction.commit().await?;
        return Ok(());
    }

    pub async fn list_for_time_range(
        pool: &Pool<Sqlite>,
        input: ListForegroundActivitiesForTimeRangeInput,
    ) -> Result<Vec<ForegroundActivity>, ForegroundActivityRepositoryError> {
        input.validate()?;

        let rows = sqlx::query_as::<_, ForegroundActivityRow>(
            "SELECT id, app_id, website_id, capture_level, window_title, window_id, window_x, window_y, window_width, window_height, browser_url, browser_is_private, started_at, ended_at, updated_at, created_at
            FROM activity_foreground
            WHERE started_at < ?
                AND COALESCE(ended_at, ?) > ?
            ORDER BY started_at ASC, id ASC",
        )
        .bind(input.ended_at)
        .bind(input.ended_at)
        .bind(input.started_at)
        .fetch_all(pool)
        .await?;

        return rows
            .into_iter()
            .map(Self::build_activity)
            .collect::<Result<Vec<_>, _>>();
    }

    async fn get_active(
        transaction: &mut Transaction<'_, Sqlite>,
    ) -> Result<Option<ForegroundActivity>, ForegroundActivityRepositoryError> {
        let row = sqlx::query_as::<_, ForegroundActivityRow>(
            "SELECT id, app_id, website_id, capture_level, window_title, window_id, window_x, window_y, window_width, window_height, browser_url, browser_is_private, started_at, ended_at, updated_at, created_at
            FROM activity_foreground
            WHERE ended_at IS NULL",
        )
        .fetch_optional(&mut **transaction)
        .await?;

        let Some(row) = row else {
            return Ok(None);
        };

        return Self::build_activity(row).map(Some);
    }

    async fn close_activity(
        transaction: &mut Transaction<'_, Sqlite>,
        activity: &ForegroundActivity,
        ended_at: i64,
    ) -> Result<(), ForegroundActivityRepositoryError> {
        if ended_at < activity.started_at {
            return Err(ForegroundActivityRepositoryError::InvalidData(format!(
                "Foreground activity cannot end before it starts: {} < {}",
                ended_at, activity.started_at
            )));
        }

        sqlx::query(
            "UPDATE activity_foreground
            SET ended_at = ?
            WHERE id = ?",
        )
        .bind(ended_at)
        .bind(activity.id)
        .execute(&mut **transaction)
        .await?;

        return Ok(());
    }

    async fn insert(
        transaction: &mut Transaction<'_, Sqlite>,
        input: RecordForegroundActivityInput,
    ) -> Result<ForegroundActivity, ForegroundActivityRepositoryError> {
        let row = sqlx::query_as::<_, ForegroundActivityRow>(
            "INSERT INTO activity_foreground (
                app_id,
                website_id,
                capture_level,
                window_title,
                window_id,
                window_x,
                window_y,
                window_width,
                window_height,
                browser_url,
                browser_is_private,
                started_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, app_id, website_id, capture_level, window_title, window_id, window_x, window_y, window_width, window_height, browser_url, browser_is_private, started_at, ended_at, updated_at, created_at",
        )
        .bind(input.app_id)
        .bind(input.website_id)
        .bind(input.capture_level.as_str())
        .bind(input.window_title)
        .bind(input.window_id)
        .bind(input.window_x)
        .bind(input.window_y)
        .bind(input.window_width)
        .bind(input.window_height)
        .bind(input.browser_url)
        .bind(input.browser_is_private.map(i64::from))
        .bind(input.started_at)
        .fetch_one(&mut **transaction)
        .await?;

        return Self::build_activity(row);
    }

    async fn update_activity_details(
        transaction: &mut Transaction<'_, Sqlite>,
        activity: &ForegroundActivity,
        input: RecordForegroundActivityInput,
    ) -> Result<ForegroundActivity, ForegroundActivityRepositoryError> {
        let row = sqlx::query_as::<_, ForegroundActivityRow>(
            "UPDATE activity_foreground
            SET website_id = ?,
                capture_level = ?,
                window_title = ?,
                window_id = ?,
                window_x = ?,
                window_y = ?,
                window_width = ?,
                window_height = ?,
                browser_url = ?,
                browser_is_private = ?
            WHERE id = ?
            RETURNING id, app_id, website_id, capture_level, window_title, window_id, window_x, window_y, window_width, window_height, browser_url, browser_is_private, started_at, ended_at, updated_at, created_at",
        )
        .bind(input.website_id)
        .bind(input.capture_level.as_str())
        .bind(input.window_title)
        .bind(input.window_id)
        .bind(input.window_x)
        .bind(input.window_y)
        .bind(input.window_width)
        .bind(input.window_height)
        .bind(input.browser_url)
        .bind(input.browser_is_private.map(i64::from))
        .bind(activity.id)
        .fetch_one(&mut **transaction)
        .await?;

        return Self::build_activity(row);
    }

    fn build_activity(
        row: ForegroundActivityRow,
    ) -> Result<ForegroundActivity, ForegroundActivityRepositoryError> {
        return Ok(ForegroundActivity {
            id: row.id,
            app_id: row.app_id,
            website_id: row.website_id,
            capture_level: ForegroundActivityCaptureLevel::from_str(&row.capture_level)
                .map_err(ForegroundActivityRepositoryError::InvalidData)?,
            window_title: row.window_title,
            window_id: row.window_id,
            window_x: row.window_x,
            window_y: row.window_y,
            window_width: row.window_width,
            window_height: row.window_height,
            browser_url: row.browser_url,
            browser_is_private: bool_from_database(row.browser_is_private)?,
            started_at: row.started_at,
            ended_at: row.ended_at,
            updated_at: row.updated_at,
            created_at: row.created_at,
        });
    }
}

#[derive(Debug)]
pub enum ForegroundActivityRepositoryError {
    Database(sqlx::Error),
    InvalidData(String),
}

impl fmt::Display for ForegroundActivityRepositoryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::Database(error) => write!(f, "{}", error),
            Self::InvalidData(message) => write!(f, "{}", message),
        };
    }
}

impl From<sqlx::Error> for ForegroundActivityRepositoryError {
    fn from(value: sqlx::Error) -> Self {
        return Self::Database(value);
    }
}

// MARK: - Input

#[derive(Debug, Clone, PartialEq)]
pub struct RecordForegroundActivityInput {
    pub app_id: i64,
    pub website_id: Option<i64>,
    pub capture_level: ForegroundActivityCaptureLevel,
    pub window_title: Option<String>,
    pub window_id: Option<i64>,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_width: Option<f64>,
    pub window_height: Option<f64>,
    pub browser_url: Option<String>,
    pub browser_is_private: Option<bool>,
    pub started_at: i64,
}

impl RecordForegroundActivityInput {
    fn matches_activity(&self, activity: &ForegroundActivity) -> bool {
        return activity.app_id == self.app_id
            && activity.website_id == self.website_id
            && activity.capture_level == self.capture_level
            && activity.window_title == self.window_title
            && activity.window_id == self.window_id
            && activity.window_x == self.window_x
            && activity.window_y == self.window_y
            && activity.window_width == self.window_width
            && activity.window_height == self.window_height
            && activity.browser_url == self.browser_url
            && activity.browser_is_private == self.browser_is_private;
    }

    fn validate(&self) -> Result<(), ForegroundActivityRepositoryError> {
        match self.capture_level {
            ForegroundActivityCaptureLevel::App => {
                if self.has_window_data() || self.has_browser_data() {
                    return Err(ForegroundActivityRepositoryError::InvalidData(
                        "App-level foreground activity cannot include window or browser details"
                            .to_string(),
                    ));
                }
            }
            ForegroundActivityCaptureLevel::Window => {
                if self.has_browser_data() {
                    return Err(ForegroundActivityRepositoryError::InvalidData(
                        "Window-level foreground activity cannot include browser details"
                            .to_string(),
                    ));
                }

                if !self.has_window_data() {
                    return Err(ForegroundActivityRepositoryError::InvalidData(
                        "Window-level foreground activity requires window details".to_string(),
                    ));
                }
            }
            ForegroundActivityCaptureLevel::Browser => {
                if !self.has_browser_data() {
                    return Err(ForegroundActivityRepositoryError::InvalidData(
                        "Browser-level foreground activity requires browser details".to_string(),
                    ));
                }
            }
        }

        return Ok(());
    }

    fn has_window_data(&self) -> bool {
        return self.window_title.is_some()
            || self.window_id.is_some()
            || self.window_x.is_some()
            || self.window_y.is_some()
            || self.window_width.is_some()
            || self.window_height.is_some();
    }

    fn has_browser_data(&self) -> bool {
        return self.website_id.is_some()
            || self.browser_url.is_some()
            || self.browser_is_private.is_some();
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ListForegroundActivitiesForTimeRangeInput {
    pub started_at: i64,
    pub ended_at: i64,
}

impl ListForegroundActivitiesForTimeRangeInput {
    fn validate(&self) -> Result<(), ForegroundActivityRepositoryError> {
        if self.ended_at <= self.started_at {
            return Err(ForegroundActivityRepositoryError::InvalidData(format!(
                "Foreground activity time range must end after it starts: {} <= {}",
                self.ended_at, self.started_at
            )));
        }

        return Ok(());
    }
}

// MARK: - Row

#[derive(Debug, Clone, FromRow)]
struct ForegroundActivityRow {
    id: i64,
    app_id: i64,
    website_id: Option<i64>,
    capture_level: String,
    window_title: Option<String>,
    window_id: Option<i64>,
    window_x: Option<f64>,
    window_y: Option<f64>,
    window_width: Option<f64>,
    window_height: Option<f64>,
    browser_url: Option<String>,
    browser_is_private: Option<i64>,
    started_at: i64,
    ended_at: Option<i64>,
    updated_at: i64,
    created_at: i64,
}

fn bool_from_database(
    value: Option<i64>,
) -> Result<Option<bool>, ForegroundActivityRepositoryError> {
    return match value {
        None => Ok(None),
        Some(0) => Ok(Some(false)),
        Some(1) => Ok(Some(true)),
        Some(value) => Err(ForegroundActivityRepositoryError::InvalidData(format!(
            "Invalid browser_is_private value: {value}"
        ))),
    };
}
