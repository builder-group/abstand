use super::{
    intention::IntentionSession,
    session::{complete_session, start_session, stop_session, SessionTransitionError},
    timed_runtime::{TimedRuntime, TimedRuntimeError},
};
use crate::common::time::unix_ms_now;
use std::fmt;
use tauri::AppHandle;

pub struct IntentionRuntime {
    timed: TimedRuntime,
}

impl IntentionRuntime {
    pub fn new() -> Self {
        return Self {
            timed: TimedRuntime::new(),
        };
    }

    pub async fn reevaluate(&self, app: &AppHandle) -> Result<(), IntentionRuntimeError> {
        return self
            .timed
            .reevaluate(app)
            .await
            .map_err(IntentionRuntimeError::TimedRuntime);
    }

    pub async fn start_intention(
        &self,
        app: &AppHandle,
        intention_id: i64,
    ) -> Result<IntentionSession, IntentionRuntimeError> {
        let session = start_session(app, intention_id, None, unix_ms_now()).await?;
        if let Err(error) = self.reevaluate(app).await {
            eprintln!(
                "Intention reevaluation after manual start failed: {}",
                error
            );
        }
        return Ok(session);
    }

    pub async fn complete_intention(
        &self,
        app: &AppHandle,
        intention_id: i64,
        end_condition_id: Option<i64>,
    ) -> Result<IntentionSession, IntentionRuntimeError> {
        let session = complete_session(app, intention_id, end_condition_id, unix_ms_now()).await?;
        if let Err(error) = self.reevaluate(app).await {
            eprintln!(
                "Intention reevaluation after manual complete failed: {}",
                error
            );
        }
        return Ok(session);
    }

    pub async fn stop_intention(
        &self,
        app: &AppHandle,
        intention_id: i64,
    ) -> Result<IntentionSession, IntentionRuntimeError> {
        let session = stop_session(app, intention_id, unix_ms_now()).await?;
        if let Err(error) = self.reevaluate(app).await {
            eprintln!("Intention reevaluation after manual stop failed: {}", error);
        }
        return Ok(session);
    }
}

#[derive(Debug)]
pub enum IntentionRuntimeError {
    TimedRuntime(TimedRuntimeError),
    SessionTransition(SessionTransitionError),
}

impl fmt::Display for IntentionRuntimeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::TimedRuntime(error) => write!(f, "{}", error),
            Self::SessionTransition(error) => write!(f, "{}", error),
        };
    }
}

impl std::error::Error for IntentionRuntimeError {}

impl From<SessionTransitionError> for IntentionRuntimeError {
    fn from(value: SessionTransitionError) -> Self {
        return Self::SessionTransition(value);
    }
}
