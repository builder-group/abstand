use super::{
    enrichment::enrich_blocking_violation,
    observation::ObservedActivity,
    overlay,
    policy::{evaluate_active_target, BlockingPolicyDecision},
    types::{
        ActiveBlockingViolationChangedEvent, BlockedTarget, BlockingRuntimeState, BlockingViolation,
    },
};
use crate::{
    app::window::overlay_window::types::OverlayWindowOwner,
    common::time::unix_ms_now,
    modules::{intentions::block_policy::BlockPolicyTarget, scheduler},
};
use mado::{WindowBoundsChange, WindowEvent, WindowLifecycleChange};
use std::{collections::HashMap, fmt, time::Duration};
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

/// Processes one monitor event. The caller must await each event before submitting the next.
pub async fn handle_window_event(app: &AppHandle, event: WindowEvent) {
    match event {
        WindowEvent::AppActivated { app: app_info } => {
            let observation = ObservedActivity::from_app_info(app_info);
            evaluate_window(app, observation, true).await;
        }
        WindowEvent::AppTerminated { app: app_info } => {
            let runtime_state = app.state::<BlockingRuntimeState>();
            let mut runtime = runtime_state.lock().unwrap();
            runtime.handle_app_terminated(app, app_info.pid);
        }
        WindowEvent::WindowChanged { window } => {
            let observation = ObservedActivity::from_window_info(window);
            evaluate_window(app, observation, true).await;
        }
        WindowEvent::WindowUpdated { window } => {
            evaluate_window(app, ObservedActivity::from_window_info(window), false).await;
        }
        WindowEvent::WindowBoundsChanged { window } => {
            let runtime_state = app.state::<BlockingRuntimeState>();
            let mut runtime = runtime_state.lock().unwrap();
            runtime.handle_window_bounds_change(app, &window);
        }
        WindowEvent::WindowDestroyed { window } => {
            let runtime_state = app.state::<BlockingRuntimeState>();
            let mut runtime = runtime_state.lock().unwrap();
            runtime.handle_window_destroyed(app, &window);
        }
        // Note: Native attachment hides absent targets and restores their coverage without changing focus
        WindowEvent::WindowMinimized { .. } | WindowEvent::WindowRestored { .. } => {}
    }
}

async fn evaluate_window(app: &AppHandle, observation: ObservedActivity, is_foreground: bool) {
    if !is_foreground && observation.window_id.is_none() {
        return;
    }
    // Note: Session changes can invalidate a policy check while its database reads are pending
    let policy_generation = app
        .state::<BlockingRuntimeState>()
        .lock()
        .unwrap()
        .policy_generation;

    // Note: App-owned windows and loginwindow transitions are not blocking targets.
    // Keep existing overlays alive so transient focus changes do not clear active violations.
    if observation.is_own_process() || observation.is_login_window() {
        return;
    }

    {
        let runtime_state = app.state::<BlockingRuntimeState>();
        let mut runtime = runtime_state.lock().unwrap();
        if is_foreground {
            runtime.clear_obsolete_process_violations(app, &observation);
        }
    }

    // Note: App identity is enough for app/device blocks even when AX window details are missing
    let decision = evaluate_active_target(app, &observation.target).await;

    let next_violation = match decision {
        Ok(BlockingPolicyDecision::Blocked(policy_violation)) => {
            // Note: Background coverage needs bounds so a fallback overlay cannot cover other apps
            if !is_foreground && observation.window_bounds.is_none() {
                return;
            }
            // Note: A device overlay follows the foreground display, not background window updates
            if !is_foreground
                && matches!(policy_violation.blocked_target, BlockPolicyTarget::Device)
            {
                return;
            }
            let violation = enrich_blocking_violation(app, &policy_violation, &observation).await;
            Some(violation)
        }
        Ok(BlockingPolicyDecision::Allowed) => {
            let runtime_state = app.state::<BlockingRuntimeState>();
            let runtime = runtime_state.lock().unwrap();
            // Note: Missing browser metadata is not evidence that a previously blocked page is allowed
            if !observation.has_browser_url && runtime.has_website_violation(&observation) {
                return;
            }
            None
        }
        Err(error) => {
            log::error!(
                target: LOG_TARGET,
                "Blocking decision failed for {}: {}",
                observation.summary(),
                error
            );
            // Note: Keep existing coverage when a policy read fails
            return;
        }
    };

    let runtime_state = app.state::<BlockingRuntimeState>();
    let mut runtime = runtime_state.lock().unwrap();
    if runtime.policy_generation != policy_generation {
        return;
    }

    match next_violation {
        None => runtime.handle_allowed_observation(app, &observation),
        Some(violation) => {
            runtime.handle_blocked_observation(app, &observation, violation);
        }
    }
}

