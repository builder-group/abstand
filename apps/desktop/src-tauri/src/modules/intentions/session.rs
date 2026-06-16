use super::{
    intention::IntentionSession,
    repository::{
        CompleteIntentionSessionInput, CreateIntentionSessionInput, IntentionRepository,
        IntentionRepositoryError, IntentionSessionRepository, IntentionSessionRepositoryError,
        StopIntentionSessionInput,
    },
    types::{
        IntentionSessionCompletedEvent, IntentionSessionStartedEvent, IntentionSessionStoppedEvent,
    },
};
use crate::modules::{
    activity::monitor,
    blocking::{self, types::BlockingRuntimeState},
    db::types::DatabaseState,
};
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
    // Note: A skipped insert can mean already active, paused, or missing
    let Some(session) = session else {
        // Note: Check active first so "Pause After This Run" keeps start idempotent for the current session
        let active_session = IntentionSessionRepository::get_active_session_by_intention_id(
            &database_state.pool,
            intention_id,
        )
        .await?;
        if let Some(active_session) = active_session {
            return Ok(active_session);
        }

        let intention = IntentionRepository::get_by_id(&database_state.pool, intention_id).await?;
        let Some(intention) = intention else {
            return Err(SessionTransitionError::IntentionNotFound(intention_id));
        };
        if intention.paused_at.is_some() {
            return Err(SessionTransitionError::IntentionPaused(intention_id));
        }

        return Err(SessionTransitionError::IntentionStartConflict(intention_id));
    };

    let _ = IntentionSessionStartedEvent {
        intention_id,
        session_id: session.id,
    }
    .emit(app);
    refresh_blocking(app).await;

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
    clear_blocking(app, session.id);

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
    clear_blocking(app, session.id);

    return Ok(session);
}

fn clear_blocking(app: &AppHandle, session_id: i64) {
    let runtime_state = app.state::<BlockingRuntimeState>();
    let mut runtime = runtime_state.lock().unwrap();
    runtime.next_focus_generation();

    let Some(active_violation) = runtime.active_violation() else {
        return;
    };
    if active_violation.session_id != session_id {
        return;
    }

    runtime.clear_active_violation(app);
}

async fn refresh_blocking(app: &AppHandle) {
    match monitor::get_current_focus() {
        Ok(focus) => {
            blocking::runtime::handle_activity_focus(app, focus).await;
        }
        Err(error) => {
            log::warn!(
                target: LOG_TARGET,
                "failed to refresh blocking after session start: {}",
                error
            );
        }
    }
}

#[derive(Debug)]
pub enum SessionTransitionError {
    IntentionNotFound(i64),
    IntentionPaused(i64),
    IntentionStartConflict(i64),
    NoActiveSession(i64),
    IntentionRepository(IntentionRepositoryError),
    SessionRepository(IntentionSessionRepositoryError),
}

impl fmt::Display for SessionTransitionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::IntentionNotFound(id) => write!(f, "Intention {} does not exist", id),
            Self::IntentionPaused(id) => write!(f, "Intention {} is paused", id),
            Self::IntentionStartConflict(id) => write!(
                f,
                "Intention {} could not be started because its session state changed",
                id
            ),
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

const LOG_TARGET: &str = "modules::intentions::session";
