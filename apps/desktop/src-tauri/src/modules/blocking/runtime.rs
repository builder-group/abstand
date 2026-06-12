use super::{
    enrichment::enrich_blocking_violation,
    overlay,
    policy::{evaluate_active_target, BlockingPolicyDecision},
    types::{BlockingRuntimeState, BlockingViolation, BlockingViolationChangedEvent},
};
use crate::{
    app::window::AppWindow,
    modules::{
        activity::{monitor, types::ActivityFocus},
        scheduler,
    },
};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

pub async fn handle_activity_focus(app: &AppHandle, focus: ActivityFocus) {
    // Note: Policy checks can finish after newer focus events. Advance the
    // generation before early returns so app-owned windows still invalidate
    // stale decisions for external targets.
    let focus_generation = {
        let runtime_state = app.state::<BlockingRuntimeState>();
        let mut runtime = runtime_state.lock().unwrap();
        runtime.next_focus_generation()
    };

    // Note: The main app is the control surface for active blocking. Clear
    // visible blocking there, but keep overlay focus ignored because it
    // represents the blocked external target.
    if focus.is_own_process() {
        if AppWindow::Overlay.is_focused(app) {
            return;
        }

        let runtime_state = app.state::<BlockingRuntimeState>();
        let mut runtime = runtime_state.lock().unwrap();
        runtime.clear_active_violation(app);
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

    let next_violation = match decision {
        Ok(BlockingPolicyDecision::Blocked(policy_violation)) => {
            let violation = enrich_blocking_violation(app, &policy_violation, &focus).await;
            Some(violation)
        }
        Ok(BlockingPolicyDecision::Allowed) => None,
        Err(error) => {
            log::error!(
                target: LOG_TARGET,
                "Blocking decision failed for {}: {}",
                focus.summary(),
                error
            );
            let runtime_state = app.state::<BlockingRuntimeState>();
            let mut runtime = runtime_state.lock().unwrap();
            if !runtime.is_current_focus_generation(focus_generation) {
                return;
            }

            runtime.clear_active_violation(app);
            return;
        }
    };

    let runtime_state = app.state::<BlockingRuntimeState>();
    let mut runtime = runtime_state.lock().unwrap();
    if !runtime.is_current_focus_generation(focus_generation) {
        return;
    }

    match next_violation {
        None => runtime.handle_allowed_focus(app, &focus),
        Some(violation) => {
            runtime.handle_blocked_focus(app, &focus, violation);
        }
    }
}

pub struct BlockingRuntime {
    active_violation: Option<BlockingViolation>,
    overlay_paused_until: Option<Instant>,
    focus_generation: u64,
}

impl BlockingRuntime {
    pub fn new() -> Self {
        return Self {
            active_violation: None,
            overlay_paused_until: None,
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
        if self.is_overlay_paused() {
            return;
        }

        overlay::show(app, focus, &violation);
    }

    fn set_active_violation(&mut self, app: &AppHandle, violation: Option<BlockingViolation>) {
        if violation == self.active_violation {
            return;
        }

        self.active_violation = violation.clone();
        let _ = BlockingViolationChangedEvent(violation).emit(app);
    }

    pub fn clear_active_violation(&mut self, app: &AppHandle) {
        self.set_active_violation(app, None);
        overlay::hide(app);
    }

    pub fn pause_overlay(&mut self, app: AppHandle, pause_duration: Duration) {
        self.overlay_paused_until = Some(Instant::now() + pause_duration);
        overlay::hide(&app);

        scheduler::schedule_after(&app, "blocking overlay pause", pause_duration, move |app| {
            // Note: Re-check focus after the pause instead of restoring the old overlay
            // because the blocked window may have moved or focus may have changed
            match monitor::get_current_focus() {
                Ok(focus) => {
                    tauri::async_runtime::spawn(async move {
                        handle_activity_focus(&app, focus).await;
                    });
                }
                Err(error) => {
                    log::warn!(
                        target: LOG_TARGET,
                        "failed to resolve focus after blocking overlay pause: {}",
                        error
                    );
                }
            };
        });
    }

    fn is_overlay_paused(&mut self) -> bool {
        let Some(paused_until) = self.overlay_paused_until else {
            return false;
        };

        if Instant::now() < paused_until {
            return true;
        }

        self.overlay_paused_until = None;
        return false;
    }

    pub fn next_focus_generation(&mut self) -> u64 {
        self.focus_generation = self.focus_generation.wrapping_add(1);
        return self.focus_generation;
    }

    fn is_current_focus_generation(&self, focus_generation: u64) -> bool {
        return self.focus_generation == focus_generation;
    }
}

const LOG_TARGET: &str = "modules::blocking::runtime";
