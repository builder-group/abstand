use super::{
    session::{complete_session, start_session, SessionTransitionError},
    timed_evaluator::{
        evaluate_timed_conditions, TimedConditionTransition, TimedDueCondition,
        TimedEvaluationError,
    },
    types::IntentionRuntimeState,
};
use crate::{
    common::time::unix_ms_now,
    modules::{
        db::types::DatabaseState,
        scheduler::{scheduler::ScheduledJobId, types::SchedulerState},
    },
};
use std::{fmt, sync::Mutex};
use tauri::{AppHandle, Manager};
use tokio::sync::Mutex as AsyncMutex;

pub struct TimedRuntime {
    pending_wakeup: Mutex<Option<ScheduledJobId>>,
    reevaluate_lock: AsyncMutex<()>,
}

impl TimedRuntime {
    const MAX_REEVALUATION_PASSES: usize = 8;

    pub fn new() -> Self {
        return Self {
            pending_wakeup: Mutex::new(None),
            reevaluate_lock: AsyncMutex::new(()),
        };
    }

    pub async fn reevaluate(&self, app: &AppHandle) -> Result<(), TimedRuntimeError> {
        // Serialize reevaluations so older evaluations cannot replace newer wakeups
        let _reevaluate_guard = self.reevaluate_lock.lock().await;

        let database = app.state::<DatabaseState>();
        let mut next_wake_at = None;

        // Repeat while due conditions keep changing state, such as start then end-after-start
        for _ in 0..Self::MAX_REEVALUATION_PASSES {
            let evaluation = match evaluate_timed_conditions(&database.pool, unix_ms_now()).await {
                Ok(evaluation) => evaluation,
                Err(error) => {
                    // Retry in 5s because scheduler wakeups are one-shot and this failure may have consumed the only wakeup
                    self.schedule_wakeup(app, Some(unix_ms_now() + 5_000));
                    return Err(error.into());
                }
            };
            next_wake_at = evaluation.next_wake_at;
            if evaluation.due_conditions.is_empty() {
                self.schedule_wakeup(app, next_wake_at);
                return Ok(());
            }

            let mut did_apply_due_condition = false;
            let mut did_fail_due_condition = false;
            for due_condition in evaluation.due_conditions {
                match self.apply_due_condition(app, due_condition).await {
                    Ok(did_apply) => did_apply_due_condition |= did_apply,
                    Err(error) => {
                        did_fail_due_condition = true;
                        log::error!(
                            target: LOG_TARGET,
                            "failed to apply due condition: {}",
                            error
                        );
                    }
                }
            }

            if !did_apply_due_condition {
                if did_fail_due_condition {
                    // Retry within 5s because failed due conditions are not represented by the next future wakeup
                    let retry_at = unix_ms_now() + 5_000;
                    let wake_at = next_wake_at.map_or(retry_at, |wake_at| wake_at.min(retry_at));
                    self.schedule_wakeup(app, Some(wake_at));
                    return Ok(());
                }

                self.schedule_wakeup(app, next_wake_at);
                return Ok(());
            }
        }

        log::error!(
            target: LOG_TARGET,
            "timed reevaluation did not settle after {} passes",
            Self::MAX_REEVALUATION_PASSES
        );
        self.schedule_wakeup(app, next_wake_at);
        return Ok(());
    }

    async fn apply_due_condition(
        &self,
        app: &AppHandle,
        due: TimedDueCondition,
    ) -> Result<bool, TimedRuntimeError> {
        let intention_id = due.condition.intention_id;
        let condition_id = due.condition.condition_id;

        let result = match due.condition.transition {
            TimedConditionTransition::Start => {
                start_session(app, intention_id, Some(condition_id), due.trigger_at).await
            }
            TimedConditionTransition::End => {
                complete_session(app, intention_id, Some(condition_id), due.trigger_at).await
            }
        };

        if matches!(
            &result,
            Err(SessionTransitionError::IntentionNotFound(_))
                | Err(SessionTransitionError::NoActiveSession(_))
        ) {
            return Ok(false);
        }

        result?;
        return Ok(true);
    }

    fn schedule_wakeup(&self, app: &AppHandle, wake_at: Option<i64>) {
        self.cancel_pending_wakeup(app);

        let Some(wake_at) = wake_at else {
            return;
        };

        let scheduler = app.state::<SchedulerState>();
        let job_id = scheduler.0.schedule_at_unix_ms(
            "intentions:timed-wakeup".to_string(),
            wake_at,
            move |app| {
                tauri::async_runtime::spawn(async move {
                    let runtime = app.state::<IntentionRuntimeState>();
                    if let Err(error) = runtime.reevaluate(&app).await {
                        log::error!(
                            target: LOG_TARGET,
                            "intention reevaluation failed: {}",
                            error
                        );
                    }
                });
            },
        );

        *self.pending_wakeup.lock().unwrap() = Some(job_id);
    }

    fn cancel_pending_wakeup(&self, app: &AppHandle) {
        let job_id = self.pending_wakeup.lock().unwrap().take();
        let Some(job_id) = job_id else {
            return;
        };

        let scheduler = app.state::<SchedulerState>();
        scheduler.0.cancel(job_id);
    }
}

#[derive(Debug)]
pub enum TimedRuntimeError {
    TimedEvaluation(TimedEvaluationError),
    SessionTransition(SessionTransitionError),
}

impl fmt::Display for TimedRuntimeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::TimedEvaluation(error) => write!(f, "{}", error),
            Self::SessionTransition(error) => write!(f, "{}", error),
        };
    }
}

impl std::error::Error for TimedRuntimeError {}

impl From<TimedEvaluationError> for TimedRuntimeError {
    fn from(value: TimedEvaluationError) -> Self {
        return Self::TimedEvaluation(value);
    }
}

impl From<SessionTransitionError> for TimedRuntimeError {
    fn from(value: SessionTransitionError) -> Self {
        return Self::SessionTransition(value);
    }
}

const LOG_TARGET: &str = "modules::intentions::timed_runtime";
