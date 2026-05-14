use super::{
    intention::{
        Intention, IntentionBlockScope, IntentionConditionAfterTransitionRule,
        IntentionConditionDateTimeRule, IntentionConditionRule, IntentionConditionScheduleRule,
        IntentionConditionTransition, IntentionEnforcementMode,
    },
    repository::{
        CreateIntentionBehaviorInput, CreateIntentionBlockInput, CreateIntentionConditionInput,
        CreateIntentionInput, IntentionRepository,
    },
    types::{IntentionCreatedEvent, IntentionRuntimeState},
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
pub async fn create_intention(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    runtime: State<'_, IntentionRuntimeState>,
    params: CreateIntentionParams,
) -> Result<Intention, String> {
    let input = match params.behavior {
        CreateIntentionBehaviorParams::Block(block_params) => {
            let (apps, websites) = match block_params.scope {
                IntentionBlockScope::WholeDevice => (Vec::new(), Vec::new()),
                IntentionBlockScope::BlockTargets | IntentionBlockScope::AllowTargets => {
                    if block_params.targets.is_empty() {
                        return Err("Choose at least one app or website".to_string());
                    }

                    let mut apps = Vec::new();
                    let mut websites = Vec::new();

                    for target in block_params.targets {
                        match target {
                            CreateIntentionBlockTargetParams::App(app) => {
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
                            CreateIntentionBlockTargetParams::Website(website) => {
                                let hostname =
                                    extract_hostname(&website.hostname).ok_or_else(|| {
                                        format!("Invalid website hostname: {}", website.hostname)
                                    })?;

                                websites.push(UpsertWebsiteInput {
                                    hostname,
                                    name: website.name,
                                    icon: website.icon,
                                    color: website.color,
                                });
                            }
                        }
                    }

                    (apps, websites)
                }
            };

            let conditions = params
                .conditions
                .into_iter()
                .map(|condition| {
                    let rule = match condition.rule {
                        CreateIntentionConditionRuleParams::Schedule(rule) => {
                            IntentionConditionRule::Schedule(rule)
                        }
                        CreateIntentionConditionRuleParams::DateTime(rule) => {
                            let trigger_at =
                                to_local_datetime(&rule.date_epoch_days, &rule.time_of_day_ms)?
                                    .timestamp_millis();

                            IntentionConditionRule::DateTime(IntentionConditionDateTimeRule {
                                date_epoch_days: rule.date_epoch_days,
                                time_of_day_ms: rule.time_of_day_ms,
                                trigger_at,
                            })
                        }
                        CreateIntentionConditionRuleParams::AfterTransition(rule) => {
                            IntentionConditionRule::AfterTransition(rule)
                        }
                        CreateIntentionConditionRuleParams::Manual => {
                            IntentionConditionRule::Manual
                        }
                    };

                    return Ok(CreateIntentionConditionInput {
                        transition: condition.transition,
                        rule,
                    });
                })
                .collect::<Result<Vec<_>, String>>()?;

            CreateIntentionInput {
                name: params.name.trim().to_string(),
                behavior: CreateIntentionBehaviorInput::Block(CreateIntentionBlockInput {
                    enforcement_mode: block_params.enforcement_mode,
                    scope: block_params.scope,
                    apps,
                    websites,
                }),
                conditions,
            }
        }
        CreateIntentionBehaviorParams::Break => {
            return Err("Break intentions are not supported yet".to_string());
        }
    };

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

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateIntentionParams {
    pub name: String,
    pub behavior: CreateIntentionBehaviorParams,
    pub conditions: Vec<CreateIntentionConditionParams>,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CreateIntentionBehaviorParams {
    Block(CreateIntentionBlockParams),
    Break,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateIntentionBlockParams {
    pub enforcement_mode: IntentionEnforcementMode,
    pub scope: IntentionBlockScope,
    pub targets: Vec<CreateIntentionBlockTargetParams>,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CreateIntentionBlockTargetParams {
    App(CreateIntentionBlockAppTargetParams),
    Website(CreateIntentionBlockWebsiteTargetParams),
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateIntentionBlockAppTargetParams {
    pub stable_id: String,
    pub name: Option<String>,
    pub bundle_id: Option<String>,
    pub process_path: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateIntentionBlockWebsiteTargetParams {
    pub hostname: String,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateIntentionConditionParams {
    pub transition: IntentionConditionTransition,
    pub rule: CreateIntentionConditionRuleParams,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CreateIntentionConditionRuleParams {
    Schedule(IntentionConditionScheduleRule),
    DateTime(CreateIntentionConditionDateTimeRuleParams),
    AfterTransition(IntentionConditionAfterTransitionRule),
    Manual,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateIntentionConditionDateTimeRuleParams {
    pub date_epoch_days: DateOnly,
    pub time_of_day_ms: TimeOnly,
}
