use super::{
    condition_timing, edit_policy,
    intention::{
        Intention, IntentionBlockScope, IntentionBlockTargetAction,
        IntentionConditionAfterTransitionRule, IntentionConditionDateTimeRule,
        IntentionConditionRule, IntentionConditionScheduleRule, IntentionConditionTransition,
        IntentionEnforcementMode, IntentionSession,
    },
    repository::{
        IntentionRepository, IntentionSessionRepository, WriteIntentionBehaviorInput,
        WriteIntentionBlockAppTargetInput, WriteIntentionBlockInput,
        WriteIntentionBlockWebsiteTargetInput, WriteIntentionConditionInput, WriteIntentionInput,
    },
    timed_evaluator::{TimedConditionActivation, TimedConditionTransition},
    types::{
        IntentionCreatedEvent, IntentionDeletedEvent, IntentionRuntimeState, IntentionUpdatedEvent,
    },
};
use crate::{
    common::time::{
        local_day_bounds_containing, to_local_datetime, unix_ms_now, DateOnly, TimeOnly,
    },
    common::url::extract_hostname,
    modules::{
        catalog::repository::{UpsertAppInput, UpsertWebsiteInput},
        db::types::DatabaseState,
    },
};
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Sqlite};
use std::collections::{HashMap, HashSet};
use tauri::{AppHandle, State};
use tauri_specta::Event;

#[tauri::command]
#[specta::specta]
pub async fn get_intentions(
    database_state: State<'_, DatabaseState>,
) -> Result<Vec<Intention>, String> {
    return IntentionRepository::get_all(&database_state.pool)
        .await
        .map_err(|error| error.to_string());
}

#[tauri::command]
#[specta::specta]
pub async fn get_intention(
    database_state: State<'_, DatabaseState>,
    intention_id: i64,
) -> Result<Option<Intention>, String> {
    return IntentionRepository::get_by_id(&database_state.pool, intention_id)
        .await
        .map_err(|error| error.to_string());
}

#[tauri::command]
#[specta::specta]
pub async fn get_active_intention_sessions(
    database_state: State<'_, DatabaseState>,
) -> Result<Vec<IntentionSession>, String> {
    return IntentionSessionRepository::get_active_sessions(&database_state.pool)
        .await
        .map_err(|error| error.to_string());
}

#[tauri::command]
#[specta::specta]
pub async fn get_active_intention_session(
    database_state: State<'_, DatabaseState>,
    intention_id: i64,
) -> Result<Option<IntentionSession>, String> {
    return IntentionSessionRepository::get_active_session_by_intention_id(
        &database_state.pool,
        intention_id,
    )
    .await
    .map_err(|error| error.to_string());
}

#[tauri::command]
#[specta::specta]
pub async fn get_today_intention_overview(
    database_state: State<'_, DatabaseState>,
) -> Result<TodayIntentionOverviewDto, String> {
    let now = unix_ms_now();
    let active = get_today_active_intentions(&database_state.pool).await?;
    let upcoming_today = get_upcoming_today_intentions(&database_state.pool, now).await?;
    let earlier_today = get_earlier_today_intentions(&database_state.pool, now).await?;

    return Ok(TodayIntentionOverviewDto {
        active,
        upcoming_today,
        earlier_today,
    });
}

async fn get_today_active_intentions(
    pool: &Pool<Sqlite>,
) -> Result<Vec<TodayActiveIntentionDto>, String> {
    let active_sessions = IntentionSessionRepository::get_active_sessions(pool)
        .await
        .map_err(|error| error.to_string())?;

    let mut active = Vec::new();
    for session in active_sessions {
        let intention = IntentionRepository::get_by_id(pool, session.intention_id)
            .await
            .map_err(|error| error.to_string())?
            .ok_or_else(|| format!("Active Intention {} does not exist", session.intention_id))?;
        let automatic_end_at =
            condition_timing::automatic_intention_end_at(&intention.conditions, session.started_at);

        active.push(TodayActiveIntentionDto {
            intention,
            session,
            automatic_end_at,
        });
    }

    return Ok(active);
}

