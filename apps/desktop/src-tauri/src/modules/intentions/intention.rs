use super::{
    repository::{IntentionConditionRow, IntentionRowSet},
    types::IntentionBehaviorType,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Intention {
    pub id: i64,
    pub name: String,
    pub behavior: IntentionBehavior,
    pub conditions: Vec<IntentionCondition>,
    pub created_at: i64,
}

impl TryFrom<IntentionRowSet> for Intention {
    type Error = String;

    fn try_from(rows: IntentionRowSet) -> Result<Self, Self::Error> {
        let behavior_type = IntentionBehaviorType::from_str(&rows.base.behavior_type)?;
        let behavior = match behavior_type {
            IntentionBehaviorType::Block => {
                let Some(block) = rows.block else {
                    return Err(format!("Missing block rows for intention {}", rows.base.id));
                };

                IntentionBehavior::Block(IntentionBlock {
                    enforcement_mode: IntentionEnforcementMode::from_str(
                        &block.config.enforcement_mode,
                    )?,
                    target_scope: IntentionBlockTargetScope::from_str(&block.config.target_scope)?,
                    app_ids: block.app_ids,
                    website_ids: block.website_ids,
                    created_at: block.config.created_at,
                })
            }
            IntentionBehaviorType::Break => IntentionBehavior::Break,
        };

        let conditions = rows
            .conditions
            .into_iter()
            .map(IntentionCondition::try_from)
            .collect::<Result<Vec<_>, _>>()?;

        return Ok(Self {
            id: rows.base.id,
            name: rows.base.name,
            behavior,
            conditions,
            created_at: rows.base.created_at,
        });
    }
}

// MARK: - Intention Behavior

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum IntentionBehavior {
    Block(IntentionBlock),
    Break,
}

impl From<&IntentionBehavior> for IntentionBehaviorType {
    fn from(value: &IntentionBehavior) -> Self {
        return match value {
            IntentionBehavior::Block(_) => IntentionBehaviorType::Block,
            IntentionBehavior::Break => IntentionBehaviorType::Break,
        };
    }
}

impl From<IntentionBehavior> for IntentionBehaviorType {
    fn from(value: IntentionBehavior) -> Self {
        return match value {
            IntentionBehavior::Block(_) => IntentionBehaviorType::Block,
            IntentionBehavior::Break => IntentionBehaviorType::Break,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IntentionBlock {
    pub enforcement_mode: IntentionEnforcementMode,
    pub target_scope: IntentionBlockTargetScope,
    pub app_ids: Vec<i64>,
    pub website_ids: Vec<i64>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum IntentionEnforcementMode {
    Casual,
    Balanced,
    Hardcore,
}

impl IntentionEnforcementMode {
    pub fn from_str(value: &str) -> Result<Self, String> {
        return match value {
            "casual" => Ok(Self::Casual),
            "balanced" => Ok(Self::Balanced),
            "hardcore" => Ok(Self::Hardcore),
            _ => Err(format!("Unknown intention enforcement mode: {}", value)),
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum IntentionBlockTargetScope {
    SelectedTargets,
    WholeDevice,
}

impl IntentionBlockTargetScope {
    pub fn from_str(value: &str) -> Result<Self, String> {
        return match value {
            "selected_targets" => Ok(Self::SelectedTargets),
            "whole_device" => Ok(Self::WholeDevice),
            _ => Err(format!("Unknown intention block target scope: {}", value)),
        };
    }
}

// MARK: - Intention Condition

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IntentionCondition {
    pub id: i64,
    pub phase: IntentionConditionPhase,
    pub rule: IntentionConditionRule,
    pub created_at: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum IntentionConditionPhase {
    Start,
    End,
}

impl IntentionConditionPhase {
    pub fn from_str(value: &str) -> Result<Self, String> {
        return match value {
            "start" => Ok(Self::Start),
            "end" => Ok(Self::End),
            _ => Err(format!("Unknown intention condition phase: {}", value)),
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum IntentionConditionRule {
    Time {
        #[serde(rename = "timeOfDay")]
        time_of_day: String,
        weekdays: Option<Vec<u8>>,
    },
    Manual,
}

impl TryFrom<IntentionConditionRow> for IntentionCondition {
    type Error = String;

    fn try_from(row: IntentionConditionRow) -> Result<Self, Self::Error> {
        let phase = IntentionConditionPhase::from_str(&row.condition_phase)?;
        let rule = match row.condition_type.as_str() {
            "time" => IntentionConditionRule::Time {
                time_of_day: row
                    .time_of_day
                    .ok_or("Missing time_of_day for time condition".to_string())?,
                weekdays: match row.weekdays {
                    Some(weekdays) => Some(
                        serde_json::from_str::<Vec<u8>>(&weekdays)
                            .map_err(|error| error.to_string())?,
                    ),
                    None => None,
                },
            },
            "manual" => IntentionConditionRule::Manual,
            _ => {
                return Err(format!(
                    "Unknown intention condition type: {}",
                    row.condition_type
                ));
            }
        };

        return Ok(Self {
            id: row.id,
            phase,
            rule,
            created_at: row.created_at,
        });
    }
}
