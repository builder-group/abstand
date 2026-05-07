use super::{
    intention::{
        Intention, IntentionBehavior, IntentionBlock, IntentionBlockScope, IntentionCondition,
        IntentionConditionPhase, IntentionConditionRule, IntentionConditionTimeRule,
        IntentionEnforcementMode, IntentionWeekday,
    },
    types::IntentionBehaviorType,
};
use crate::modules::catalog::{
    repository::{CatalogRepository, CatalogRepositoryError},
    types::{App, Website},
};
use sqlx::{FromRow, Pool, QueryBuilder, Sqlite};
use std::{
    collections::{HashMap, HashSet},
    fmt,
};

pub struct IntentionRepository;

impl IntentionRepository {
    pub async fn get_all(pool: &Pool<Sqlite>) -> Result<Vec<Intention>, IntentionRepositoryError> {
        let bases = sqlx::query_as::<_, IntentionRow>(
            "SELECT id, name, behavior_type, updated_at, created_at FROM intention ORDER BY created_at ASC, id ASC",
        )
        .fetch_all(pool)
        .await?;

        return Self::hydrate_intentions(pool, bases).await;
    }

    pub async fn get_by_id(
        pool: &Pool<Sqlite>,
        intention_id: i64,
    ) -> Result<Option<Intention>, IntentionRepositoryError> {
        let base = sqlx::query_as::<_, IntentionRow>(
            "SELECT id, name, behavior_type, updated_at, created_at FROM intention WHERE id = ?",
        )
        .bind(intention_id)
        .fetch_optional(pool)
        .await?;

        let Some(base) = base else {
            return Ok(None);
        };

        let mut intentions = Self::hydrate_intentions(pool, vec![base]).await?;
        return Ok(intentions.pop());
    }

    pub async fn create(
        pool: &Pool<Sqlite>,
        input: CreateIntentionInput,
    ) -> Result<Intention, IntentionRepositoryError> {
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

        let intention = Self::get_by_id(pool, intention_id).await?;
        return intention.ok_or_else(|| {
            IntentionRepositoryError::InvalidData(format!(
                "Created intention {} could not be reloaded",
                intention_id
            ))
        });
    }

    async fn hydrate_intentions(
        pool: &Pool<Sqlite>,
        bases: Vec<IntentionRow>,
    ) -> Result<Vec<Intention>, IntentionRepositoryError> {
        if bases.is_empty() {
            return Ok(Vec::new());
        }

        let intention_ids = bases.iter().map(|base| base.id).collect::<Vec<_>>();
        let condition_rows = Self::load_condition_rows(pool, &intention_ids).await?;
        let condition_ids = condition_rows.iter().map(|row| row.id).collect::<Vec<_>>();
        let condition_time_rows = Self::load_condition_time_rows(pool, &condition_ids).await?;
        let block_rows = Self::load_block_rows(pool, &intention_ids).await?;
        let block_app_rows = Self::load_block_app_rows(pool, &intention_ids).await?;
        let block_website_rows = Self::load_block_website_rows(pool, &intention_ids).await?;

        let app_ids = block_app_rows
            .iter()
            .map(|row| row.app_id)
            .collect::<HashSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        let website_ids = block_website_rows
            .iter()
            .map(|row| row.website_id)
            .collect::<HashSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();

        let apps = CatalogRepository::get_apps_by_ids(pool, &app_ids).await?;
        let websites = CatalogRepository::get_websites_by_ids(pool, &website_ids).await?;

        let apps_by_id = apps
            .into_iter()
            .map(|app| (app.id, app))
            .collect::<HashMap<_, _>>();
        let websites_by_id = websites
            .into_iter()
            .map(|website| (website.id, website))
            .collect::<HashMap<_, _>>();

        let mut condition_rows_by_intention_id = HashMap::<i64, Vec<IntentionConditionRow>>::new();
        for row in condition_rows {
            condition_rows_by_intention_id
                .entry(row.intention_id)
                .or_default()
                .push(row);
        }

        let mut condition_time_rows_by_condition_id = condition_time_rows
            .into_iter()
            .map(|row| (row.condition_id, row))
            .collect::<HashMap<_, _>>();

        let mut block_rows_by_intention_id = block_rows
            .into_iter()
            .map(|row| (row.intention_id, row))
            .collect::<HashMap<_, _>>();

        let mut block_app_ids_by_intention_id = HashMap::<i64, Vec<i64>>::new();
        for row in block_app_rows {
            block_app_ids_by_intention_id
                .entry(row.intention_id)
                .or_default()
                .push(row.app_id);
        }

        let mut block_website_ids_by_intention_id = HashMap::<i64, Vec<i64>>::new();
        for row in block_website_rows {
            block_website_ids_by_intention_id
                .entry(row.intention_id)
                .or_default()
                .push(row.website_id);
        }

        let mut intentions = Vec::with_capacity(bases.len());
        for base in bases {
            let behavior_type = IntentionBehaviorType::from_str(&base.behavior_type)
                .map_err(IntentionRepositoryError::InvalidData)?;

            let behavior = match behavior_type {
                IntentionBehaviorType::Block => {
                    let block_row =
                        block_rows_by_intention_id.remove(&base.id).ok_or_else(|| {
                            IntentionRepositoryError::InvalidData(format!(
                                "Missing block config for intention {}",
                                base.id
                            ))
                        })?;

                    let app_ids = block_app_ids_by_intention_id
                        .remove(&base.id)
                        .unwrap_or_default();
                    let website_ids = block_website_ids_by_intention_id
                        .remove(&base.id)
                        .unwrap_or_default();

                    let apps = app_ids
                        .into_iter()
                        .filter_map(|app_id| apps_by_id.get(&app_id).cloned())
                        .collect::<Vec<_>>();
                    let websites = website_ids
                        .into_iter()
                        .filter_map(|website_id| websites_by_id.get(&website_id).cloned())
                        .collect::<Vec<_>>();

                    IntentionBehavior::Block(Self::build_block(block_row, apps, websites)?)
                }
                IntentionBehaviorType::Break => IntentionBehavior::Break,
            };

            let conditions = condition_rows_by_intention_id
                .remove(&base.id)
                .unwrap_or_default()
                .into_iter()
                .map(|row| {
                    let time_row = condition_time_rows_by_condition_id.remove(&row.id);
                    return Self::build_condition(row, time_row);
                })
                .collect::<Result<Vec<_>, _>>()?;

            intentions.push(Intention {
                id: base.id,
                name: base.name,
                behavior,
                conditions,
                updated_at: base.updated_at,
                created_at: base.created_at,
            });
        }

        return Ok(intentions);
    }

