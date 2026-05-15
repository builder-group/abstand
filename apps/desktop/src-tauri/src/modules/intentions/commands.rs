use super::{
    intention::{
        Intention, IntentionBlockScope, IntentionConditionAfterTransitionRule,
        IntentionConditionDateTimeRule, IntentionConditionRule, IntentionConditionScheduleRule,
        IntentionConditionTransition, IntentionEnforcementMode, IntentionSession,
    },
    repository::{
        IntentionRepository, IntentionSessionRepository, WriteIntentionBehaviorInput,
        WriteIntentionBlockInput, WriteIntentionConditionInput, WriteIntentionInput,
    },
    types::{
        IntentionCreatedEvent, IntentionDeletedEvent, IntentionRuntimeState, IntentionUpdatedEvent,
    },
};
use crate::{
    common::time::{to_local_datetime, DateOnly, TimeOnly},
    common::url::extract_hostname,
    modules::{
        catalog::repository::{UpsertAppInput, UpsertWebsiteInput},
        db::types::DatabaseState,
    },
};
use serde::Deserialize;
use tauri::{AppHandle, State};
use tauri_specta::Event;

#[tauri::command]
#[specta::specta]
pub async fn get_intentions(state: State<'_, DatabaseState>) -> Result<Vec<Intention>, String> {
    return IntentionRepository::get_all(&state.pool)
        .await
        .map_err(|error| error.to_string());
}

#[tauri::command]
#[specta::specta]
pub async fn get_intention(
    state: State<'_, DatabaseState>,
    intention_id: i64,
) -> Result<Option<Intention>, String> {
    return IntentionRepository::get_by_id(&state.pool, intention_id)
        .await
        .map_err(|error| error.to_string());
}

#[tauri::command]
#[specta::specta]
pub async fn get_active_intention_sessions(
    state: State<'_, DatabaseState>,
) -> Result<Vec<IntentionSession>, String> {
    return IntentionSessionRepository::get_active_sessions(&state.pool)
        .await
        .map_err(|error| error.to_string());
}

#[tauri::command]
#[specta::specta]
pub async fn get_active_intention_session(
    state: State<'_, DatabaseState>,
    intention_id: i64,
) -> Result<Option<IntentionSession>, String> {
    return IntentionSessionRepository::get_active_session_by_intention_id(
        &state.pool,
        intention_id,
    )
    .await
    .map_err(|error| error.to_string());
}

#[tauri::command]
#[specta::specta]
pub async fn create_intention(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    runtime: State<'_, IntentionRuntimeState>,
    params: CreateIntentionParams,
) -> Result<Intention, String> {
    let input = build_write_intention_input(params.name, params.behavior, params.conditions)?;

    let intention = IntentionRepository::create(&state.pool, input)
        .await
        .map_err(|error| error.to_string())?;

    runtime
        .resync_intention(&app, intention.id)
        .await
        .map_err(|error| error.to_string())?;

    let _ = IntentionCreatedEvent {
        intention_id: intention.id,
    }
    .emit(&app);
    return Ok(intention);
}

#[tauri::command]
#[specta::specta]
pub async fn update_intention(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    runtime: State<'_, IntentionRuntimeState>,
    params: UpdateIntentionParams,
) -> Result<Intention, String> {
    let input = build_write_intention_input(params.name, params.behavior, params.conditions)?;

    let intention = IntentionRepository::update(&state.pool, params.intention_id, input)
        .await
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("Intention {} does not exist", params.intention_id))?;

    runtime
        .resync_intention(&app, intention.id)
        .await
        .map_err(|error| error.to_string())?;

    let _ = IntentionUpdatedEvent {
        intention_id: intention.id,
    }
    .emit(&app);

    return Ok(intention);
}

#[tauri::command]
#[specta::specta]
pub async fn delete_intention(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    runtime: State<'_, IntentionRuntimeState>,
    intention_id: i64,
) -> Result<(), String> {
    let did_delete = IntentionRepository::delete(&state.pool, intention_id)
        .await
        .map_err(|error| error.to_string())?;

    if !did_delete {
        return Err(format!("Intention {} does not exist", intention_id));
    }

    runtime.clear_intention_jobs(&app, intention_id);
    let _ = IntentionDeletedEvent { intention_id }.emit(&app);

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn start_intention(
    app: AppHandle,
    runtime: State<'_, IntentionRuntimeState>,
    intention_id: i64,
) -> Result<IntentionSession, String> {
    return runtime
        .start_intention(&app, intention_id)
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
            let (apps, websites) = build_block_targets(block_params.scope, block_params.targets)?;

            WriteIntentionBehaviorInput::Block(WriteIntentionBlockInput {
                enforcement_mode: block_params.enforcement_mode,
                scope: block_params.scope,
                apps,
                websites,
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
) -> Result<(Vec<UpsertAppInput>, Vec<UpsertWebsiteInput>), String> {
    if scope == IntentionBlockScope::WholeDevice {
        return Ok((Vec::new(), Vec::new()));
    }

    if targets.is_empty() {
        return Err("Choose at least one app or website".to_string());
    }

    let mut apps = Vec::new();
    let mut websites = Vec::new();

    for target in targets {
        match target {
            WriteIntentionBlockTargetParams::App(app) => {
                let stable_id = app.stable_id.trim().to_string();
                if stable_id.is_empty() {
                    return Err("App target is missing a stable ID".to_string());
                }

                apps.push(UpsertAppInput {
                    stable_id,
                    name: app.name,
                    bundle_id: app.bundle_id,
                    process_path: app.process_path,
                    icon: app.icon,
                    color: app.color,
                });
            }
            WriteIntentionBlockTargetParams::Website(website) => {
                let hostname = extract_hostname(&website.hostname)
                    .ok_or_else(|| format!("Invalid website hostname: {}", website.hostname))?;

                websites.push(UpsertWebsiteInput {
                    hostname,
                    name: website.name,
                    icon: website.icon,
                    color: website.color,
                });
            }
        }
    }

    return Ok((apps, websites));
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
#[serde(rename_all = "camelCase")]
pub struct CreateIntentionParams {
    pub name: String,
    pub behavior: WriteIntentionBehaviorParams,
    pub conditions: Vec<WriteIntentionConditionParams>,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIntentionParams {
    pub intention_id: i64,
    pub name: String,
    pub behavior: WriteIntentionBehaviorParams,
    pub conditions: Vec<WriteIntentionConditionParams>,
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
