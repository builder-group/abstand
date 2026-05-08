use super::types::IntentionBehaviorType;
use crate::{
    common::time::{DateOnly, TimeOnly, Weekday},
    modules::catalog::types::{App, Website},
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Intention {
    pub id: i64,
    pub name: String,
    pub behavior: IntentionBehavior,
    pub conditions: Vec<IntentionCondition>,
    pub updated_at: i64,
    pub created_at: i64,
}

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
    pub scope: IntentionBlockScope,
    pub apps: Vec<App>,
    pub websites: Vec<Website>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum IntentionEnforcementMode {
    Casual,
    Balanced,
    Strict,
}

impl IntentionEnforcementMode {
    pub fn as_str(&self) -> &'static str {
        return match self {
            Self::Casual => "casual",
            Self::Balanced => "balanced",
            Self::Strict => "strict",
        };
    }

    pub fn from_str(value: &str) -> Result<Self, String> {
        return match value {
            "casual" => Ok(Self::Casual),
            "balanced" => Ok(Self::Balanced),
            "strict" => Ok(Self::Strict),
            _ => Err(format!("Unknown intention enforcement mode: {}", value)),
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum IntentionBlockScope {
    BlockTargets,
    AllowTargets,
    WholeDevice,
}

impl IntentionBlockScope {
    pub fn as_str(&self) -> &'static str {
        return match self {
            Self::BlockTargets => "block_targets",
            Self::AllowTargets => "allow_targets",
            Self::WholeDevice => "whole_device",
        };
    }

    pub fn from_str(value: &str) -> Result<Self, String> {
        return match value {
            "block_targets" => Ok(Self::BlockTargets),
            "allow_targets" => Ok(Self::AllowTargets),
            "whole_device" => Ok(Self::WholeDevice),
            _ => Err(format!("Unknown intention block scope: {}", value)),
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
    pub updated_at: i64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum IntentionConditionPhase {
    Start,
    End,
}

impl IntentionConditionPhase {
    pub fn as_str(&self) -> &'static str {
        return match self {
            Self::Start => "start",
            Self::End => "end",
        };
    }

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
    Schedule(IntentionConditionScheduleRule),
    DateTime(IntentionConditionDateTimeRule),
    Manual,
}

impl IntentionConditionRule {
    pub fn as_str(&self) -> &'static str {
        return match self {
            Self::Schedule(_) => "schedule",
            Self::DateTime(_) => "date_time",
            Self::Manual => "manual",
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IntentionConditionScheduleRule {
    pub time_of_day: TimeOnly,
    pub weekdays: Option<Vec<Weekday>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IntentionConditionDateTimeRule {
    pub date: DateOnly,
    pub time_of_day: TimeOnly,
}
