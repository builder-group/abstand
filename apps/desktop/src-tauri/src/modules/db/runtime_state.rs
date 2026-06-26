use sqlx::{FromRow, Pool, Sqlite};
use std::fmt;

pub struct RuntimeStateRepository;

impl RuntimeStateRepository {
    pub async fn set_i64(
        pool: &Pool<Sqlite>,
        key: &str,
        value: i64,
    ) -> Result<(), RuntimeStateRepositoryError> {
        sqlx::query(
            "INSERT INTO runtime_state (key, value_json)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json",
        )
        .bind(key)
        .bind(
            serde_json::to_string(&value)
                .map_err(|error| RuntimeStateRepositoryError::InvalidData(error.to_string()))?,
        )
        .execute(pool)
        .await?;

        return Ok(());
    }

    pub async fn get_i64(
        pool: &Pool<Sqlite>,
        key: &str,
    ) -> Result<Option<i64>, RuntimeStateRepositoryError> {
        let row = sqlx::query_as::<_, RuntimeStateRow>(
            "SELECT key, value_json
            FROM runtime_state
            WHERE key = ?",
        )
        .bind(key)
        .fetch_optional(pool)
        .await?;

        let Some(row) = row else {
            return Ok(None);
        };

        let value = serde_json::from_str::<i64>(&row.value_json).map_err(|error| {
            RuntimeStateRepositoryError::InvalidData(format!(
                "Runtime state key {} does not contain an integer: {}",
                row.key, error
            ))
        })?;

        return Ok(Some(value));
    }
}

#[derive(Debug)]
pub enum RuntimeStateRepositoryError {
    Database(sqlx::Error),
    InvalidData(String),
}

impl fmt::Display for RuntimeStateRepositoryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::Database(error) => write!(f, "{}", error),
            Self::InvalidData(message) => write!(f, "{}", message),
        };
    }
}

impl From<sqlx::Error> for RuntimeStateRepositoryError {
    fn from(value: sqlx::Error) -> Self {
        return Self::Database(value);
    }
}

// MARK: - Row

#[derive(Debug, Clone, FromRow)]
struct RuntimeStateRow {
    key: String,
    value_json: String,
}
