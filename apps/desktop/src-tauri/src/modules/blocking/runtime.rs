use super::{
    enrichment::enrich_blocking_violation,
    overlay,
    policy::{evaluate_active_target, BlockingPolicyDecision},
    types::{
        BlockedTarget, BlockingRuntimeState, BlockingViolation, BlockingViolationChangedEvent,
    },
};
use crate::{
    app::window::overlay_window::{self, types::OverlayWindowOwner},
    modules::{
        activity::{
            focus::{ActivityFocus, ActivityWindowBounds},
            monitor,
        },
        scheduler,
    },
};
use mado::{WindowBoundsChange, WindowEvent, WindowLifecycleChange};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

pub async fn handle_window_event(app: &AppHandle, event: WindowEvent, expects_window_update: bool) {
    match event {
        WindowEvent::AppActivated { app: app_info } => {
            let focus = ActivityFocus::from_app_info(app_info, expects_window_update);
            handle_activity_focus(app, focus).await;
        }
        WindowEvent::WindowChanged { window } => {
            let focus = ActivityFocus::from_window_info(window);
            handle_activity_focus(app, focus).await;
        }
        WindowEvent::WindowBoundsChanged { window } => {
            let runtime_state = app.state::<BlockingRuntimeState>();
            let mut runtime = runtime_state.lock().unwrap();
            runtime.handle_window_bounds_change(app, &window);
        }
        WindowEvent::WindowMinimized { window } | WindowEvent::WindowDestroyed { window } => {
            let runtime_state = app.state::<BlockingRuntimeState>();
            let mut runtime = runtime_state.lock().unwrap();
            runtime.handle_window_minimized_or_destroyed(app, &window);
        }
        WindowEvent::WindowRestored { .. } => match monitor::get_current_focus() {
            Ok(focus) => {
                handle_activity_focus(app, focus).await;
            }
            Err(error) => {
                log::warn!(
                    target: LOG_TARGET,
                    "failed to resolve focus after window restore: {}",
                    error
                );
            }
        },
    }
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

    // Note: The main app is the control surface for active blocking. Clear
    // visible blocking there, but keep overlay focus ignored because it
    // represents the blocked external target.
    if focus.is_own_process() {
        if focus.is_waiting_for_window_details() {
            return;
        }

        if overlay_window::is_any_focused(app) {
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
    active_violation: Option<ActiveViolation>,
    focus_generation: u64,
}

impl BlockingRuntime {
    pub fn new() -> Self {
        return Self {
            active_violation: None,
            focus_generation: 0,
        };
    }

    pub fn active_violation(&self) -> Option<BlockingViolation> {
        return self
            .active_violation
            .as_ref()
            .map(|active_violation| active_violation.violation.clone());
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

        let previous_violation = self
            .active_violation
            .as_ref()
            .map(|active_violation| active_violation.violation.clone());
        let previous_owner = self
            .active_violation
            .as_ref()
            .map(|active_violation| active_violation.overlay_owner());
        // Note: Keep the temporary pause when focus refreshes for the same public violation,
        // while a different blocked target should start unpaused
        let paused_until = self
            .active_violation
            .as_ref()
            .filter(|active_violation| active_violation.violation == violation)
            .and_then(|active_violation| active_violation.paused_until);

        let active_violation =
            ActiveViolation::from_blocked_focus(focus, violation.clone(), paused_until);
        let owner = active_violation.overlay_owner();

        self.active_violation = Some(active_violation);

        // Note: Until active violations are stored in a map, replacing the single active violation
        // must hide the previous owner so we do not leave an untracked overlay visible.
        if previous_owner
            .as_ref()
            .is_some_and(|old_owner| old_owner != &owner)
        {
            if let Some(previous_owner) = previous_owner {
                overlay::hide(app, previous_owner);
            }
        }

        if previous_violation.as_ref() != Some(&violation) {
            let _ = BlockingViolationChangedEvent(Some(violation.clone())).emit(app);
        }

        if self.is_overlay_paused() {
            return;
        }

        overlay::show(app, owner, focus, &violation);
    }

    pub fn clear_active_violation(&mut self, app: &AppHandle) {
        let Some(active_violation) = self.active_violation.take() else {
            return;
        };

        let _ = BlockingViolationChangedEvent(None).emit(app);
        overlay::hide(app, active_violation.overlay_owner());
    }

    fn handle_window_bounds_change(&mut self, app: &AppHandle, window: &WindowBoundsChange) {
        if self.is_overlay_paused() {
            return;
        }

        let Some(active_violation) = self.active_violation.as_mut() else {
            return;
        };

        if !active_violation.matches_process_id(window.app.pid) {
            return;
        }

        active_violation.update_window_bounds(window);
        overlay::handle_window_bounds_change(
            app,
            active_violation.overlay_owner(),
            window,
            &active_violation.violation,
        );
    }

    fn handle_window_minimized_or_destroyed(
        &mut self,
        app: &AppHandle,
        window: &WindowLifecycleChange,
    ) {
        let Some(active_violation) = self.active_violation.as_ref() else {
            return;
        };

        if !active_violation.matches_process_id(window.app.pid) {
            return;
        }

        self.next_focus_generation();
        self.clear_active_violation(app);
    }

    pub fn pause_overlay(&mut self, app: AppHandle, pause_duration: Duration) {
        match &mut self.active_violation {
            Some(active_violation) => {
                active_violation.paused_until = Some(Instant::now() + pause_duration);
                overlay::hide_for_temporary_pause(
                    &app,
                    active_violation.overlay_owner(),
                    active_violation.violation.triggering_process_id,
                )
            }
            None => {}
        }

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
        let Some(active_violation) = self.active_violation.as_mut() else {
            return false;
        };
        let Some(paused_until) = active_violation.paused_until else {
            return false;
        };

        if Instant::now() < paused_until {
            return true;
        }

        active_violation.paused_until = None;
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

#[derive(Debug, Clone, PartialEq)]
struct ActiveViolation {
    key: ActiveViolationKey,
    focus: ActivityFocus,
    violation: BlockingViolation,
    paused_until: Option<Instant>,
}

impl ActiveViolation {
    fn from_blocked_focus(
        focus: &ActivityFocus,
        violation: BlockingViolation,
        paused_until: Option<Instant>,
    ) -> Self {
        return Self {
            key: ActiveViolationKey::from_focus(focus, &violation),
            focus: focus.clone(),
            violation,
            paused_until,
        };
    }

    fn matches_process_id(&self, pid: i32) -> bool {
        if self.key.matches_process_id(pid) {
            return true;
        }

        return self.violation.triggering_process_id == pid;
    }

    fn overlay_owner(&self) -> OverlayWindowOwner {
        return self.key.overlay_owner();
    }

    fn update_window_bounds(&mut self, window: &WindowBoundsChange) {
        let Some(bounds) = window.bounds.as_ref() else {
            return;
        };

        self.focus.window_bounds = Some(ActivityWindowBounds::from(bounds.clone()));
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
enum ActiveViolationKey {
    Device,
    Window { pid: i32, window_id: u32 },
    AppProcess { pid: i32 },
}

impl ActiveViolationKey {
    fn from_focus(focus: &ActivityFocus, violation: &BlockingViolation) -> Self {
        if matches!(violation.blocked_target, BlockedTarget::Device { .. }) {
            return Self::Device;
        }

        if let Some(window_id) = focus.window_id {
            return Self::Window {
                pid: focus.pid,
                window_id,
            };
        }

        return Self::AppProcess { pid: focus.pid };
    }

    fn matches_process_id(&self, process_id: i32) -> bool {
        return match self {
            Self::Device => false,
            Self::Window { pid, .. } | Self::AppProcess { pid } => *pid == process_id,
        };
    }

    fn overlay_owner(&self) -> OverlayWindowOwner {
        let owner_id = match self {
            Self::Device => "blocking:device".to_string(),
            Self::Window { pid, window_id } => format!("blocking:window:{pid}:{window_id}"),
            Self::AppProcess { pid } => format!("blocking:app-process:{pid}"),
        };

        return OverlayWindowOwner::new(owner_id);
    }
}

pub fn clear_app_violation_for_bundle_id(app: &AppHandle, bundle_id: &str) {
    let runtime_state = app.state::<BlockingRuntimeState>();
    let mut runtime = runtime_state.lock().unwrap();
    let Some(active_violation) = runtime.active_violation() else {
        return;
    };
    let BlockedTarget::App {
        bundle_id: active_bundle_id,
        ..
    } = active_violation.blocked_target
    else {
        return;
    };

    if active_bundle_id != bundle_id {
        return;
    }

    runtime.next_focus_generation();
    runtime.clear_active_violation(app);
}

const LOG_TARGET: &str = "modules::blocking::runtime";