async fn get_upcoming_today_intentions(
    pool: &Pool<Sqlite>,
    now: i64,
) -> Result<Vec<TodayUpcomingIntentionDto>, String> {
    let today_bounds = local_day_bounds_containing(now)
        .ok_or_else(|| "Could not resolve local day bounds".to_string())?;
    let timed_conditions = IntentionRepository::get_timed_conditions(pool)
        .await
        .map_err(|error| error.to_string())?;

    let mut earliest_trigger_at_by_intention_id = HashMap::<i64, i64>::new();
    for condition in timed_conditions {
        if condition.transition != TimedConditionTransition::Start {
            continue;
        }

        let activation = condition
            .evaluate_activation(pool, now)
            .await
            .map_err(|error| error.to_string())?;
        let trigger_at = match activation {
            TimedConditionActivation::Future { trigger_at }
                if trigger_at > now && trigger_at < today_bounds.end_at =>
            {
                trigger_at
            }
            _ => continue,
        };

        earliest_trigger_at_by_intention_id
            .entry(condition.intention_id)
            .and_modify(|current| *current = (*current).min(trigger_at))
            .or_insert(trigger_at);
    }

    let mut intention_triggers = earliest_trigger_at_by_intention_id
        .into_iter()
        .collect::<Vec<_>>();
    intention_triggers.sort_by_key(|(intention_id, trigger_at)| (*trigger_at, *intention_id));

    let mut upcoming_today = Vec::new();
    for (intention_id, trigger_at) in intention_triggers {
        let intention = IntentionRepository::get_by_id(pool, intention_id)
            .await
            .map_err(|error| error.to_string())?
            .ok_or_else(|| format!("Upcoming Intention {} does not exist", intention_id))?;

        upcoming_today.push(TodayUpcomingIntentionDto {
            intention,
            trigger_at,
        });
    }

    return Ok(upcoming_today);
}

