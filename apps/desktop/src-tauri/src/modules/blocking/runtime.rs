use super::{
    enrichment::enrich_blocking_violation,
    overlay,
    policy::{evaluate_active_target, BlockingPolicyDecision},
    types::{
        ActiveBlockingViolationChangedEvent, BlockedTarget, BlockingRuntimeState, BlockingViolation,
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
use std::{
    collections::HashMap,
    fmt,
    time::{Duration, Instant},
};
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
        runtime.clear_all_violations(app);
        return;
    }

    // Note: AppActivated can arrive before browser URL and window bounds. Wait
    // for WindowChanged to avoid transient app-only decisions.
    if focus.is_waiting_for_window_details() {
        let runtime_state = app.state::<BlockingRuntimeState>();
        let mut runtime = runtime_state.lock().unwrap();
        runtime.clear_focus_violation(app, &focus);
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

            runtime.clear_focus_violation(app, &focus);
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
    active_violations: HashMap<ActiveViolationKey, ActiveViolation>,
    focus_generation: u64,
}

impl BlockingRuntime {
    pub fn new() -> Self {
        return Self {
            active_violations: HashMap::new(),
            focus_generation: 0,
        };
    }

    pub fn active_violation(&self, key: &str) -> Option<ActiveViolation> {
        return self
            .active_violations
            .iter()
            .find(|(active_key, _)| active_key.to_string() == key)
            .map(|(_, active_violation)| active_violation.clone());
    }

    fn handle_allowed_focus(&mut self, app: &AppHandle, focus: &ActivityFocus) {
        log::info!(target: LOG_TARGET, "Allowed: {}", focus.summary());
        self.clear_focus_violation(app, focus);
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

        let key = ActiveViolationKey::from_blocked_focus(focus, &violation);
        let violation_changed = self
            .active_violations
            .get(&key)
            .map(|active_violation| &active_violation.violation)
            != Some(&violation);
        let paused_until = self
            .active_violations
            .get(&key)
            .filter(|active_violation| active_violation.violation == violation)
            .and_then(|active_violation| active_violation.paused_until);
        let active_violation = ActiveViolation {
            key: key.clone(),
            focus: focus.clone(),
            violation: violation.clone(),
            paused_until,
        };

        self.active_violations.insert(key.clone(), active_violation);

        if violation_changed {
            let _ = ActiveBlockingViolationChangedEvent {
                key: key.to_string(),
            }
            .emit(app);
        }

        if self.is_overlay_paused(&key) {
            return;
        }

        overlay::show(app, key.overlay_owner(), focus, &violation);
    }

    pub fn clear_all_violations(&mut self, app: &AppHandle) {
        let keys = self.active_violations.keys().cloned().collect::<Vec<_>>();
        for key in keys {
            self.clear_violation(app, &key);
        }
    }

    fn clear_violations_for_session_id(&mut self, app: &AppHandle, session_id: i64) {
        let keys = self
            .active_violations
            .iter()
            .filter_map(|(key, active_violation)| {
                if active_violation.violation.session_id != session_id {
                    return None;
                }

                return Some(key.clone());
            })
            .collect::<Vec<_>>();

        for key in keys {
            self.clear_violation(app, &key);
        }
    }

    fn clear_violations_for_bundle_id(&mut self, app: &AppHandle, bundle_id: &str) {
        let keys = self
            .active_violations
            .iter()
            .filter_map(|(key, active_violation)| {
                // Note: Device-wide violations also keep the focus that triggered them.
                // That focus bundle id does not make them owned by the app.
                if matches!(
                    active_violation.violation.blocked_target,
                    BlockedTarget::Device { .. }
                ) {
                    return None;
                };

                if active_violation.focus.target.app_bundle_id.as_deref() != Some(bundle_id) {
                    return None;
                }

                return Some(key.clone());
            })
            .collect::<Vec<_>>();

        for key in keys {
            self.clear_violation(app, &key);
        }
    }

    fn clear_focus_violation(&mut self, app: &AppHandle, focus: &ActivityFocus) {
        let Some(key) = ActiveViolationKey::from_focus(focus) else {
            return;
        };

        self.clear_violation(app, &key);
    }

    fn clear_violation(&mut self, app: &AppHandle, key: &ActiveViolationKey) {
        let Some(active_violation) = self.active_violations.remove(key) else {
            return;
        };

        let _ = ActiveBlockingViolationChangedEvent {
            key: active_violation.key(),
        }
        .emit(app);

        overlay::hide(app, active_violation.overlay_owner());
    }

    fn handle_window_bounds_change(&mut self, app: &AppHandle, window: &WindowBoundsChange) {
        let key = ActiveViolationKey::from_window_identity(window.app.pid, window.window_id);
        let Some(active_violation) = self.active_violations.get_mut(&key) else {
            return;
        };

        active_violation.update_window_bounds(window);

        if active_violation.is_paused() {
            return;
        }

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
        // Note: Window lifecycle events can miss the window id, so fall back to process-owned keys
        let keys = self
            .active_violations
            .keys()
            .filter(|key| key.matches_window_or_process(window.app.pid, window.window_id))
            .cloned()
            .collect::<Vec<_>>();

        self.next_focus_generation();
        for key in keys {
            self.clear_violation(app, &key);
        }
    }

    pub fn pause_overlay(
        &mut self,
        app: &AppHandle,
        key: &str,
        pause_duration: Duration,
    ) -> Result<(), String> {
        let Some((active_key, active_violation)) = self
            .active_violations
            .iter_mut()
            .find(|(active_key, _)| active_key.to_string() == key)
        else {
            return Err("Blocking overlay not found".to_string());
        };
        let active_key = active_key.clone();

        active_violation.paused_until = Some(Instant::now() + pause_duration);
        let owner = active_violation.overlay_owner();
        let triggering_process_id = active_violation.violation.triggering_process_id;
        overlay::hide_for_temporary_pause(app, owner, triggering_process_id);

        scheduler::schedule_after(app, "blocking overlay pause", pause_duration, move |app| {
            let runtime_state = app.state::<BlockingRuntimeState>();
            let mut runtime = runtime_state.lock().unwrap();
            runtime.resume_paused_overlay(&app, &active_key);
        });

        return Ok(());
    }

    fn resume_paused_overlay(&mut self, app: &AppHandle, key: &ActiveViolationKey) {
        if self.is_overlay_paused(key) {
            return;
        }

        let Some(active_violation) = self.active_violations.get(key) else {
            return;
        };

        overlay::show(
            app,
            active_violation.overlay_owner(),
            &active_violation.focus,
            &active_violation.violation,
        );
    }

    fn is_overlay_paused(&mut self, key: &ActiveViolationKey) -> bool {
        let Some(active_violation) = self.active_violations.get_mut(key) else {
            return false;
        };
        return active_violation.is_paused();
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
pub struct ActiveViolation {
    key: ActiveViolationKey,
    focus: ActivityFocus,
    violation: BlockingViolation,
    paused_until: Option<Instant>,
}

impl ActiveViolation {
    pub fn key(&self) -> String {
        return self.key.to_string();
    }

    pub fn violation(&self) -> BlockingViolation {
        return self.violation.clone();
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

    fn is_paused(&mut self) -> bool {
        let Some(paused_until) = self.paused_until else {
            return false;
        };

        if Instant::now() < paused_until {
            return true;
        }

        self.paused_until = None;
        return false;
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
enum ActiveViolationKey {
    Device,
    Window { pid: i32, window_id: u32 },
    AppProcess { pid: i32 },
}

impl ActiveViolationKey {
    fn from_blocked_focus(focus: &ActivityFocus, violation: &BlockingViolation) -> Self {
        if matches!(violation.blocked_target, BlockedTarget::Device { .. }) {
            return Self::Device;
        }

        return Self::from_focus(focus).unwrap_or(Self::AppProcess { pid: focus.pid });
    }

    fn from_focus(focus: &ActivityFocus) -> Option<Self> {
        if let Some(window_id) = focus.window_id {
            return Some(Self::Window {
                pid: focus.pid,
                window_id,
            });
        }

        if focus.pid > 0 {
            return Some(Self::AppProcess { pid: focus.pid });
        }

        return None;
    }

    fn from_window_identity(pid: i32, window_id: Option<u32>) -> Self {
        if let Some(window_id) = window_id {
            return Self::Window { pid, window_id };
        };

        return Self::AppProcess { pid };
    }

    fn matches_window_or_process(&self, pid: i32, window_id: Option<u32>) -> bool {
        return match (self, window_id) {
            (Self::Device, _) => false,
            (
                Self::Window {
                    pid: active_pid,
                    window_id: active_window_id,
                },
                Some(window_id),
            ) => *active_pid == pid && *active_window_id == window_id,
            (
                Self::Window {
                    pid: active_pid, ..
                },
                None,
            ) => *active_pid == pid,
            (Self::AppProcess { pid: active_pid }, _) => *active_pid == pid,
        };
    }

    fn overlay_owner(&self) -> OverlayWindowOwner {
        return OverlayWindowOwner::new(self.to_string());
    }
}

impl fmt::Display for ActiveViolationKey {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::Device => write!(formatter, "blocking:device"),
            Self::Window { pid, window_id } => {
                write!(formatter, "blocking:window:{pid}:{window_id}")
            }
            Self::AppProcess { pid } => write!(formatter, "blocking:app-process:{pid}"),
        };
    }
}

pub fn clear_violations_for_bundle_id(app: &AppHandle, bundle_id: &str) {
    let runtime_state = app.state::<BlockingRuntimeState>();
    let mut runtime = runtime_state.lock().unwrap();
    runtime.next_focus_generation();
    runtime.clear_violations_for_bundle_id(app, bundle_id);
}

pub fn clear_violations_for_session_id(app: &AppHandle, session_id: i64) {
    let runtime_state = app.state::<BlockingRuntimeState>();
    let mut runtime = runtime_state.lock().unwrap();
    runtime.next_focus_generation();
    runtime.clear_violations_for_session_id(app, session_id);
}

const LOG_TARGET: &str = "modules::blocking::runtime";
