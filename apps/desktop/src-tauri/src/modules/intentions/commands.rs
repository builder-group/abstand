use super::{
    intention::Intention,
    repository::{CreateIntentionInput, IntentionRepository},
    types::{IntentionBehaviorType, IntentionCreatedEvent},
};
use crate::modules::db::types::DatabaseState;
use serde::Deserialize;
use tauri::{AppHandle, State};
use tauri_specta::Event;

#[tauri::command]
#[specta::specta]
pub async fn get_intentions(
    state: State<'_, DatabaseState>,
) -> Result<Vec<Intention>, String> {
    let row_sets = IntentionRepository::get_all(&state.pool)
        .await
        .map_err(|error| error.to_string())?;

    return row_sets.into_iter().map(Intention::try_from).collect();
}

#[tauri::command]
#[specta::specta]
pub async fn get_intention(
    state: State<'_, DatabaseState>,
    intention_id: i64,
) -> Result<Option<Intention>, String> {
    let row_set = IntentionRepository::get_by_id(&state.pool, intention_id)
        .await
        .map_err(|error| error.to_string());

    return row_set?.map(Intention::try_from).transpose();
}

#[tauri::command]
#[specta::specta]
pub async fn create_intention(
    app: AppHandle,
    state: State<'_, DatabaseState>,
    params: CreateIntentionParams,
) -> Result<Intention, String> {
    let input = match params.behavior {
        CreateIntentionBehaviorParams::Block => CreateIntentionInput {
            name: params.name.trim().to_string(),
            behavior_type: IntentionBehaviorType::Block,
        },
        CreateIntentionBehaviorParams::Break => {
            return Err("Break intentions are not supported yet".to_string());
        }
    };

    if input.name.is_empty() {
        return Err("Please enter a name".to_string());
    }

    let row_set = IntentionRepository::create(&state.pool, input)
        .await
        .map_err(|error| error.to_string())?;

    let intention = Intention::try_from(row_set)?;
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
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CreateIntentionBehaviorParams {
    Block,
    Break,
}