async fn get_earlier_today_intentions(
    pool: &Pool<Sqlite>,
    now: i64,
) -> Result<Vec<TodayEarlierIntentionDto>, String> {
    let today_bounds = local_day_bounds_containing(now)
        .ok_or_else(|| "Could not resolve local day bounds".to_string())?;
    let earlier_sessions = IntentionSessionRepository::get_finished_sessions_ended_in_range(
        pool,
        today_bounds.start_at,
        today_bounds.end_at,
    )
    .await
    .map_err(|error| error.to_string())?;

    let mut earlier_today = Vec::new();
    for session in earlier_sessions {
        let intention = IntentionRepository::get_by_id(pool, session.intention_id)
            .await
            .map_err(|error| error.to_string())?
            .ok_or_else(|| format!("Earlier Intention {} does not exist", session.intention_id))?;

        earlier_today.push(TodayEarlierIntentionDto { intention, session });
    }

    return Ok(earlier_today);
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TodayIntentionOverviewDto {
    pub active: Vec<TodayActiveIntentionDto>,
    pub upcoming_today: Vec<TodayUpcomingIntentionDto>,
    pub earlier_today: Vec<TodayEarlierIntentionDto>,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TodayActiveIntentionDto {
    pub intention: Intention,
    pub session: IntentionSession,
    pub automatic_end_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TodayUpcomingIntentionDto {
    pub intention: Intention,
    pub trigger_at: i64,
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TodayEarlierIntentionDto {
    pub intention: Intention,
    pub session: IntentionSession,
}

#[tauri::command]
#[specta::specta]
pub async fn assess_intention_edit_policy(
    database_state: State<'_, DatabaseState>,
    params: UpdateIntentionParams,
) -> Result<Option<edit_policy::IntentionEditPolicyAssessment>, String> {
    let input = build_write_intention_input(params.name, params.behavior, params.conditions)?;

    return edit_policy::assess_intention_edit_policy(
        &database_state.pool,
        params.intention_id,
        &input,
    )
    .await;
}

#[tauri::command]
#[specta::specta]
pub async fn create_intention(
    app: AppHandle,
    database_state: State<'_, DatabaseState>,
    runtime_state: State<'_, IntentionRuntimeState>,
    params: CreateIntentionParams,
) -> Result<Intention, String> {
    let input = build_write_intention_input(params.name, params.behavior, params.conditions)?;

    let intention = IntentionRepository::create(&database_state.pool, input)
        .await
        .map_err(|error| error.to_string())?;

    let _ = IntentionCreatedEvent {
        intention_id: intention.id,
    }
    .emit(&app);
    if let Err(error) = runtime_state.reevaluate(&app).await {
        log::error!(
            target: LOG_TARGET,
            "intention reevaluation after create failed: {}",
            error
        );
    }

    return Ok(intention);
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateIntentionParams {
    pub name: String,
    pub behavior: WriteIntentionBehaviorParams,
    pub conditions: Vec<WriteIntentionConditionParams>,
}

#[tauri::command]
#[specta::specta]
pub async fn update_intention(
    app: AppHandle,
    database_state: State<'_, DatabaseState>,
    runtime_state: State<'_, IntentionRuntimeState>,
    params: UpdateIntentionParams,
) -> Result<Intention, String> {
    let input = build_write_intention_input(params.name, params.behavior, params.conditions)?;

    edit_policy::require_intention_update_allowed(
        &database_state.pool,
        params.intention_id,
        &input,
    )
    .await?;

    let intention = IntentionRepository::update(&database_state.pool, params.intention_id, input)
        .await
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("Intention {} does not exist", params.intention_id))?;

    let _ = IntentionUpdatedEvent {
        intention_id: intention.id,
    }
    .emit(&app);
    if let Err(error) = runtime_state.reevaluate(&app).await {
        log::error!(
            target: LOG_TARGET,
            "intention reevaluation after update failed: {}",
            error
        );
    }

    return Ok(intention);
}

#[tauri::command]
#[specta::specta]
pub async fn pause_intention(
    app: AppHandle,
    database_state: State<'_, DatabaseState>,
    runtime_state: State<'_, IntentionRuntimeState>,
    intention_id: i64,
) -> Result<Intention, String> {
    let current = IntentionRepository::get_by_id(&database_state.pool, intention_id)
        .await
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("Intention {} does not exist", intention_id))?;
    if current.paused_at.is_some() {
        return Ok(current);
    }

    let intention = IntentionRepository::set_pause_state(
        &database_state.pool,
        intention_id,
        Some(unix_ms_now()),
        None,
    )
    .await
    .map_err(|error| error.to_string())?
    .ok_or_else(|| format!("Intention {} does not exist", intention_id))?;

    let _ = IntentionUpdatedEvent { intention_id }.emit(&app);
    if let Err(error) = runtime_state.reevaluate(&app).await {
        log::error!(
            target: LOG_TARGET,
            "intention reevaluation after pause failed: {}",
            error
        );
    }

    return Ok(intention);
}

#[tauri::command]
#[specta::specta]
pub async fn resume_intention(
    app: AppHandle,
    database_state: State<'_, DatabaseState>,
    runtime_state: State<'_, IntentionRuntimeState>,
    intention_id: i64,
) -> Result<Intention, String> {
    let current = IntentionRepository::get_by_id(&database_state.pool, intention_id)
        .await
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("Intention {} does not exist", intention_id))?;
    if current.paused_at.is_none() {
        return Ok(current);
    }

    let intention = IntentionRepository::set_pause_state(
        &database_state.pool,
        intention_id,
        None,
        Some(unix_ms_now()),
    )
    .await
    .map_err(|error| error.to_string())?
    .ok_or_else(|| format!("Intention {} does not exist", intention_id))?;

    let _ = IntentionUpdatedEvent { intention_id }.emit(&app);
    if let Err(error) = runtime_state.reevaluate(&app).await {
        log::error!(
            target: LOG_TARGET,
            "intention reevaluation after resume failed: {}",
            error
        );
    }

    return Ok(intention);
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIntentionParams {
    pub intention_id: i64,
    pub name: String,
    pub behavior: WriteIntentionBehaviorParams,
    pub conditions: Vec<WriteIntentionConditionParams>,
}

#[tauri::command]
#[specta::specta]
pub async fn delete_intention(
    app: AppHandle,
    database_state: State<'_, DatabaseState>,
    runtime_state: State<'_, IntentionRuntimeState>,
    intention_id: i64,
) -> Result<(), String> {
    edit_policy::require_intention_delete_allowed(&database_state.pool, intention_id).await?;

    let did_delete = IntentionRepository::delete(&database_state.pool, intention_id)
        .await
        .map_err(|error| error.to_string())?;

    if !did_delete {
        return Err(format!("Intention {} does not exist", intention_id));
    }

    let _ = IntentionDeletedEvent { intention_id }.emit(&app);
    if let Err(error) = runtime_state.reevaluate(&app).await {
        log::error!(
            target: LOG_TARGET,
            "intention reevaluation after delete failed: {}",
            error
        );
    }

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn start_intention(
    app: AppHandle,
    runtime_state: State<'_, IntentionRuntimeState>,
    intention_id: i64,
) -> Result<IntentionSession, String> {
    return runtime_state
        .start_intention(&app, intention_id)
        .await
        .map_err(|error| error.to_string());
}

#[tauri::command]
#[specta::specta]
pub async fn complete_intention(
    app: AppHandle,
    database_state: State<'_, DatabaseState>,
    runtime_state: State<'_, IntentionRuntimeState>,
    intention_id: i64,
    end_condition_id: Option<i64>,
) -> Result<IntentionSession, String> {
    edit_policy::require_intention_complete_allowed(
        &database_state.pool,
        intention_id,
        end_condition_id,
    )
    .await?;

    return runtime_state
        .complete_intention(&app, intention_id, end_condition_id)
        .await
        .map_err(|error| error.to_string());
}

#[tauri::command]
#[specta::specta]
pub async fn stop_intention(
    app: AppHandle,
    database_state: State<'_, DatabaseState>,
    runtime_state: State<'_, IntentionRuntimeState>,
    intention_id: i64,
) -> Result<IntentionSession, String> {
    edit_policy::require_intention_stop_allowed(&database_state.pool, intention_id).await?;

    return runtime_state
        .stop_intention(&app, intention_id)
        .await
        .map_err(|error| error.to_string());
}

fn build_write_intention_input(
    name: String,
    behavior: WriteIntentionBehaviorParams,
    conditions: Vec<WriteIntentionConditionParams>,
) -> Result<WriteIntentionInput, String> {
    let behavior = match behavior {
        WriteIntentionBehaviorParams::Block(block_params) => {
            let (app_targets, website_targets) =
                build_block_targets(block_params.scope, block_params.targets)?;

            WriteIntentionBehaviorInput::Block(WriteIntentionBlockInput {
                enforcement_mode: block_params.enforcement_mode,
                scope: block_params.scope,
                app_targets,
                website_targets,
            })
        }
        WriteIntentionBehaviorParams::Break => {
            return Err("Break intentions are not supported yet".to_string());
        }
    };

    let input = WriteIntentionInput {
        name: name.trim().to_string(),
        behavior,
        conditions: build_conditions(conditions)?,
    };

    validate_write_intention_input(&input)?;
    return Ok(input);
}

fn build_block_targets(
    scope: IntentionBlockScope,
    targets: Vec<WriteIntentionBlockTargetParams>,
) -> Result<
    (
        Vec<WriteIntentionBlockAppTargetInput>,
        Vec<WriteIntentionBlockWebsiteTargetInput>,
    ),
    String,
> {
    if scope == IntentionBlockScope::WholeDevice {
        return Ok((Vec::new(), Vec::new()));
    }

    if targets.is_empty() {
        return Err("Choose at least one app or website".to_string());
    }

    let mut app_targets = Vec::new();
    let mut website_targets = Vec::new();
    // Note: Do not save the same normalized target twice. If one row says block and the
    // other says allow, the saved intention is contradictory even though runtime
    // precedence could pick a winner.
    let mut seen_apps = HashSet::<String>::new();
    let mut seen_websites = HashSet::<String>::new();

    for target in targets {
        match target {
            WriteIntentionBlockTargetParams::App(app) => {
                let stable_id = app.stable_id.trim().to_string();
                if stable_id.is_empty() {
                    return Err("App target is missing a stable ID".to_string());
                }

                if !seen_apps.insert(stable_id.clone()) {
                    return Err(format!("Duplicate app target: {}", stable_id));
                }

                app_targets.push(WriteIntentionBlockAppTargetInput {
                    action: app.action,
                    app: UpsertAppInput {
                        stable_id,
                        name: app.name,
                        bundle_id: app.bundle_id,
                        process_path: app.process_path,
                        icon: app.icon,
                        color: app.color,
                    },
                });
            }
            WriteIntentionBlockTargetParams::Website(website) => {
                let hostname = extract_hostname(&website.hostname)
                    .ok_or_else(|| format!("Invalid website hostname: {}", website.hostname))?;

                if !seen_websites.insert(hostname.clone()) {
                    return Err(format!("Duplicate website target: {}", hostname));
                }

                website_targets.push(WriteIntentionBlockWebsiteTargetInput {
                    action: website.action,
                    website: UpsertWebsiteInput {
                        hostname,
                        name: website.name,
                        icon: website.icon,
                        color: website.color,
                    },
                });
            }
        }
    }

    // Check that the payload includes at least one base target. Exception targets
    // only make sense when there is a base set for them to override.
    let has_base_target = match scope {
        IntentionBlockScope::BlockTargets => has_target_action(
            &app_targets,
            &website_targets,
            IntentionBlockTargetAction::Block,
        ),
        IntentionBlockScope::AllowTargets => has_target_action(
            &app_targets,
            &website_targets,
            IntentionBlockTargetAction::Allow,
        ),
        IntentionBlockScope::WholeDevice => true,
    };
    if !has_base_target {
        return Err("Choose at least one app or website".to_string());
    }

    return Ok((app_targets, website_targets));
}

fn has_target_action(
    app_targets: &[WriteIntentionBlockAppTargetInput],
    website_targets: &[WriteIntentionBlockWebsiteTargetInput],
    action: IntentionBlockTargetAction,
) -> bool {
    return app_targets.iter().any(|target| target.action == action)
        || website_targets.iter().any(|target| target.action == action);
}

fn build_conditions(
    conditions: Vec<WriteIntentionConditionParams>,
) -> Result<Vec<WriteIntentionConditionInput>, String> {
    return conditions
        .into_iter()
        .map(|condition| {
            let rule = match condition.rule {
                WriteIntentionConditionRuleParams::Schedule(rule) => {
                    IntentionConditionRule::Schedule(rule)
                }
                WriteIntentionConditionRuleParams::DateTime(rule) => {
                    let trigger_at =
                        to_local_datetime(&rule.date_epoch_days, &rule.time_of_day_ms)?
                            .timestamp_millis();

                    IntentionConditionRule::DateTime(IntentionConditionDateTimeRule {
                        date_epoch_days: rule.date_epoch_days,
                        time_of_day_ms: rule.time_of_day_ms,
                        trigger_at,
                    })
                }
                WriteIntentionConditionRuleParams::AfterTransition(rule) => {
                    IntentionConditionRule::AfterTransition(rule)
                }
                WriteIntentionConditionRuleParams::Manual => IntentionConditionRule::Manual,
            };

            return Ok(WriteIntentionConditionInput {
                transition: condition.transition,
                rule,
            });
        })
        .collect::<Result<Vec<_>, String>>();
}

fn validate_write_intention_input(input: &WriteIntentionInput) -> Result<(), String> {
    if input.name.is_empty() {
        return Err("Please enter a name".to_string());
    }
    if !input
        .conditions
        .iter()
        .any(|condition| condition.transition == IntentionConditionTransition::Start)
    {
        return Err("Please add a start condition".to_string());
    }
    if !input
        .conditions
        .iter()
        .any(|condition| condition.transition == IntentionConditionTransition::End)
    {
        return Err("Please add an end condition".to_string());
    }

    return Ok(());
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WriteIntentionBehaviorParams {
    Block(WriteIntentionBlockParams),
    Break,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WriteIntentionBlockParams {
    pub enforcement_mode: IntentionEnforcementMode,
    pub scope: IntentionBlockScope,
    pub targets: Vec<WriteIntentionBlockTargetParams>,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WriteIntentionBlockTargetParams {
    App(WriteIntentionBlockAppTargetParams),
    Website(WriteIntentionBlockWebsiteTargetParams),
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WriteIntentionBlockAppTargetParams {
    pub action: IntentionBlockTargetAction,
    pub stable_id: String,
    pub name: Option<String>,
    pub bundle_id: Option<String>,
    pub process_path: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WriteIntentionBlockWebsiteTargetParams {
    pub action: IntentionBlockTargetAction,
    pub hostname: String,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WriteIntentionConditionParams {
    pub transition: IntentionConditionTransition,
    pub rule: WriteIntentionConditionRuleParams,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WriteIntentionConditionRuleParams {
    Schedule(IntentionConditionScheduleRule),
    DateTime(WriteIntentionConditionDateTimeRuleParams),
    AfterTransition(IntentionConditionAfterTransitionRule),
    Manual,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WriteIntentionConditionDateTimeRuleParams {
    pub date_epoch_days: DateOnly,
    pub time_of_day_ms: TimeOnly,
}

const LOG_TARGET: &str = "modules::intentions::commands";
