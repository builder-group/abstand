use super::{
    intention::IntentionSession,
    repository::{
        CompleteIntentionSessionInput, CreateIntentionSessionInput, IntentionRepositoryError,
        IntentionSessionRepository, IntentionSessionRepositoryError, StopIntentionSessionInput,
    },
    types::{
        IntentionSessionCompletedEvent, IntentionSessionStartedEvent, IntentionSessionStoppedEvent,
    },
};
use crate::modules::db::types::DatabaseState;
use std::fmt;
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

pub async fn start_session(
    app: &AppHandle,
    intention_id: i64,
    start_condition_id: Option<i64>,
    started_at: i64,
) -> Result<IntentionSession, SessionTransitionError> {
    let database_state = app.state::<DatabaseState>();

    let session = IntentionSessionRepository::create_session_if_inactive(
        &database_state.pool,
        CreateIntentionSessionInput {
            intention_id,
            started_at,
            start_condition_id,
        },
    )
    .await?;
    let Some(session) = session else {
        // Reload to distinguish an already-active intention from a missing target
        return IntentionSessionRepository::get_active_session_by_intention_id(
            &database_state.pool,
            intention_id,
        )
        .await?
        .ok_or(SessionTransitionError::IntentionNotFound(intention_id));
    };

    let _ = IntentionSessionStartedEvent {
        intention_id,
        session_id: session.id,
    }
    .emit(app);

    return Ok(session);
}

pub async fn complete_session(
    app: &AppHandle,
    intention_id: i64,
    end_condition_id: Option<i64>,
    ended_at: i64,
) -> Result<IntentionSession, SessionTransitionError> {
    let database_state = app.state::<DatabaseState>();

    let active_session = IntentionSessionRepository::get_active_session_by_intention_id(
        &database_state.pool,
        intention_id,
    )
    .await?
    .ok_or(SessionTransitionError::NoActiveSession(intention_id))?;

    let session = IntentionSessionRepository::complete_session(
        &database_state.pool,
        CompleteIntentionSessionInput {
            session_id: active_session.id,
            ended_at,
            end_condition_id,
        },
    )
    .await?;
    let Some(session) = session else {
        return Err(SessionTransitionError::NoActiveSession(intention_id));
    };

    let _ = IntentionSessionCompletedEvent {
        intention_id,
        session_id: session.id,
    }
    .emit(app);

    return Ok(session);
}

pub async fn stop_session(
    app: &AppHandle,
    intention_id: i64,
    ended_at: i64,
) -> Result<IntentionSession, SessionTransitionError> {
    let database_state = app.state::<DatabaseState>();

    let active_session = IntentionSessionRepository::get_active_session_by_intention_id(
        &database_state.pool,
        intention_id,
    )
    .await?
    .ok_or(SessionTransitionError::NoActiveSession(intention_id))?;

    let session = IntentionSessionRepository::stop_session(
        &database_state.pool,
        StopIntentionSessionInput {
            session_id: active_session.id,
            ended_at,
        },
    )
    .await?;
    let Some(session) = session else {
        return Err(SessionTransitionError::NoActiveSession(intention_id));
    };

    let _ = IntentionSessionStoppedEvent {
        intention_id,
        session_id: session.id,
    }
    .emit(app);

    return Ok(session);
}

#[derive(Debug)]
pub enum SessionTransitionError {
    IntentionNotFound(i64),
    NoActiveSession(i64),
    IntentionRepository(IntentionRepositoryError),
    SessionRepository(IntentionSessionRepositoryError),
}

impl fmt::Display for SessionTransitionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::IntentionNotFound(id) => write!(f, "Intention {} does not exist", id),
            Self::NoActiveSession(id) => write!(f, "Intention {} has no active session", id),
            Self::IntentionRepository(error) => write!(f, "{}", error),
            Self::SessionRepository(error) => write!(f, "{}", error),
        };
    }
}

impl std::error::Error for SessionTransitionError {}

impl From<IntentionRepositoryError> for SessionTransitionError {
    fn from(value: IntentionRepositoryError) -> Self {
        return Self::IntentionRepository(value);
    }
}

impl From<IntentionSessionRepositoryError> for SessionTransitionError {
    fn from(value: IntentionSessionRepositoryError) -> Self {
        return Self::SessionRepository(value);
    }
}