    async fn load_condition_rows(
        pool: &Pool<Sqlite>,
        intention_ids: &[i64],
    ) -> Result<Vec<IntentionConditionRow>, IntentionRepositoryError> {
        let mut query_builder = QueryBuilder::<Sqlite>::new(
            "SELECT id, intention_id, phase, rule_type, updated_at, created_at FROM intention_condition WHERE intention_id IN (",
        );
        let mut separated = query_builder.separated(", ");
        for intention_id in intention_ids {
            separated.push_bind(intention_id);
        }
        separated.push_unseparated(") ORDER BY intention_id ASC, created_at ASC, id ASC");

        return query_builder
            .build_query_as::<IntentionConditionRow>()
            .fetch_all(pool)
            .await
            .map_err(IntentionRepositoryError::from);
    }

    async fn load_condition_time_rows(
        pool: &Pool<Sqlite>,
        condition_ids: &[i64],
    ) -> Result<Vec<IntentionConditionTimeRow>, IntentionRepositoryError> {
        if condition_ids.is_empty() {
            return Ok(Vec::new());
        }

        let mut query_builder = QueryBuilder::<Sqlite>::new(
            "SELECT condition_id, time_of_day, weekdays FROM intention_condition_time WHERE condition_id IN (",
        );
        let mut separated = query_builder.separated(", ");
        for condition_id in condition_ids {
            separated.push_bind(condition_id);
        }
        separated.push_unseparated(")");

        return query_builder
            .build_query_as::<IntentionConditionTimeRow>()
            .fetch_all(pool)
            .await
            .map_err(IntentionRepositoryError::from);
    }

    async fn load_block_rows(
        pool: &Pool<Sqlite>,
        intention_ids: &[i64],
    ) -> Result<Vec<IntentionBlockRow>, IntentionRepositoryError> {
        let mut query_builder = QueryBuilder::<Sqlite>::new(
            "SELECT intention_id, enforcement_mode, scope FROM intention_block WHERE intention_id IN (",
        );
        let mut separated = query_builder.separated(", ");
        for intention_id in intention_ids {
            separated.push_bind(intention_id);
        }
        separated.push_unseparated(")");

        return query_builder
            .build_query_as::<IntentionBlockRow>()
            .fetch_all(pool)
            .await
            .map_err(IntentionRepositoryError::from);
    }

    async fn load_block_app_rows(
        pool: &Pool<Sqlite>,
        intention_ids: &[i64],
    ) -> Result<Vec<IntentionBlockAppRow>, IntentionRepositoryError> {
        let mut query_builder = QueryBuilder::<Sqlite>::new(
            "SELECT intention_id, app_id FROM intention_block_app_target WHERE intention_id IN (",
        );
        let mut separated = query_builder.separated(", ");
        for intention_id in intention_ids {
            separated.push_bind(intention_id);
        }
        separated.push_unseparated(") ORDER BY intention_id ASC, app_id ASC");

        return query_builder
            .build_query_as::<IntentionBlockAppRow>()
            .fetch_all(pool)
            .await
            .map_err(IntentionRepositoryError::from);
    }

