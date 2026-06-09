use super::{
    policy::evaluate_active_target,
    types::{
        BlockingDecision, BlockingRuntimeState, BlockingViolation, BlockingViolationChangedEvent,
    },
};
use crate::modules::activity::types::ActivityFocus;
use tauri::AppHandle;
use tauri_specta::Event;

pub struct BlockingRuntime {
    active_violation: Option<BlockingViolation>,
}

impl BlockingRuntime {
    pub fn new() -> Self {
        return Self {
            active_violation: None,
        };
    }

    pub fn active_violation(&self) -> Option<BlockingViolation> {
        return self.active_violation.clone();
    }

    pub async fn handle_activity_focus(
        app: &AppHandle,
        runtime: &BlockingRuntimeState,
        focus: ActivityFocus,
    ) {
        if focus.is_own_process() {
            return;
        }

        // Note: AppActivated can arrive before browser URL/bounds; wait for WindowChanged to avoid transient app-only decisions
        if focus.is_waiting_for_window_details() {
            return;
        }

        let decision = match evaluate_active_target(app, &focus.target).await {
            Ok(decision) => decision,
            Err(error) => {
                log::error!(
                    target: LOG_TARGET,
                    "Blocking decision failed for {}: {}",
                    focus.summary(),
                    error
                );
                runtime.lock().unwrap().set_active_violation(app, None);
                return;
            }
        };

        let mut runtime = runtime.lock().unwrap();
        match decision {
            BlockingDecision::Allowed => runtime.handle_allowed_focus(app, &focus),
            BlockingDecision::Blocked(violation) => {
                runtime.handle_blocked_focus(app, &focus, violation)
            }
        }
    }

    fn handle_allowed_focus(&mut self, app: &AppHandle, focus: &ActivityFocus) {
        log::info!(target: LOG_TARGET, "Allowed: {}", focus.summary());
        self.set_active_violation(app, None);
    }

    fn handle_blocked_focus(
        &mut self,
        app: &AppHandle,
        focus: &ActivityFocus,
        violation: BlockingViolation,
    ) {
        log::info!(
            target: LOG_TARGET,
            "Blocked: {} by intention {} ({})",
            focus.summary(),
            violation.intention_id,
            violation.intention_name
        );
        self.set_active_violation(app, Some(violation));
    }

    fn set_active_violation(&mut self, app: &AppHandle, violation: Option<BlockingViolation>) {
        if violation == self.active_violation {
            return;
        }

        self.active_violation = violation.clone();
        let _ = BlockingViolationChangedEvent(violation).emit(app);
    }
}

const LOG_TARGET: &str = "modules::blocking::runtime";
