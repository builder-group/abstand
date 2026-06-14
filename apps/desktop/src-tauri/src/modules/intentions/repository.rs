use super::{
    intention::{
        Intention, IntentionBehavior, IntentionBlock, IntentionBlockScope, IntentionCondition,
        IntentionConditionAfterTransitionRule, IntentionConditionDateTimeRule,
        IntentionConditionRule, IntentionConditionScheduleRule, IntentionConditionTransition,
        IntentionEnforcementMode, IntentionSession, IntentionSessionStatus,
    },
    timed_evaluator::{
        TimedAfterTransitionRule, TimedCondition, TimedConditionRule, TimedConditionTransition,
        TimedDateTimeRule, TimedScheduleRule,
    },
    types::IntentionBehaviorType,
};
use crate::{
    common::time::{DateOnly, TimeOnly, WeekdayMask},
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

    pub async fn get_timed_conditions(
        pool: &Pool<Sqlite>,
    ) -> Result<Vec<TimedCondition>, IntentionRepositoryError> {
        let rows = sqlx::query_as::<_, TimedConditionRow>(
            "SELECT
                c.intention_id,
                c.id AS condition_id,
                c.transition,
                c.rule_type,
                c.created_at,
                date_time.trigger_at,
                schedule.time_of_day_ms,
                schedule.weekdays_mask,
                after_transition.anchor_transition,
                after_transition.offset_ms
            FROM intention_condition c
            LEFT JOIN intention_condition_date_time date_time
                ON date_time.condition_id = c.id
                    AND c.rule_type = 'date_time'
            LEFT JOIN intention_condition_schedule schedule
                ON schedule.condition_id = c.id
                    AND c.rule_type = 'schedule'
            LEFT JOIN intention_condition_after_transition after_transition
                ON after_transition.condition_id = c.id
                    AND c.rule_type = 'after_transition'
            WHERE c.rule_type IN ('date_time', 'schedule', 'after_transition')
            ORDER BY c.intention_id ASC, c.id ASC",
        )
        .fetch_all(pool)
        .await?;

        return rows
            .into_iter()
            .map(Self::build_timed_condition)
            .collect::<Result<Vec<_>, _>>();
    }

    pub async fn create(
        pool: &Pool<Sqlite>,
        input: WriteIntentionInput,
    ) -> Result<Intention, IntentionRepositoryError> {
        let mut transaction = pool.begin().await?;

        let WriteIntentionInput {
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
            WriteIntentionBehaviorInput::Block(block_input) => {
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

    pub async fn update(
        pool: &Pool<Sqlite>,
        intention_id: i64,
        input: WriteIntentionInput,
    ) -> Result<Option<Intention>, IntentionRepositoryError> {
        let mut transaction = pool.begin().await?;

        let WriteIntentionInput {
            name,
            behavior,
            conditions,
        } = input;

        let behavior_type = IntentionBehaviorType::from(&behavior);
        let result = sqlx::query("UPDATE intention SET name = ?, behavior_type = ? WHERE id = ?")
            .bind(&name)
            .bind(behavior_type.as_str())
            .bind(intention_id)
            .execute(&mut *transaction)
            .await?;

        if result.rows_affected() == 0 {
            transaction.rollback().await?;
            return Ok(None);
        }

        sqlx::query("DELETE FROM intention_condition WHERE intention_id = ?")
            .bind(intention_id)
            .execute(&mut *transaction)
            .await?;
        sqlx::query("DELETE FROM intention_block WHERE intention_id = ?")
            .bind(intention_id)
            .execute(&mut *transaction)
            .await?;

        match behavior {
            WriteIntentionBehaviorInput::Block(block_input) => {
                Self::create_block(&mut transaction, intention_id, block_input).await?;
            }
        }

        Self::create_conditions(&mut transaction, intention_id, conditions).await?;

        transaction.commit().await?;

        let intention = Self::get_by_id(pool, intention_id).await?.ok_or_else(|| {
            IntentionRepositoryError::InvalidData(format!(
                "Updated intention {} could not be reloaded",
                intention_id
            ))
        })?;
        return Ok(Some(intention));
    }

    pub async fn delete(
        pool: &Pool<Sqlite>,
        intention_id: i64,
    ) -> Result<bool, IntentionRepositoryError> {
        let result = sqlx::query("DELETE FROM intention WHERE id = ?")
            .bind(intention_id)
            .execute(pool)
            .await?;

        return Ok(result.rows_affected() > 0);
    }

    async fn create_block(
        transaction: &mut sqlx::Transaction<'_, Sqlite>,
        intention_id: i64,
        block_input: WriteIntentionBlockInput,
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
        conditions: Vec<WriteIntentionConditionInput>,
    ) -> Result<(), IntentionRepositoryError> {
        for condition in conditions {
            let condition_id = sqlx::query_scalar::<_, i64>(
                "INSERT INTO intention_condition (intention_id, transition, rule_type) VALUES (?, ?, ?) RETURNING id",
            )
            .bind(intention_id)
            .bind(condition.transition.as_str())
            .bind(condition.rule.as_str())
            .fetch_one(&mut **transaction)
            .await?;

            match condition.rule {
                IntentionConditionRule::Schedule(schedule_rule) => {
                    sqlx::query(
                        "INSERT INTO intention_condition_schedule (condition_id, time_of_day_ms, weekdays_mask) VALUES (?, ?, ?)",
                    )
                    .bind(condition_id)
                    .bind(schedule_rule.time_of_day_ms.as_millis_since_midnight())
                    .bind(schedule_rule.weekdays_mask.map(|mask| mask.as_bits()))
                    .execute(&mut **transaction)
                    .await?;
                }
                IntentionConditionRule::DateTime(date_time_rule) => {
                    sqlx::query(
                        "INSERT INTO intention_condition_date_time (condition_id, date_epoch_days, time_of_day_ms, trigger_at) VALUES (?, ?, ?, ?)",
                    )
                    .bind(condition_id)
                    .bind(date_time_rule.date_epoch_days.as_epoch_days())
                    .bind(date_time_rule.time_of_day_ms.as_millis_since_midnight())
                    .bind(date_time_rule.trigger_at)
                    .execute(&mut **transaction)
                    .await?;
                }
                IntentionConditionRule::AfterTransition(after_transition_rule) => {
                    sqlx::query(
                        "INSERT INTO intention_condition_after_transition (condition_id, anchor_transition, offset_ms) VALUES (?, ?, ?)",
                    )
                    .bind(condition_id)
                    .bind(after_transition_rule.anchor_transition.as_str())
                    .bind(after_transition_rule.offset_ms)
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
        let condition_after_transition_rows =
            Self::load_condition_after_transition_rows(pool, &condition_ids).await?;
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
        let mut condition_after_transition_rows_by_condition_id = condition_after_transition_rows
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
                    let after_transition_row =
                        condition_after_transition_rows_by_condition_id.remove(&row.id);
                    return Self::build_condition(
                        row,
                        schedule_row,
                        date_time_row,
                        after_transition_row,
                    );
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
            "SELECT id, intention_id, transition, rule_type, updated_at, created_at FROM intention_condition WHERE intention_id IN (",
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
            "SELECT condition_id, time_of_day_ms, weekdays_mask FROM intention_condition_schedule WHERE condition_id IN (",
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
            "SELECT condition_id, date_epoch_days, time_of_day_ms, trigger_at FROM intention_condition_date_time WHERE condition_id IN (",
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

    async fn load_condition_after_transition_rows(
        pool: &Pool<Sqlite>,
        condition_ids: &[i64],
    ) -> Result<Vec<IntentionConditionAfterTransitionRow>, IntentionRepositoryError> {
        if condition_ids.is_empty() {
            return Ok(Vec::new());
        }

        let mut query_builder = QueryBuilder::<Sqlite>::new(
            "SELECT condition_id, anchor_transition, offset_ms FROM intention_condition_after_transition WHERE condition_id IN (",
        );
        let mut separated = query_builder.separated(", ");
        for condition_id in condition_ids {
            separated.push_bind(condition_id);
        }
        separated.push_unseparated(")");

        return query_builder
            .build_query_as::<IntentionConditionAfterTransitionRow>()
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
        after_transition_row: Option<IntentionConditionAfterTransitionRow>,
    ) -> Result<IntentionCondition, IntentionRepositoryError> {
        let transition = IntentionConditionTransition::from_str(&row.transition)
            .map_err(IntentionRepositoryError::InvalidData)?;
        let rule = match row.rule_type.as_str() {
            "schedule" => {
                let schedule_row = schedule_row.ok_or_else(|| {
                    IntentionRepositoryError::InvalidData(
                        "Missing schedule payload for schedule condition".to_string(),
                    )
                })?;

                IntentionConditionRule::Schedule(IntentionConditionScheduleRule {
                    time_of_day_ms: TimeOnly::from_millis_since_midnight(
                        schedule_row.time_of_day_ms,
                    )
                    .map_err(IntentionRepositoryError::InvalidData)?,
                    weekdays_mask: schedule_row
                        .weekdays_mask
                        .map(WeekdayMask::from_bits)
                        .transpose()
                        .map_err(IntentionRepositoryError::InvalidData)?,
                })
            }
            "date_time" => {
                let date_time_row = date_time_row.ok_or_else(|| {
                    IntentionRepositoryError::InvalidData(
                        "Missing date-time payload for date-time condition".to_string(),
                    )
                })?;

                IntentionConditionRule::DateTime(IntentionConditionDateTimeRule {
                    date_epoch_days: DateOnly::from_epoch_days(date_time_row.date_epoch_days)
                        .map_err(IntentionRepositoryError::InvalidData)?,
                    time_of_day_ms: TimeOnly::from_millis_since_midnight(
                        date_time_row.time_of_day_ms,
                    )
                    .map_err(IntentionRepositoryError::InvalidData)?,
                    trigger_at: date_time_row.trigger_at,
                })
            }
            "after_transition" => {
                let after_transition_row = after_transition_row.ok_or_else(|| {
                    IntentionRepositoryError::InvalidData(
                        "Missing after-transition payload for after-transition condition"
                            .to_string(),
                    )
                })?;
                let anchor_transition =
                    IntentionConditionTransition::from_str(&after_transition_row.anchor_transition)
                        .map_err(IntentionRepositoryError::InvalidData)?;
                IntentionConditionRule::AfterTransition(IntentionConditionAfterTransitionRule {
                    anchor_transition,
                    offset_ms: after_transition_row.offset_ms,
                })
            }
            "manual" => IntentionConditionRule::Manual,
            _ => {
                return Err(IntentionRepositoryError::InvalidData(format!(
                    "Unknown intention condition type: {}",
                    row.rule_type
                )));
            }
        };

        return Ok(IntentionCondition {
            id: row.id,
            transition,
            rule,
            updated_at: row.updated_at,
            created_at: row.created_at,
        });
    }

    fn build_timed_condition(
        row: TimedConditionRow,
    ) -> Result<TimedCondition, IntentionRepositoryError> {
        let rule = match row.rule_type.as_str() {
            "date_time" => {
                let trigger_at = row.trigger_at.ok_or_else(|| {
                    IntentionRepositoryError::InvalidData(
                        "Missing date-time payload for timed date-time condition".to_string(),
                    )
                })?;

                TimedConditionRule::DateTime(TimedDateTimeRule { trigger_at })
            }
            "schedule" => {
                let time_of_day_ms = row.time_of_day_ms.ok_or_else(|| {
                    IntentionRepositoryError::InvalidData(
                        "Missing schedule payload for timed condition".to_string(),
                    )
                })?;

                TimedConditionRule::Schedule(TimedScheduleRule {
                    time_of_day_ms: TimeOnly::from_millis_since_midnight(time_of_day_ms)
                        .map_err(IntentionRepositoryError::InvalidData)?,
                    weekdays_mask: row
                        .weekdays_mask
                        .map(WeekdayMask::from_bits)
                        .transpose()
                        .map_err(IntentionRepositoryError::InvalidData)?,
                })
            }
            "after_transition" => {
                let anchor_transition = row.anchor_transition.ok_or_else(|| {
                    IntentionRepositoryError::InvalidData(
                        "Missing after-transition payload for timed condition".to_string(),
                    )
                })?;
                let offset_ms = row.offset_ms.ok_or_else(|| {
                    IntentionRepositoryError::InvalidData(
                        "Missing after-transition payload for timed condition".to_string(),
                    )
                })?;

                TimedConditionRule::AfterTransition(TimedAfterTransitionRule {
                    anchor_transition: IntentionConditionTransition::from_str(&anchor_transition)
                        .map_err(IntentionRepositoryError::InvalidData)?,
                    offset_ms,
                })
            }
            _ => {
                return Err(IntentionRepositoryError::InvalidData(format!(
                    "Unknown timed condition rule type: {}",
                    row.rule_type
                )));
            }
        };

        let transition = match row.transition.as_str() {
            "start" => TimedConditionTransition::Start,
            "end" => TimedConditionTransition::End,
            _ => {
                return Err(IntentionRepositoryError::InvalidData(format!(
                    "Unknown timed condition transition: {}",
                    row.transition
                )));
            }
        };

        return Ok(TimedCondition {
            intention_id: row.intention_id,
            condition_id: row.condition_id,
            transition,
            rule,
            created_at: row.created_at,
        });
    }
}

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
    transition: String,
    rule_type: String,
    updated_at: i64,
    created_at: i64,
}

#[derive(Debug, Clone, FromRow)]
struct IntentionConditionScheduleRow {
    condition_id: i64,
    time_of_day_ms: i32,
    weekdays_mask: Option<i32>,
}

#[derive(Debug, Clone, FromRow)]
struct IntentionConditionDateTimeRow {
    condition_id: i64,
    date_epoch_days: i32,
    time_of_day_ms: i32,
    trigger_at: i64,
}

#[derive(Debug, Clone, FromRow)]
struct IntentionConditionAfterTransitionRow {
    condition_id: i64,
    anchor_transition: String,
    offset_ms: i64,
}

#[derive(Debug, Clone, FromRow)]
struct TimedConditionRow {
    intention_id: i64,
    condition_id: i64,
    transition: String,
    rule_type: String,
    created_at: i64,
    trigger_at: Option<i64>,
    time_of_day_ms: Option<i32>,
    weekdays_mask: Option<i32>,
    anchor_transition: Option<String>,
    offset_ms: Option<i64>,
}

pub struct WriteIntentionInput {
    pub name: String,
    pub behavior: WriteIntentionBehaviorInput,
    pub conditions: Vec<WriteIntentionConditionInput>,
}

pub enum WriteIntentionBehaviorInput {
    Block(WriteIntentionBlockInput),
}

impl From<&WriteIntentionBehaviorInput> for IntentionBehaviorType {
    fn from(value: &WriteIntentionBehaviorInput) -> Self {
        return match value {
            WriteIntentionBehaviorInput::Block(_) => IntentionBehaviorType::Block,
        };
    }
}

pub struct WriteIntentionBlockInput {
    pub enforcement_mode: IntentionEnforcementMode,
    pub scope: IntentionBlockScope,
    pub apps: Vec<UpsertAppInput>,
    pub websites: Vec<UpsertWebsiteInput>,
}

pub struct WriteIntentionConditionInput {
    pub transition: IntentionConditionTransition,
    pub rule: IntentionConditionRule,
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

// MARK: - Intention Session Repository

pub struct IntentionSessionRepository;

impl IntentionSessionRepository {
    pub async fn get_active_sessions(
        pool: &Pool<Sqlite>,
    ) -> Result<Vec<IntentionSession>, IntentionSessionRepositoryError> {
        let rows = sqlx::query_as::<_, IntentionSessionRow>(
            "SELECT id, intention_id, status, started_at, start_condition_id, ended_at, end_condition_id, updated_at, created_at FROM intention_session WHERE status = 'active' ORDER BY started_at ASC, id ASC",
        )
        .fetch_all(pool)
        .await?;

        return rows
            .into_iter()
            .map(Self::build_session)
            .collect::<Result<Vec<_>, _>>();
    }

    pub async fn get_finished_sessions_ended_in_range(
        pool: &Pool<Sqlite>,
        start_at: i64,
        end_at: i64,
    ) -> Result<Vec<IntentionSession>, IntentionSessionRepositoryError> {
        let rows = sqlx::query_as::<_, IntentionSessionRow>(
            "SELECT id, intention_id, status, started_at, start_condition_id, ended_at, end_condition_id, updated_at, created_at
            FROM intention_session
            WHERE status IN ('completed', 'stopped')
                AND ended_at IS NOT NULL
                AND ended_at >= ?
                AND ended_at < ?
            ORDER BY ended_at DESC, id DESC",
        )
        .bind(start_at)
        .bind(end_at)
        .fetch_all(pool)
        .await?;

        return rows
            .into_iter()
            .map(Self::build_session)
            .collect::<Result<Vec<_>, _>>();
    }

    pub async fn has_active_block_session_with_enforcement(
        pool: &Pool<Sqlite>,
        enforcement_mode: IntentionEnforcementMode,
    ) -> Result<bool, IntentionSessionRepositoryError> {
        let exists = sqlx::query_scalar::<_, i64>(
            "SELECT EXISTS (
                SELECT 1
                FROM intention_session session
                INNER JOIN intention_block block
                    ON block.intention_id = session.intention_id
                WHERE session.status = 'active'
                    AND block.enforcement_mode = ?
                LIMIT 1
            )",
        )
        .bind(enforcement_mode.as_str())
        .fetch_one(pool)
        .await?;

        return Ok(exists != 0);
    }

    pub async fn get_active_session_by_intention_id(
        pool: &Pool<Sqlite>,
        intention_id: i64,
    ) -> Result<Option<IntentionSession>, IntentionSessionRepositoryError> {
        let row = sqlx::query_as::<_, IntentionSessionRow>(
            "SELECT id, intention_id, status, started_at, start_condition_id, ended_at, end_condition_id, updated_at, created_at FROM intention_session WHERE intention_id = ? AND status = 'active'",
        )
        .bind(intention_id)
        .fetch_optional(pool)
        .await?;

        return row.map(Self::build_session).transpose();
    }

    pub async fn get_active_session_started_at_by_intention_id(
        pool: &Pool<Sqlite>,
        intention_id: i64,
    ) -> Result<Option<i64>, IntentionSessionRepositoryError> {
        return sqlx::query_scalar::<_, i64>(
            "SELECT started_at
            FROM intention_session
            WHERE intention_id = ?
                AND status = 'active'",
        )
        .bind(intention_id)
        .fetch_optional(pool)
        .await
        .map_err(IntentionSessionRepositoryError::from);
    }

    pub async fn has_session_with_start_condition_id(
        pool: &Pool<Sqlite>,
        condition_id: i64,
    ) -> Result<bool, IntentionSessionRepositoryError> {
        let row = sqlx::query_scalar::<_, i64>(
            "SELECT 1
            FROM intention_session
            WHERE start_condition_id = ?
            LIMIT 1",
        )
        .bind(condition_id)
        .fetch_optional(pool)
        .await?;

        return Ok(row.is_some());
    }

    pub async fn get_latest_started_at_by_start_condition_id(
        pool: &Pool<Sqlite>,
        condition_id: i64,
    ) -> Result<Option<i64>, IntentionSessionRepositoryError> {
        return sqlx::query_scalar::<_, i64>(
            "SELECT started_at
            FROM intention_session
            WHERE start_condition_id = ?
            ORDER BY started_at DESC, id DESC
            LIMIT 1",
        )
        .bind(condition_id)
        .fetch_optional(pool)
        .await
        .map_err(IntentionSessionRepositoryError::from);
    }

    pub async fn get_latest_completed_at_by_intention_id(
        pool: &Pool<Sqlite>,
        intention_id: i64,
    ) -> Result<Option<i64>, IntentionSessionRepositoryError> {
        return sqlx::query_scalar::<_, i64>(
            "SELECT ended_at
            FROM intention_session
            WHERE intention_id = ?
                AND status = 'completed'
                AND ended_at IS NOT NULL
            ORDER BY ended_at DESC, id DESC
            LIMIT 1",
        )
        .bind(intention_id)
        .fetch_optional(pool)
        .await
        .map_err(IntentionSessionRepositoryError::from);
    }

    /// Creates a session if the intention exists and has no active session.
    ///
    /// Returns `None` when the insert is skipped, such as for an already-active or missing intention.
    pub async fn create_session_if_inactive(
        pool: &Pool<Sqlite>,
        input: CreateIntentionSessionInput,
    ) -> Result<Option<IntentionSession>, IntentionSessionRepositoryError> {
        let mut transaction = pool.begin().await?;

        Self::validate_session_condition(
            &mut transaction,
            input.intention_id,
            input.start_condition_id,
            IntentionConditionTransition::Start,
        )
        .await?;

        let row = sqlx::query_as::<_, IntentionSessionRow>(
            "INSERT INTO intention_session (intention_id, status, started_at, start_condition_id)
            SELECT id, 'active', ?, ?
            FROM intention
            WHERE id = ?
            ON CONFLICT DO NOTHING
            RETURNING id, intention_id, status, started_at, start_condition_id, ended_at, end_condition_id, updated_at, created_at",
        )
        .bind(input.started_at)
        .bind(input.start_condition_id)
        .bind(input.intention_id)
        .fetch_optional(&mut *transaction)
        .await?;

        transaction.commit().await?;

        return row.map(Self::build_session).transpose();
    }

    pub async fn complete_session(
        pool: &Pool<Sqlite>,
        input: CompleteIntentionSessionInput,
    ) -> Result<Option<IntentionSession>, IntentionSessionRepositoryError> {
        let mut transaction = pool.begin().await?;
        let session = Self::get_session_by_id(&mut *transaction, input.session_id)
            .await?
            .ok_or_else(|| {
                IntentionSessionRepositoryError::InvalidData(format!(
                    "Intention session {} does not exist",
                    input.session_id
                ))
            })?;

        Self::validate_session_condition(
            &mut transaction,
            session.intention_id,
            input.end_condition_id,
            IntentionConditionTransition::End,
        )
        .await?;

        let session_id = sqlx::query_scalar::<_, i64>(
            "UPDATE intention_session SET status = 'completed', ended_at = ?, end_condition_id = ? WHERE id = ? AND status = 'active' RETURNING id",
        )
        .bind(input.ended_at)
        .bind(input.end_condition_id)
        .bind(input.session_id)
        .fetch_optional(&mut *transaction)
        .await?;

        transaction.commit().await?;

        let Some(session_id) = session_id else {
            return Ok(None);
        };

        // Note: reload after commit so AFTER UPDATE triggers are reflected in updated_at
        let session = Self::get_session_by_id(pool, session_id)
            .await?
            .ok_or_else(|| {
                IntentionSessionRepositoryError::InvalidData(format!(
                    "Updated intention session {} could not be reloaded",
                    session_id
                ))
            })?;
        return Ok(Some(session));
    }

    pub async fn stop_session(
        pool: &Pool<Sqlite>,
        input: StopIntentionSessionInput,
    ) -> Result<Option<IntentionSession>, IntentionSessionRepositoryError> {
        let mut transaction = pool.begin().await?;

        let session_id = sqlx::query_scalar::<_, i64>(
            "UPDATE intention_session SET status = 'stopped', ended_at = ?, end_condition_id = NULL WHERE id = ? AND status = 'active' RETURNING id",
        )
        .bind(input.ended_at)
        .bind(input.session_id)
        .fetch_optional(&mut *transaction)
        .await?;

        transaction.commit().await?;

        let Some(session_id) = session_id else {
            return Ok(None);
        };

        // Note: reload after commit so AFTER UPDATE triggers are reflected in updated_at
        let session = Self::get_session_by_id(pool, session_id)
            .await?
            .ok_or_else(|| {
                IntentionSessionRepositoryError::InvalidData(format!(
                    "Updated intention session {} could not be reloaded",
                    session_id
                ))
            })?;
        return Ok(Some(session));
    }

    async fn get_session_by_id<'e, E>(
        executor: E,
        session_id: i64,
    ) -> Result<Option<IntentionSession>, IntentionSessionRepositoryError>
    where
        E: sqlx::Executor<'e, Database = Sqlite>,
    {
        let row = sqlx::query_as::<_, IntentionSessionRow>(
            "SELECT id, intention_id, status, started_at, start_condition_id, ended_at, end_condition_id, updated_at, created_at FROM intention_session WHERE id = ?",
        )
        .bind(session_id)
        .fetch_optional(executor)
        .await?;

        return row.map(Self::build_session).transpose();
    }

    async fn validate_session_condition(
        transaction: &mut sqlx::Transaction<'_, Sqlite>,
        intention_id: i64,
        condition_id: Option<i64>,
        transition: IntentionConditionTransition,
    ) -> Result<(), IntentionSessionRepositoryError> {
        let Some(condition_id) = condition_id else {
            return Ok(());
        };

        let condition = sqlx::query_as::<_, IntentionSessionConditionRow>(
            "SELECT intention_id, transition FROM intention_condition WHERE id = ?",
        )
        .bind(condition_id)
        .fetch_optional(&mut **transaction)
        .await?;

        let Some(condition) = condition else {
            return Err(IntentionSessionRepositoryError::InvalidData(format!(
                "Intention condition {} does not exist",
                condition_id
            )));
        };

        if condition.intention_id != intention_id {
            return Err(IntentionSessionRepositoryError::InvalidData(format!(
                "Intention condition {} does not belong to intention {}",
                condition_id, intention_id
            )));
        }

        if condition.transition != transition.as_str() {
            return Err(IntentionSessionRepositoryError::InvalidData(format!(
                "Intention condition {} is not a {} condition",
                condition_id,
                transition.as_str()
            )));
        }

        return Ok(());
    }

    fn build_session(
        row: IntentionSessionRow,
    ) -> Result<IntentionSession, IntentionSessionRepositoryError> {
        return Ok(IntentionSession {
            id: row.id,
            intention_id: row.intention_id,
            status: IntentionSessionStatus::from_str(&row.status)
                .map_err(IntentionSessionRepositoryError::InvalidData)?,
            started_at: row.started_at,
            start_condition_id: row.start_condition_id,
            ended_at: row.ended_at,
            end_condition_id: row.end_condition_id,
            updated_at: row.updated_at,
            created_at: row.created_at,
        });
    }
}

#[derive(Debug, Clone, FromRow)]
struct IntentionSessionRow {
    id: i64,
    intention_id: i64,
    status: String,
    started_at: i64,
    start_condition_id: Option<i64>,
    ended_at: Option<i64>,
    end_condition_id: Option<i64>,
    updated_at: i64,
    created_at: i64,
}

#[derive(Debug, Clone, FromRow)]
struct IntentionSessionConditionRow {
    intention_id: i64,
    transition: String,
}

pub struct CreateIntentionSessionInput {
    pub intention_id: i64,
    pub started_at: i64,
    pub start_condition_id: Option<i64>,
}

pub struct CompleteIntentionSessionInput {
    pub session_id: i64,
    pub ended_at: i64,
    pub end_condition_id: Option<i64>,
}

pub struct StopIntentionSessionInput {
    pub session_id: i64,
    pub ended_at: i64,
}

#[derive(Debug)]
pub enum IntentionSessionRepositoryError {
    Database(sqlx::Error),
    InvalidData(String),
}

impl fmt::Display for IntentionSessionRepositoryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::Database(error) => write!(f, "{}", error),
            Self::InvalidData(message) => write!(f, "{}", message),
        };
    }
}

impl From<sqlx::Error> for IntentionSessionRepositoryError {
    fn from(value: sqlx::Error) -> Self {
        return Self::Database(value);
    }
}