    async fn load_block_website_rows(
        pool: &Pool<Sqlite>,
        intention_ids: &[i64],
    ) -> Result<Vec<IntentionBlockWebsiteRow>, IntentionRepositoryError> {
        let mut query_builder = QueryBuilder::<Sqlite>::new(
            "SELECT intention_id, website_id FROM intention_block_website_target WHERE intention_id IN (",
        );
        let mut separated = query_builder.separated(", ");
        for intention_id in intention_ids {
            separated.push_bind(intention_id);
        }
        separated.push_unseparated(") ORDER BY intention_id ASC, website_id ASC");

        return query_builder
            .build_query_as::<IntentionBlockWebsiteRow>()
            .fetch_all(pool)
            .await
            .map_err(IntentionRepositoryError::from);
    }

    fn build_block(
        row: IntentionBlockRow,
        apps: Vec<App>,
        websites: Vec<Website>,
    ) -> Result<IntentionBlock, IntentionRepositoryError> {
        return Ok(IntentionBlock {
            enforcement_mode: IntentionEnforcementMode::from_str(&row.enforcement_mode)
                .map_err(IntentionRepositoryError::InvalidData)?,
            scope: IntentionBlockScope::from_str(&row.scope)
                .map_err(IntentionRepositoryError::InvalidData)?,
            apps,
            websites,
        });
    }

    fn build_condition(
        row: IntentionConditionRow,
        time_row: Option<IntentionConditionTimeRow>,
    ) -> Result<IntentionCondition, IntentionRepositoryError> {
        let phase = IntentionConditionPhase::from_str(&row.phase)
            .map_err(IntentionRepositoryError::InvalidData)?;
        let rule = match row.rule_type.as_str() {
            "time" => {
                let time_row = time_row.ok_or_else(|| {
                    IntentionRepositoryError::InvalidData(
                        "Missing time payload for time condition".to_string(),
                    )
                })?;

                IntentionConditionRule::Time(IntentionConditionTimeRule {
                    time_of_day: time_row.time_of_day,
                    weekdays: match time_row.weekdays {
                        Some(weekdays) => Some(
                            serde_json::from_str::<Vec<IntentionWeekday>>(&weekdays).map_err(
                                |error| IntentionRepositoryError::InvalidData(error.to_string()),
                            )?,
                        ),
                        None => None,
                    },
                })
            }
            "manual" => {
                if time_row.is_some() {
                    return Err(IntentionRepositoryError::InvalidData(
                        "Manual condition has time payload".to_string(),
                    ));
                }

                IntentionConditionRule::Manual
            }
            _ => {
                return Err(IntentionRepositoryError::InvalidData(format!(
                    "Unknown intention condition type: {}",
                    row.rule_type
                )));
            }
        };

        return Ok(IntentionCondition {
            id: row.id,
            phase,
            rule,
            updated_at: row.updated_at,
            created_at: row.created_at,
        });
    }
}

#[derive(Debug)]
pub enum IntentionRepositoryError {
    Database(sqlx::Error),
    Catalog(CatalogRepositoryError),
    InvalidData(String),
}

impl fmt::Display for IntentionRepositoryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::Database(error) => write!(f, "{}", error),
            Self::Catalog(error) => write!(f, "{}", error),
            Self::InvalidData(message) => write!(f, "{}", message),
        };
    }
}

impl From<sqlx::Error> for IntentionRepositoryError {
    fn from(value: sqlx::Error) -> Self {
        return Self::Database(value);
    }
}

impl From<CatalogRepositoryError> for IntentionRepositoryError {
    fn from(value: CatalogRepositoryError) -> Self {
        return Self::Catalog(value);
    }
}

// MARK: - Row

#[derive(Debug, Clone, FromRow)]
struct IntentionRow {
    id: i64,
    name: String,
    behavior_type: String,
    updated_at: i64,
    created_at: i64,
}

#[derive(Debug, Clone, FromRow)]
struct IntentionConditionRow {
    id: i64,
    intention_id: i64,
    phase: String,
    rule_type: String,
    updated_at: i64,
    created_at: i64,
}

#[derive(Debug, Clone, FromRow)]
struct IntentionConditionTimeRow {
    condition_id: i64,
    time_of_day: String,
    weekdays: Option<String>,
}

#[derive(Debug, Clone, FromRow)]
struct IntentionBlockRow {
    intention_id: i64,
    enforcement_mode: String,
    scope: String,
}

#[derive(Debug, Clone, FromRow)]
struct IntentionBlockAppRow {
    intention_id: i64,
    app_id: i64,
}

#[derive(Debug, Clone, FromRow)]
struct IntentionBlockWebsiteRow {
    intention_id: i64,
    website_id: i64,
}

// MARK: - Input

pub struct CreateIntentionInput {
    pub name: String,
    pub behavior_type: IntentionBehaviorType,
}
