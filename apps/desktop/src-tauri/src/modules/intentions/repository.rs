use super::types::IntentionBehaviorType;
use sqlx::{FromRow, Pool, Sqlite};
use std::fmt;

pub struct IntentionRepository;

impl IntentionRepository {
    pub async fn get_by_id(
        pool: &Pool<Sqlite>,
        intention_id: i64,
    ) -> Result<Option<IntentionRowSet>, IntentionRepositoryError> {
        let base = sqlx::query_as::<_, IntentionRow>(
            "SELECT id, name, behavior_type, created_at FROM intention WHERE id = ?",
        )
        .bind(intention_id)
        .fetch_optional(pool)
        .await?;

        let Some(base) = base else {
            return Ok(None);
        };

        let conditions = sqlx::query_as::<_, IntentionConditionRow>(
            "SELECT id, condition_phase, condition_type, time_of_day, weekdays, created_at FROM intention_condition WHERE intention_id = ? ORDER BY created_at ASC, id ASC",
        )
        .bind(intention_id)
        .fetch_all(pool)
        .await?;

        let behavior_type = IntentionBehaviorType::from_str(&base.behavior_type)
            .map_err(IntentionRepositoryError::InvalidData)?;
        let block = match behavior_type {
            IntentionBehaviorType::Block => {
                Some(Self::get_block_row_set_by_id(pool, intention_id).await?)
            }
            IntentionBehaviorType::Break => None,
        };

        return Ok(Some(IntentionRowSet {
            base,
            block,
            conditions,
        }));
    }

    pub async fn create(
        pool: &Pool<Sqlite>,
        input: CreateIntentionInput,
    ) -> Result<IntentionRowSet, IntentionRepositoryError> {
        let mut transaction = pool.begin().await?;

        let insert_result =
            sqlx::query("INSERT INTO intention (name, behavior_type) VALUES (?, ?)")
                .bind(&input.name)
                .bind(input.behavior_type.as_str())
                .execute(&mut *transaction)
                .await?;
        let intention_id = insert_result.last_insert_rowid();

        if input.behavior_type == IntentionBehaviorType::Block {
            sqlx::query("INSERT INTO intention_block (intention_id) VALUES (?)")
                .bind(intention_id)
                .execute(&mut *transaction)
                .await?;
        }

        transaction.commit().await?;

        let row_set = Self::get_by_id(pool, intention_id).await?;
        return row_set.ok_or_else(|| {
            IntentionRepositoryError::InvalidData(format!(
                "Created intention {} could not be reloaded",
                intention_id
            ))
        });
    }

    async fn get_block_row_set_by_id(
        pool: &Pool<Sqlite>,
        intention_id: i64,
    ) -> Result<IntentionBlockRowSet, IntentionRepositoryError> {
        let config = sqlx::query_as::<_, IntentionBlockRow>(
            "SELECT enforcement_mode, target_scope, created_at FROM intention_block WHERE intention_id = ?",
        )
        .bind(intention_id)
        .fetch_optional(pool)
        .await?;

        let Some(config) = config else {
            return Err(IntentionRepositoryError::InvalidData(format!(
                "Missing block config for intention {}",
                intention_id
            )));
        };

        let app_ids = sqlx::query_scalar::<_, i64>(
            "SELECT app_id FROM intention_block_app WHERE intention_id = ? ORDER BY app_id ASC",
        )
        .bind(intention_id)
        .fetch_all(pool)
        .await?;

        let website_ids = sqlx::query_scalar::<_, i64>(
            "SELECT website_id FROM intention_block_website WHERE intention_id = ? ORDER BY website_id ASC",
        )
        .bind(intention_id)
        .fetch_all(pool)
        .await?;

        return Ok(IntentionBlockRowSet {
            config,
            app_ids,
            website_ids,
        });
    }
}

#[derive(Debug)]
pub enum IntentionRepositoryError {
    Database(sqlx::Error),
    InvalidData(String),
}

impl fmt::Display for IntentionRepositoryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::Database(error) => write!(f, "{}", error),
            Self::InvalidData(message) => write!(f, "{}", message),
        };
    }
}

impl From<sqlx::Error> for IntentionRepositoryError {
    fn from(value: sqlx::Error) -> Self {
        return Self::Database(value);
    }
}

// MARK: - Row

#[derive(Debug, Clone, FromRow)]
pub struct IntentionRow {
    pub id: i64,
    pub name: String,
    pub behavior_type: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, FromRow)]
pub struct IntentionConditionRow {
    pub id: i64,
    pub condition_phase: String,
    pub condition_type: String,
    pub time_of_day: Option<String>,
    pub weekdays: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, FromRow)]
pub struct IntentionBlockRow {
    pub enforcement_mode: String,
    pub target_scope: String,
    pub created_at: i64,
}

pub struct IntentionBlockRowSet {
    pub config: IntentionBlockRow,
    pub app_ids: Vec<i64>,
    pub website_ids: Vec<i64>,
}

pub struct IntentionRowSet {
    pub base: IntentionRow,
    pub block: Option<IntentionBlockRowSet>,
    pub conditions: Vec<IntentionConditionRow>,
}

// MARK: - Input

pub struct CreateIntentionInput {
    pub name: String,
    pub behavior_type: IntentionBehaviorType,
}