pub struct BlockingRuntime {
    active_violations: HashMap<ActiveViolationKey, ActiveViolation>,
    policy_generation: u64,
}

impl BlockingRuntime {
    pub fn new() -> Self {
        return Self {
            active_violations: HashMap::new(),
            policy_generation: 0,
        };
    }

    pub fn violation(&self, key: &str) -> Option<BlockingViolation> {
        return self
            .active_violations
            .iter()
            .find(|(active_key, _)| active_key.to_string() == key)
            .map(|(_, active_violation)| active_violation.violation.clone());
    }

    fn has_website_violation(&self, observation: &ObservedActivity) -> bool {
        ActiveViolationKey::from_observation(observation)
            .and_then(|key| self.active_violations.get(&key))
            .is_some_and(|active| {
                matches!(
                    active.violation.blocked_target,
                    BlockedTarget::Website { .. }
                )
            })
    }

    fn clear_obsolete_process_violations(
        &mut self,
        app: &AppHandle,
        observation: &ObservedActivity,
    ) {
        let keys = self
            .active_violations
            .keys()
            .filter(|key| {
                matches!(key, ActiveViolationKey::AppProcess { pid }
                if *pid != observation.pid || observation.window_id.is_some())
            })
            .cloned()
            .collect::<Vec<_>>();
        for key in keys {
            self.clear_violation(app, &key);
        }
    }

    fn handle_allowed_observation(&mut self, app: &AppHandle, observation: &ObservedActivity) {
        log::info!(target: LOG_TARGET, "Allowed: {}", observation.summary());
        self.clear_observation_violation(app, observation);
    }

