use crate::{
    common::time::unix_ms_now,
    modules::db::{runtime_state::RuntimeStateRepository, types::DatabaseState},
};
use std::time::Duration;
use tauri::{AppHandle, Manager};

pub struct ForegroundActivityHeartbeat;

impl ForegroundActivityHeartbeat {
    pub fn interval() -> tokio::time::Interval {
        let mut interval = tokio::time::interval(FOREGROUND_RECORDER_HEARTBEAT_INTERVAL);
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        return interval;
    }

    pub async fn stale_activity_ended_at(app: &AppHandle) -> i64 {
        let database_state = app.state::<DatabaseState>();
        return match RuntimeStateRepository::get_i64(
            &database_state.pool,
            FOREGROUND_RECORDER_LAST_SEEN_AT_KEY,
        )
        .await
        {
            Ok(Some(last_seen_at)) => last_seen_at,
            Ok(None) => unix_ms_now(),
            Err(error) => {
                log::warn!(
                    target: LOG_TARGET,
                    "failed to read foreground activity heartbeat: {}",
                    error
                );
                unix_ms_now()
            }
        };
    }

    pub async fn record(app: &AppHandle) {
        let database_state = app.state::<DatabaseState>();
        if let Err(error) = RuntimeStateRepository::set_i64(
            &database_state.pool,
            FOREGROUND_RECORDER_LAST_SEEN_AT_KEY,
            unix_ms_now(),
        )
        .await
        {
            log::warn!(
                target: LOG_TARGET,
                "failed to record foreground activity heartbeat: {}",
                error
            );
        }
    }
}

const LOG_TARGET: &str = "modules::activity::heartbeat";
const FOREGROUND_RECORDER_LAST_SEEN_AT_KEY: &str = "activity.foreground_recorder.last_seen_at";
const FOREGROUND_RECORDER_HEARTBEAT_INTERVAL: Duration = Duration::from_secs(10);
