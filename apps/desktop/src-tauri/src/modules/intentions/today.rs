use super::{
    condition_timing,
    intention::{Intention, IntentionSession},
    repository::{IntentionRepository, IntentionSessionRepository},
    timed_evaluator::{TimedConditionActivation, TimedConditionTransition},
};
use crate::common::time::local_day_bounds_containing;
use serde::Serialize;
use sqlx::{Pool, Sqlite};
use std::collections::HashMap;

pub async fn get_active(pool: &Pool<Sqlite>) -> Result<Vec<TodayActiveIntention>, String> {
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

        active.push(TodayActiveIntention {
            intention,
            session,
            automatic_end_at,
        });
    }

    return Ok(active);
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TodayActiveIntention {
    pub intention: Intention,
    pub session: IntentionSession,
    pub automatic_end_at: Option<i64>,
}

pub async fn get_upcoming(
    pool: &Pool<Sqlite>,
    now: i64,
) -> Result<Vec<TodayUpcomingIntention>, String> {
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

        upcoming_today.push(TodayUpcomingIntention {
            intention,
            trigger_at,
        });
    }

    return Ok(upcoming_today);
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TodayUpcomingIntention {
    pub intention: Intention,
    pub trigger_at: i64,
}

pub async fn get_earlier(
    pool: &Pool<Sqlite>,
    now: i64,
) -> Result<Vec<TodayEarlierIntention>, String> {
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

        earlier_today.push(TodayEarlierIntention { intention, session });
    }

    return Ok(earlier_today);
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TodayEarlierIntention {
    pub intention: Intention,
    pub session: IntentionSession,
}
