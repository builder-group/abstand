use super::{
    intention::{
        Intention, IntentionBehavior, IntentionBlock, IntentionBlockScope, IntentionCondition,
        IntentionConditionDateTimeRule, IntentionConditionPhase, IntentionConditionRule,
        IntentionConditionScheduleRule, IntentionEnforcementMode,
    },
    types::IntentionBehaviorType,
};
use crate::{
    common::time::{DateOnly, TimeOnly, Weekday},
    modules::catalog::{
        repository::{
            CatalogRepository, CatalogRepositoryError, UpsertAppInput, UpsertWebsiteInput,
        },
        types::{App, Website},
    },
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

        let CreateIntentionInput {
            name,
            behavior,
            conditions,
        } = input;

        let behavior_type = IntentionBehaviorType::from(&behavior);
        let intention_id = sqlx::query_scalar::<_, i64>(
            "INSERT INTO intention (name, behavior_type) VALUES (?, ?) RETURNING id",
        )
        .bind(&name)
        .bind(behavior_type.as_str())
        .fetch_one(&mut *transaction)
        .await?;

        match behavior {
            CreateIntentionBehaviorInput::Block(block_input) => {
                Self::create_block(&mut transaction, intention_id, block_input).await?;
            }
        }

        Self::create_conditions(&mut transaction, intention_id, conditions).await?;

        transaction.commit().await?;

        let intention = Self::get_by_id(pool, intention_id).await?;
        return intention.ok_or_else(|| {
            IntentionRepositoryError::InvalidData(format!(
                "Created intention {} could not be reloaded",
                intention_id
            ))
        });
    }

    async fn create_block(
        transaction: &mut sqlx::Transaction<'_, Sqlite>,
        intention_id: i64,
        block_input: CreateIntentionBlockInput,
    ) -> Result<(), IntentionRepositoryError> {
        sqlx::query(
            "INSERT INTO intention_block (intention_id, enforcement_mode, scope) VALUES (?, ?, ?)",
        )
        .bind(intention_id)
        .bind(block_input.enforcement_mode.as_str())
        .bind(block_input.scope.as_str())
        .execute(&mut **transaction)
        .await?;

        for app in block_input.apps {
            let app_id = CatalogRepository::upsert_app(&mut **transaction, app).await?;
            sqlx::query(
                "INSERT INTO intention_block_app_target (intention_id, app_id) VALUES (?, ?)",
            )
            .bind(intention_id)
            .bind(app_id)
            .execute(&mut **transaction)
            .await?;
        }

        for website in block_input.websites {
            let website_id = CatalogRepository::upsert_website(&mut **transaction, website).await?;
            sqlx::query(
                "INSERT INTO intention_block_website_target (intention_id, website_id) VALUES (?, ?)",
            )
            .bind(intention_id)
            .bind(website_id)
            .execute(&mut **transaction)
            .await?;
        }

        return Ok(());
    }

    async fn create_conditions(
        transaction: &mut sqlx::Transaction<'_, Sqlite>,
        intention_id: i64,
        conditions: Vec<CreateIntentionConditionInput>,
    ) -> Result<(), IntentionRepositoryError> {
        for condition in conditions {
            let condition_id = sqlx::query_scalar::<_, i64>(
                "INSERT INTO intention_condition (intention_id, phase, rule_type) VALUES (?, ?, ?) RETURNING id",
            )
            .bind(intention_id)
            .bind(condition.phase.as_str())
            .bind(condition.rule.as_str())
            .fetch_one(&mut **transaction)
            .await?;

            match condition.rule {
                IntentionConditionRule::Schedule(schedule_rule) => {
                    let weekdays = match schedule_rule.weekdays {
                        Some(weekdays) => {
                            Some(serde_json::to_string(&weekdays).map_err(|error| {
                                IntentionRepositoryError::InvalidData(error.to_string())
                            })?)
                        }
                        None => None,
                    };

                    sqlx::query(
                        "INSERT INTO intention_condition_schedule (condition_id, time_of_day, weekdays) VALUES (?, ?, ?)",
                    )
                    .bind(condition_id)
                    .bind(schedule_rule.time_of_day.as_str())
                    .bind(weekdays)
                    .execute(&mut **transaction)
                    .await?;
                }
                IntentionConditionRule::DateTime(date_time_rule) => {
                    sqlx::query(
                        "INSERT INTO intention_condition_date_time (condition_id, date, time_of_day) VALUES (?, ?, ?)",
                    )
                    .bind(condition_id)
                    .bind(date_time_rule.date.as_str())
                    .bind(date_time_rule.time_of_day.as_str())
                    .execute(&mut **transaction)
                    .await?;
                }
                IntentionConditionRule::Manual => {}
            }
        }

        return Ok(());
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
        let condition_schedule_rows =
            Self::load_condition_schedule_rows(pool, &condition_ids).await?;
        let condition_date_time_rows =
            Self::load_condition_date_time_rows(pool, &condition_ids).await?;
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

        let mut condition_schedule_rows_by_condition_id = condition_schedule_rows
            .into_iter()
            .map(|row| (row.condition_id, row))
            .collect::<HashMap<_, _>>();
        let mut condition_date_time_rows_by_condition_id = condition_date_time_rows
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
                    let schedule_row = condition_schedule_rows_by_condition_id.remove(&row.id);
                    let date_time_row = condition_date_time_rows_by_condition_id.remove(&row.id);
                    return Self::build_condition(row, schedule_row, date_time_row);
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
        if intention_ids.is_empty() {
            return Ok(Vec::new());
        }

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

    async fn load_condition_schedule_rows(
        pool: &Pool<Sqlite>,
        condition_ids: &[i64],
    ) -> Result<Vec<IntentionConditionScheduleRow>, IntentionRepositoryError> {
        if condition_ids.is_empty() {
            return Ok(Vec::new());
        }

        let mut query_builder = QueryBuilder::<Sqlite>::new(
            "SELECT condition_id, time_of_day, weekdays FROM intention_condition_schedule WHERE condition_id IN (",
        );
        let mut separated = query_builder.separated(", ");
        for condition_id in condition_ids {
            separated.push_bind(condition_id);
        }
        separated.push_unseparated(")");

        return query_builder
            .build_query_as::<IntentionConditionScheduleRow>()
            .fetch_all(pool)
            .await
            .map_err(IntentionRepositoryError::from);
    }

    async fn load_condition_date_time_rows(
        pool: &Pool<Sqlite>,
        condition_ids: &[i64],
    ) -> Result<Vec<IntentionConditionDateTimeRow>, IntentionRepositoryError> {
        if condition_ids.is_empty() {
            return Ok(Vec::new());
        }

        let mut query_builder = QueryBuilder::<Sqlite>::new(
            "SELECT condition_id, date, time_of_day FROM intention_condition_date_time WHERE condition_id IN (",
        );
        let mut separated = query_builder.separated(", ");
        for condition_id in condition_ids {
            separated.push_bind(condition_id);
        }
        separated.push_unseparated(")");

        return query_builder
            .build_query_as::<IntentionConditionDateTimeRow>()
            .fetch_all(pool)
            .await
            .map_err(IntentionRepositoryError::from);
    }

    async fn load_block_rows(
        pool: &Pool<Sqlite>,
        intention_ids: &[i64],
    ) -> Result<Vec<IntentionBlockRow>, IntentionRepositoryError> {
        if intention_ids.is_empty() {
            return Ok(Vec::new());
        }

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
        if intention_ids.is_empty() {
            return Ok(Vec::new());
        }

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
        if intention_ids.is_empty() {
            return Ok(Vec::new());
        }

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
        schedule_row: Option<IntentionConditionScheduleRow>,
        date_time_row: Option<IntentionConditionDateTimeRow>,
    ) -> Result<IntentionCondition, IntentionRepositoryError> {
        let phase = IntentionConditionPhase::from_str(&row.phase)
            .map_err(IntentionRepositoryError::InvalidData)?;
        let rule = match row.rule_type.as_str() {
            "schedule" => {
                if date_time_row.is_some() {
                    return Err(IntentionRepositoryError::InvalidData(
                        "Schedule condition has date-time payload".to_string(),
                    ));
                }

                let schedule_row = schedule_row.ok_or_else(|| {
                    IntentionRepositoryError::InvalidData(
                        "Missing schedule payload for schedule condition".to_string(),
                    )
                })?;

                IntentionConditionRule::Schedule(IntentionConditionScheduleRule {
                    time_of_day: TimeOnly::parse(&schedule_row.time_of_day)
                        .map_err(IntentionRepositoryError::InvalidData)?,
                    weekdays: match schedule_row.weekdays {
                        Some(weekdays) => {
                            Some(serde_json::from_str::<Vec<Weekday>>(&weekdays).map_err(
                                |error| IntentionRepositoryError::InvalidData(error.to_string()),
                            )?)
                        }
                        None => None,
                    },
                })
            }
            "date_time" => {
                if schedule_row.is_some() {
                    return Err(IntentionRepositoryError::InvalidData(
                        "Date-time condition has schedule payload".to_string(),
                    ));
                }

                let date_time_row = date_time_row.ok_or_else(|| {
                    IntentionRepositoryError::InvalidData(
                        "Missing date-time payload for date-time condition".to_string(),
                    )
                })?;

                IntentionConditionRule::DateTime(IntentionConditionDateTimeRule {
                    date: DateOnly::parse(&date_time_row.date)
                        .map_err(IntentionRepositoryError::InvalidData)?,
                    time_of_day: TimeOnly::parse(&date_time_row.time_of_day)
                        .map_err(IntentionRepositoryError::InvalidData)?,
                })
            }
            "manual" => {
                if schedule_row.is_some() || date_time_row.is_some() {
                    return Err(IntentionRepositoryError::InvalidData(
                        "Manual condition has rule payload".to_string(),
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
struct IntentionConditionScheduleRow {
    condition_id: i64,
    time_of_day: String,
    weekdays: Option<String>,
}

#[derive(Debug, Clone, FromRow)]
struct IntentionConditionDateTimeRow {
    condition_id: i64,
    date: String,
    time_of_day: String,
}

// MARK: - Input

pub struct CreateIntentionInput {
    pub name: String,
    pub behavior: CreateIntentionBehaviorInput,
    pub conditions: Vec<CreateIntentionConditionInput>,
}

pub enum CreateIntentionBehaviorInput {
    Block(CreateIntentionBlockInput),
}

impl From<&CreateIntentionBehaviorInput> for IntentionBehaviorType {
    fn from(value: &CreateIntentionBehaviorInput) -> Self {
        return match value {
            CreateIntentionBehaviorInput::Block(_) => IntentionBehaviorType::Block,
        };
    }
}

pub struct CreateIntentionBlockInput {
    pub enforcement_mode: IntentionEnforcementMode,
    pub scope: IntentionBlockScope,
    pub apps: Vec<UpsertAppInput>,
    pub websites: Vec<UpsertWebsiteInput>,
}

pub struct CreateIntentionConditionInput {
    pub phase: IntentionConditionPhase,
    pub rule: IntentionConditionRule,
}
