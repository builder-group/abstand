use super::{
    edit_policy,
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
    today,
    types::{
        IntentionCreatedEvent, IntentionDeletedEvent, IntentionRuntimeState, IntentionUpdatedEvent,
    },
};
use crate::{
    common::time::{
        local_datetime_from_unix_ms, to_local_datetime, unix_ms_now, DateOnly, TimeOnly,
    },
    common::url::WebsiteTarget,
    modules::{
        catalog::repository::{UpsertAppInput, UpsertWebsiteInput},
        db::types::DatabaseState,
    },
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
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
    let active = today::get_active(&database_state.pool).await?;
    let upcoming_today = today::get_upcoming(&database_state.pool, now).await?;
    let earlier_today = today::get_earlier(&database_state.pool, now).await?;

    return Ok(TodayIntentionOverviewDto {
        active,
        upcoming_today,
        earlier_today,
    });
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TodayIntentionOverviewDto {
    pub active: Vec<today::TodayActiveIntention>,
    pub upcoming_today: Vec<today::TodayUpcomingIntention>,
    pub earlier_today: Vec<today::TodayEarlierIntention>,
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

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
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
                balanced_delay_ms: block_params.balanced_delay_ms,
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
    let mut seen_websites = HashSet::new();

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
                let website_target = WebsiteTarget::from_parts(website.hostname, website.path)?;

                if !seen_websites.insert(website_target.clone()) {
                    return Err(format!(
                        "Duplicate website target: {}{}",
                        website_target.hostname,
                        website_target.path.as_deref().unwrap_or("")
                    ));
                }

                website_targets.push(WriteIntentionBlockWebsiteTargetInput {
                    action: website.action,
                    website: UpsertWebsiteInput {
                        hostname: website_target.hostname,
                        name: website.name,
                        icon: website.icon,
                        color: website.color,
                    },
                    path: website_target.path,
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
                    // Offsets must remain representable when added to a session timestamp
                    unix_ms_now()
                        .checked_add(rule.offset_ms)
                        .and_then(local_datetime_from_unix_ms)
                        .ok_or("Condition offset is too large")?;
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
        return Err("Enter a name".to_string());
    }
    if !input
        .conditions
        .iter()
        .any(|condition| condition.transition == IntentionConditionTransition::Start)
    {
        return Err("Add a start condition".to_string());
    }
    if !input
        .conditions
        .iter()
        .any(|condition| condition.transition == IntentionConditionTransition::End)
    {
        return Err("Add an end condition".to_string());
    }

    let WriteIntentionBehaviorInput::Block(block) = &input.behavior;
    if block.balanced_delay_ms <= 0 {
        return Err("Choose a Balanced pause greater than 0".to_string());
    }

    return Ok(());
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WriteIntentionBehaviorParams {
    Block(WriteIntentionBlockParams),
    Break,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WriteIntentionBlockParams {
    pub enforcement_mode: IntentionEnforcementMode,
    pub balanced_delay_ms: i64,
    pub scope: IntentionBlockScope,
    pub targets: Vec<WriteIntentionBlockTargetParams>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WriteIntentionBlockTargetParams {
    App(WriteIntentionBlockAppTargetParams),
    Website(WriteIntentionBlockWebsiteTargetParams),
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
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

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WriteIntentionBlockWebsiteTargetParams {
    pub action: IntentionBlockTargetAction,
    pub hostname: String,
    pub path: Option<String>,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WriteIntentionConditionParams {
    pub transition: IntentionConditionTransition,
    pub rule: WriteIntentionConditionRuleParams,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WriteIntentionConditionRuleParams {
    Schedule(IntentionConditionScheduleRule),
    DateTime(WriteIntentionConditionDateTimeRuleParams),
    AfterTransition(IntentionConditionAfterTransitionRule),
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WriteIntentionConditionDateTimeRuleParams {
    pub date_epoch_days: DateOnly,
    pub time_of_day_ms: TimeOnly,
}

const LOG_TARGET: &str = "modules::intentions::commands";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn condition_offsets_must_produce_representable_timestamps() {
        for (offset_ms, valid) in [(1_800_000, true), (i64::MAX, false), (i64::MAX / 2, false)] {
            let result = build_conditions(vec![WriteIntentionConditionParams {
                transition: IntentionConditionTransition::End,
                rule: WriteIntentionConditionRuleParams::AfterTransition(
                    IntentionConditionAfterTransitionRule {
                        anchor_transition: IntentionConditionTransition::Start,
                        offset_ms,
                    },
                ),
            }]);

            assert_eq!(result.is_ok(), valid, "offset: {}", offset_ms);
        }
    }
}
