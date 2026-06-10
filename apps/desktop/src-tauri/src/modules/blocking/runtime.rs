use super::{
    overlay,
    policy::evaluate_active_target,
    types::{
        BlockingDecision, BlockingRuntimeState, BlockingViolation, BlockingViolationChangedEvent,
    },
};
use crate::modules::activity::types::ActivityFocus;
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

pub struct BlockingRuntime {
    active_violation: Option<BlockingViolation>,
    focus_generation: u64,
}

pub async fn handle_activity_focus(app: &AppHandle, focus: ActivityFocus) {
    // Note: Policy checks can finish after newer focus events. Advance the
    // generation before early returns so app-owned windows still invalidate
    // stale decisions for external targets.
    let focus_generation = {
        let runtime_state = app.state::<BlockingRuntimeState>();
        let mut runtime = runtime_state.lock().unwrap();
        runtime.next_focus_generation()
    };

    // Note: App-owned windows are not policy targets. Keep the active violation
    // when the main app or overlay receives focus while an external target is blocked.
    if focus.is_own_process() {
        return;
    }

    // Note: AppActivated can arrive before browser URL and window bounds. Wait
    // for WindowChanged to avoid transient app-only decisions.
    if focus.is_waiting_for_window_details() {
        let runtime_state = app.state::<BlockingRuntimeState>();
        let mut runtime = runtime_state.lock().unwrap();
        runtime.clear_active_violation(app);
        return;
    }

    let decision = evaluate_active_target(app, &focus.target).await;

    let runtime_state = app.state::<BlockingRuntimeState>();
    let mut runtime = runtime_state.lock().unwrap();
    if !runtime.is_current_focus_generation(focus_generation) {
        return;
    }

    match decision {
        Ok(BlockingDecision::Allowed) => runtime.handle_allowed_focus(app, &focus),
        Ok(BlockingDecision::Blocked(violation)) => {
            runtime.handle_blocked_focus(app, &focus, violation);
        }
        Err(error) => {
            log::error!(
                target: LOG_TARGET,
                "Blocking decision failed for {}: {}",
                focus.summary(),
                error
            );
            runtime.clear_active_violation(app);
        }
    }
}

impl BlockingRuntime {
    pub fn new() -> Self {
        return Self {
            active_violation: None,
            focus_generation: 0,
        };
    }

    pub fn active_violation(&self) -> Option<BlockingViolation> {
        return self.active_violation.clone();
    }

    fn handle_allowed_focus(&mut self, app: &AppHandle, focus: &ActivityFocus) {
        log::info!(target: LOG_TARGET, "Allowed: {}", focus.summary());
        self.clear_active_violation(app);
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
        self.set_active_violation(app, Some(violation.clone()));
        overlay::show(app, focus, &violation);
    }

    fn set_active_violation(&mut self, app: &AppHandle, violation: Option<BlockingViolation>) {
        if violation == self.active_violation {
            return;
        }

        self.active_violation = violation.clone();
        let _ = BlockingViolationChangedEvent(violation).emit(app);
    }

    fn clear_active_violation(&mut self, app: &AppHandle) {
        self.set_active_violation(app, None);
        overlay::hide(app);
    }

    fn next_focus_generation(&mut self) -> u64 {
        self.focus_generation = self.focus_generation.wrapping_add(1);
        return self.focus_generation;
    }

    fn is_current_focus_generation(&self, focus_generation: u64) -> bool {
        return self.focus_generation == focus_generation;
    }
}

const LOG_TARGET: &str = "modules::blocking::runtime";