    fn handle_blocked_observation(
        &mut self,
        app: &AppHandle,
        observation: &ObservedActivity,
        violation: BlockingViolation,
    ) {
        log::info!(
            target: LOG_TARGET,
            "Blocked: {} by intention {} ({})",
            observation.summary(),
            violation.intention_id,
            violation.intention_name
        );

        let key = ActiveViolationKey::from_blocked_observation(observation, &violation);
        let violation_changed = self
            .active_violations
            .get(&key)
            .map(|active_violation| &active_violation.violation)
            != Some(&violation);
        let paused_until_unix_ms = self
            .active_violations
            .get(&key)
            // Note: Refined browser metadata can change the block target without ending the window's pause
            .filter(|active_violation| {
                active_violation.violation.session_id == violation.session_id
                    && active_violation.violation.triggering_process_id
                        == violation.triggering_process_id
            })
            .and_then(|active_violation| active_violation.paused_until_unix_ms);
        let active_violation = ActiveViolation {
            key: key.clone(),
            observation: observation.clone(),
            violation: violation.clone(),
            paused_until_unix_ms,
        };
        let is_paused = active_violation.is_paused(unix_ms_now());

        self.active_violations.insert(key.clone(), active_violation);

        if violation_changed {
            let _ = ActiveBlockingViolationChangedEvent {
                key: key.to_string(),
            }
            .emit(app);
        }

        if is_paused {
            return;
        }

        overlay::show(app, key.overlay_owner(), observation, &violation);
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
                // Note: Device-wide violations also keep the observation that triggered them.
                // That observation bundle id does not make them owned by the app.
                if matches!(
                    active_violation.violation.blocked_target,
                    BlockedTarget::Device { .. }
                ) {
                    return None;
                };

                if active_violation.observation.target.app_bundle_id.as_deref() != Some(bundle_id) {
                    return None;
                }

                return Some(key.clone());
            })
            .collect::<Vec<_>>();

        for key in keys {
            self.clear_violation(app, &key);
        }
    }

    fn clear_observation_violation(&mut self, app: &AppHandle, observation: &ObservedActivity) {
        let Some(key) = ActiveViolationKey::from_observation(observation) else {
            return;
        };

        self.clear_violation(app, &key);
    }

    fn clear_violation(&mut self, app: &AppHandle, key: &ActiveViolationKey) {
        let Some(active_violation) = self.active_violations.remove(key) else {
            return;
        };

        let _ = ActiveBlockingViolationChangedEvent {
            key: active_violation.key.to_string(),
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

        if active_violation.is_paused(unix_ms_now()) {
            return;
        }

        overlay::handle_window_bounds_change(
            app,
            active_violation.overlay_owner(),
            window,
            &active_violation.violation,
        );
    }

    fn handle_window_destroyed(&mut self, app: &AppHandle, window: &WindowLifecycleChange) {
        // Note: An unidentified close can clear a process fallback but cannot identify sibling windows
        let keys = self
            .active_violations
            .keys()
            .filter(|key| key.matches_window_or_process(window.app.pid, window.window_id))
            .cloned()
            .collect::<Vec<_>>();

        for key in keys {
            self.clear_violation(app, &key);
        }
    }

    fn handle_app_terminated(&mut self, app: &AppHandle, pid: i32) {
        let keys = self
            .active_violations
            .keys()
            .filter(|key| key.is_owned_by_process(pid))
            .cloned()
            .collect::<Vec<_>>();
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

        // Note: The pause check and scheduler share wall time so sleep cannot consume the resume callback early
        let deadline = i64::try_from(pause_duration.as_millis())
            .ok()
            .and_then(|duration_ms| unix_ms_now().checked_add(duration_ms))
            .ok_or_else(|| "Overlay pause duration is too long".to_string())?;
        active_violation.paused_until_unix_ms = Some(deadline);
        let owner = active_violation.overlay_owner();
        let triggering_process_id = active_violation.violation.triggering_process_id;
        overlay::hide_for_temporary_pause(app, owner, triggering_process_id);

        scheduler::schedule_at_unix_ms(app, "blocking overlay pause", deadline, move |app| {
            let runtime_state = app.state::<BlockingRuntimeState>();
            let mut runtime = runtime_state.lock().unwrap();
            runtime.resume_paused_overlay(&app, &active_key);
        });

        return Ok(());
    }

    fn resume_paused_overlay(&mut self, app: &AppHandle, key: &ActiveViolationKey) {
        let Some(active_violation) = self.active_violations.get(key) else {
            return;
        };
        if active_violation.is_paused(unix_ms_now()) {
            return;
        }

        overlay::show(
            app,
            active_violation.overlay_owner(),
            &active_violation.observation,
            &active_violation.violation,
        );
    }
}

#[derive(Debug, Clone)]
struct ActiveViolation {
    key: ActiveViolationKey,
    observation: ObservedActivity,
    violation: BlockingViolation,
    paused_until_unix_ms: Option<i64>,
}

impl ActiveViolation {
    fn overlay_owner(&self) -> OverlayWindowOwner {
        return self.key.overlay_owner();
    }

    fn update_window_bounds(&mut self, window: &WindowBoundsChange) {
        // Note: Native attachment handles movement while preserving paired window/content bounds
        if matches!(self.violation.blocked_target, BlockedTarget::Website { .. }) {
            return;
        }
        let Some(bounds) = window.bounds.as_ref() else {
            return;
        };

        self.observation.window_bounds = Some(bounds.clone());
    }

