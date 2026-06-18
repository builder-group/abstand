use super::types::IntentionBehaviorType;
use crate::{
    common::time::{DateOnly, TimeOnly, WeekdayMask},
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
    pub paused_at: Option<i64>,
    pub resumed_at: Option<i64>,
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
    pub balanced_delay_ms: i64,
    pub scope: IntentionBlockScope,
    pub app_targets: Vec<IntentionBlockAppTarget>,
    pub website_targets: Vec<IntentionBlockWebsiteTarget>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IntentionBlockAppTarget {
    pub action: IntentionBlockTargetAction,
    pub app: App,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IntentionBlockWebsiteTarget {
    pub action: IntentionBlockTargetAction,
    pub website: Website,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum IntentionBlockTargetAction {
    Block,
    Allow,
}

impl IntentionBlockTargetAction {
    pub fn as_str(&self) -> &'static str {
        return match self {
            Self::Block => "block",
            Self::Allow => "allow",
        };
    }

    pub fn from_str(value: &str) -> Result<Self, String> {
        return match value {
            "block" => Ok(Self::Block),
            "allow" => Ok(Self::Allow),
            _ => Err(format!("Unknown intention block target action: {}", value)),
        };
    }
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
    pub transition: IntentionConditionTransition,
    pub rule: IntentionConditionRule,
    pub updated_at: i64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum IntentionConditionTransition {
    Start,
    End,
}

impl IntentionConditionTransition {
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
            _ => Err(format!("Unknown intention condition transition: {}", value)),
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum IntentionConditionRule {
    Schedule(IntentionConditionScheduleRule),
    DateTime(IntentionConditionDateTimeRule),
    AfterTransition(IntentionConditionAfterTransitionRule),
    Manual,
}

impl IntentionConditionRule {
    pub fn as_str(&self) -> &'static str {
        return match self {
            Self::Schedule(_) => "schedule",
            Self::DateTime(_) => "date_time",
            Self::AfterTransition(_) => "after_transition",
            Self::Manual => "manual",
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IntentionConditionScheduleRule {
    pub time_of_day_ms: TimeOnly,
    pub weekdays_mask: Option<WeekdayMask>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IntentionConditionDateTimeRule {
    pub date_epoch_days: DateOnly,
    pub time_of_day_ms: TimeOnly,
    pub trigger_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IntentionConditionAfterTransitionRule {
    pub anchor_transition: IntentionConditionTransition,
    pub offset_ms: i64,
}

// MARK: - Intention Session

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IntentionSession {
    pub id: i64,
    pub intention_id: i64,
    pub status: IntentionSessionStatus,
    pub started_at: i64,
    pub start_condition_id: Option<i64>,
    pub ended_at: Option<i64>,
    pub end_condition_id: Option<i64>,
    pub updated_at: i64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum IntentionSessionStatus {
    Active,
    Completed,
    Stopped,
}

impl IntentionSessionStatus {
    pub fn from_str(value: &str) -> Result<Self, String> {
        return match value {
            "active" => Ok(Self::Active),
            "completed" => Ok(Self::Completed),
            "stopped" => Ok(Self::Stopped),
            _ => Err(format!("Unknown intention session status: {}", value)),
        };
    }
}