    fn is_paused(&self, now_unix_ms: i64) -> bool {
        return self
            .paused_until_unix_ms
            .is_some_and(|deadline| now_unix_ms < deadline);
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
enum ActiveViolationKey {
    Device,
    Window { pid: i32, window_id: u32 },
    AppProcess { pid: i32 },
}

impl ActiveViolationKey {
    fn from_blocked_observation(
        observation: &ObservedActivity,
        violation: &BlockingViolation,
    ) -> Self {
        if matches!(violation.blocked_target, BlockedTarget::Device { .. }) {
            return Self::Device;
        }

        return Self::from_observation(observation).unwrap_or(Self::AppProcess {
            pid: observation.pid,
        });
    }

    fn from_observation(observation: &ObservedActivity) -> Option<Self> {
        if let Some(window_id) = observation.window_id {
            return Some(Self::Window {
                pid: observation.pid,
                window_id,
            });
        }

        if observation.pid > 0 {
            return Some(Self::AppProcess {
                pid: observation.pid,
            });
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
            (Self::Window { .. }, None) => false,
            (Self::AppProcess { pid: active_pid }, _) => *active_pid == pid,
        };
    }

    fn is_owned_by_process(&self, pid: i32) -> bool {
        return match self {
            Self::Device => false,
            Self::Window {
                pid: active_pid, ..
            }
            | Self::AppProcess { pid: active_pid } => *active_pid == pid,
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
    {
        let runtime_state = app.state::<BlockingRuntimeState>();
        let mut runtime = runtime_state.lock().unwrap();
        runtime.policy_generation = runtime.policy_generation.wrapping_add(1);
        runtime.clear_violations_for_bundle_id(app, bundle_id);
    }
    // Note: Global invalidation can discard another window's pending decision, so replay unchanged observations
    if let Err(error) = mado::WindowMonitor::refresh() {
        log::warn!(target: LOG_TARGET, "failed to refresh blocking after app quit: {}", error);
    }
}

pub fn clear_violations_for_session_id(app: &AppHandle, session_id: i64) {
    let runtime_state = app.state::<BlockingRuntimeState>();
    let mut runtime = runtime_state.lock().unwrap();
    runtime.policy_generation = runtime.policy_generation.wrapping_add(1);
    runtime.clear_violations_for_session_id(app, session_id);
}

const LOG_TARGET: &str = "modules::blocking::runtime";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn overlay_pause_expires_at_its_scheduled_wall_time() {
        let mut active = ActiveViolation {
            key: ActiveViolationKey::Window {
                pid: 42,
                window_id: 7,
            },
            observation: ObservedActivity::from_app_info(mado::AppInfo {
                pid: 42,
                name: None,
                bundle_id: None,
                process_path: None,
                icon: None,
            }),
            violation: BlockingViolation {
                intention_id: 1,
                intention_name: "Focus".into(),
                session_id: 1,
                session_started_at: 0,
                session_automatic_end_at: None,
                triggering_process_id: 42,
                blocked_target: BlockedTarget::App {
                    bundle_id: "com.example.browser".into(),
                    display_name: "Browser".into(),
                    icon: None,
                    color: None,
                },
            },
            paused_until_unix_ms: Some(5_000),
        };
        assert!(active.is_paused(4_999));
        assert!(!active.is_paused(5_000));
        assert!(!active.is_paused(60_000));
        active.paused_until_unix_ms = Some(10_000);
        assert!(active.is_paused(5_000));
        active.paused_until_unix_ms = None;
        assert!(!active.is_paused(5_000));
    }

    #[test]
    fn window_destruction_does_not_clear_sibling_or_device_violations() {
        let window = ActiveViolationKey::Window {
            pid: 42,
            window_id: 7,
        };
        assert!(window.matches_window_or_process(42, Some(7)));
        assert!(!window.matches_window_or_process(42, Some(8)));
        assert!(!window.matches_window_or_process(43, Some(7)));
        assert!(!window.matches_window_or_process(42, None));
        assert!(!ActiveViolationKey::Device.matches_window_or_process(42, None));

        let process = ActiveViolationKey::AppProcess { pid: 42 };
        assert!(process.matches_window_or_process(42, None));
        assert!(!process.matches_window_or_process(43, None));
        assert!(window.is_owned_by_process(42));
        assert!(!ActiveViolationKey::Device.is_owned_by_process(42));
    }
}
