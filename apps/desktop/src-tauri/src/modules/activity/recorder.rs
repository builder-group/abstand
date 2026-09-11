use super::foreground::ForegroundActivityCaptureLevel;
use super::heartbeat::ForegroundActivityHeartbeat;
use super::repository::{
    ForegroundActivityRepository, ForegroundActivityRepositoryError, RecordForegroundActivityInput,
};
use super::types::{ForegroundActivityRecorderMessage, ForegroundActivityRecorderState};
use crate::{
    common::url::extract_hostname,
    modules::{
        catalog::{
            app_identity::{resolve_app_identity, ResolvedAppIdentity},
            repository::{
                CatalogRepository, CatalogRepositoryError, UpsertAppInput, UpsertWebsiteInput,
            },
        },
        db::types::DatabaseState,
        settings::types::{ActivityForegroundSettings, AppSettingsState},
    },
};
use mado::{AppInfo, BrowserInfo, WindowEvent, WindowInfo};
use std::fmt;
use tauri::{App, AppHandle, Manager};
use tokio::sync::{mpsc, oneshot};

pub struct ForegroundActivityRecorder {
    app: AppHandle,
    receiver: mpsc::UnboundedReceiver<ForegroundActivityRecorderMessage>,
}

impl ForegroundActivityRecorder {
    pub fn setup(app: &App) {
        let (sender, receiver) = mpsc::unbounded_channel();
        app.manage(ForegroundActivityRecorderState::new(sender));

        let recorder = Self {
            app: app.handle().clone(),
            receiver,
        };

        tauri::async_runtime::spawn(async move {
            recorder.run().await;
        });
    }

    pub fn enqueue_window_event(app: &AppHandle, event: WindowEvent, occurred_at: i64) {
        if should_skip_activity_recording(&event) {
            return;
        }

        let Some(recorder_state) = app.try_state::<ForegroundActivityRecorderState>() else {
            log::warn!(target: LOG_TARGET, "foreground activity recorder state unavailable");
            return;
        };

        if recorder_state
            .enqueue(ForegroundActivityRecorderMessage::Window { event, occurred_at })
            .is_err()
        {
            log::warn!(target: LOG_TARGET, "foreground activity recorder unavailable");
        }
    }

    pub async fn close_active(
        app: &AppHandle,
        ended_at: i64,
    ) -> Result<(), ForegroundActivityRecorderError> {
        let recorder_state = app
            .try_state::<ForegroundActivityRecorderState>()
            .ok_or(ForegroundActivityRecorderError::Unavailable)?;
        let (reply, completed) = oneshot::channel();
        // Note: Close after pending writes so disabling recording cannot reopen the interval
        recorder_state
            .enqueue(ForegroundActivityRecorderMessage::Close { ended_at, reply })
            .map_err(|_| ForegroundActivityRecorderError::Unavailable)?;
        return completed
            .await
            .map_err(|_| ForegroundActivityRecorderError::Unavailable)?;
    }

    async fn close_interval(&self, ended_at: i64) -> Result<(), ForegroundActivityRecorderError> {
        let database_state = self.app.state::<DatabaseState>();
        ForegroundActivityRepository::close_active(&database_state.pool, ended_at).await?;
        return Ok(());
    }

    async fn run(mut self) {
        let stale_activity_ended_at =
            ForegroundActivityHeartbeat::stale_activity_ended_at(&self.app).await;
        if let Err(error) = self.close_interval(stale_activity_ended_at).await {
            log::warn!(target: LOG_TARGET, "failed to close stale foreground activity: {}", error);
        }

        let mut heartbeat = ForegroundActivityHeartbeat::interval();

        loop {
            tokio::select! {
                event = self.receiver.recv() => {
                    let Some(event) = event else {
                        return;
                    };

                    ForegroundActivityHeartbeat::record(&self.app).await;

                    match event {
                        ForegroundActivityRecorderMessage::Window { event, occurred_at } => {
                            if let Err(error) = self.record_window_event(event, occurred_at).await {
                                log::warn!(target: LOG_TARGET, "failed to record foreground activity: {}", error);
                            }
                        }
                        ForegroundActivityRecorderMessage::Close { ended_at, reply } => {
                            let _ = reply.send(self.close_interval(ended_at).await);
                        }
                    }
                }
                _ = heartbeat.tick() => {
                    ForegroundActivityHeartbeat::record(&self.app).await;
                }
            }
        }
    }

    async fn record_window_event(
        &self,
        event: WindowEvent,
        occurred_at: i64,
    ) -> Result<(), ForegroundActivityRecorderError> {
        if should_skip_activity_recording(&event) {
            return Ok(());
        }

        let settings = {
            let settings_state = self.app.state::<AppSettingsState>();
            let activity_settings = settings_state.lock().unwrap().activity.clone().normalized();
            activity_settings
        };
        if !settings.records_foreground_activity() {
            return Ok(());
        }

        let next_activity =
            build_activity_input(&self.app, &event, settings.foreground, occurred_at).await?;
        let Some(next_activity) = next_activity else {
            self.close_interval(occurred_at).await?;
            return Ok(());
        };

        let database_state = self.app.state::<DatabaseState>();
        ForegroundActivityRepository::record(&database_state.pool, next_activity).await?;
        return Ok(());
    }
}

async fn build_activity_input(
    app: &AppHandle,
    event: &WindowEvent,
    foreground_settings: ActivityForegroundSettings,
    started_at: i64,
) -> Result<Option<RecordForegroundActivityInput>, ForegroundActivityRecorderError> {
    return match event {
        WindowEvent::AppActivated { app: app_info } => {
            let Some(app_id) = ensure_app(app, app_info).await? else {
                return Ok(None);
            };

            Ok(Some(build_app_activity_input(app_id, started_at)))
        }
        WindowEvent::AppTerminated { .. } => Ok(None),
        WindowEvent::WindowChanged { window } => {
            let Some(app_id) = ensure_app(app, &window.app).await? else {
                return Ok(None);
            };

            Ok(Some(
                build_window_activity_input(app, app_id, window, foreground_settings, started_at)
                    .await?,
            ))
        }
        WindowEvent::WindowBoundsChanged { .. } | WindowEvent::WindowUpdated { .. } => Ok(None),
        WindowEvent::WindowMinimized { .. } | WindowEvent::WindowDestroyed { .. } => Ok(None),
        WindowEvent::WindowRestored { .. } => Ok(None),
    };
}

fn should_skip_activity_recording(event: &WindowEvent) -> bool {
    // Note: Lifecycle events also describe background windows and must not end foreground activity
    return !matches!(
        event,
        WindowEvent::AppActivated { .. } | WindowEvent::WindowChanged { .. }
    );
}

fn build_app_activity_input(app_id: i64, started_at: i64) -> RecordForegroundActivityInput {
    return RecordForegroundActivityInput {
        app_id,
        website_id: None,
        capture_level: ForegroundActivityCaptureLevel::App,
        window_title: None,
        window_id: None,
        window_x: None,
        window_y: None,
        window_width: None,
        window_height: None,
        browser_url: None,
        browser_is_private: None,
        started_at,
    };
}

async fn build_window_activity_input(
    app: &AppHandle,
    app_id: i64,
    window: &WindowInfo,
    foreground_settings: ActivityForegroundSettings,
    started_at: i64,
) -> Result<RecordForegroundActivityInput, ForegroundActivityRecorderError> {
    if !foreground_settings.track_windows {
        return Ok(build_app_activity_input(app_id, started_at));
    }

    let is_private_browser = window
        .browser
        .as_ref()
        .is_some_and(|browser| browser.is_private == Some(true));
    if is_private_browser && !foreground_settings.track_private_browser {
        return Ok(build_app_activity_input(app_id, started_at));
    }

    let bounds = window.bounds.as_ref();
    let has_captured_window_data =
        window.title.is_some() || window.window_id.is_some() || bounds.is_some();
    let captured_browser_details = match window.browser.as_ref() {
        Some(browser) if foreground_settings.track_browser => {
            build_browser_activity_details(app, browser).await?
        }
        _ => BrowserActivityDetails::default(),
    };
    if !has_captured_window_data && !captured_browser_details.has_captured_data() {
        return Ok(build_app_activity_input(app_id, started_at));
    }

    let capture_level = if captured_browser_details.has_captured_data() {
        ForegroundActivityCaptureLevel::Browser
    } else {
        ForegroundActivityCaptureLevel::Window
    };

    return Ok(RecordForegroundActivityInput {
        app_id,
        website_id: captured_browser_details.website_id,
        capture_level,
        window_title: window.title.clone(),
        window_id: window.window_id.map(i64::from),
        window_x: bounds.map(|bounds| bounds.x),
        window_y: bounds.map(|bounds| bounds.y),
        window_width: bounds.map(|bounds| bounds.width),
        window_height: bounds.map(|bounds| bounds.height),
        browser_url: captured_browser_details.url,
        browser_is_private: captured_browser_details.is_private,
        started_at,
    });
}

async fn build_browser_activity_details(
    app: &AppHandle,
    browser: &BrowserInfo,
) -> Result<BrowserActivityDetails, ForegroundActivityRecorderError> {
    return Ok(BrowserActivityDetails {
        website_id: ensure_browser_website(app, browser).await?,
        url: browser.url.clone(),
        is_private: browser.is_private,
    });
}

#[derive(Debug, Default)]
struct BrowserActivityDetails {
    website_id: Option<i64>,
    url: Option<String>,
    is_private: Option<bool>,
}

impl BrowserActivityDetails {
    fn has_captured_data(&self) -> bool {
        return self.website_id.is_some() || self.url.is_some() || self.is_private.is_some();
    }
}

async fn ensure_app(
    app: &AppHandle,
    app_info: &AppInfo,
) -> Result<Option<i64>, ForegroundActivityRecorderError> {
    let Some(identity) = resolve_mado_app_identity(app_info) else {
        log::warn!(
            target: LOG_TARGET,
            "cannot record foreground activity without app bundle id or process path: pid={}",
            app_info.pid
        );
        return Ok(None);
    };

    let database_state = app.state::<DatabaseState>();
    let id = CatalogRepository::upsert_app(
        &database_state.pool,
        UpsertAppInput {
            stable_id: identity.stable_id,
            name: app_info.name.clone(),
            bundle_id: identity.bundle_id,
            process_path: app_info.process_path.clone(),
            icon: app_info
                .icon
                .as_ref()
                .and_then(|icon| icon.data_url.clone()),
            color: app_info.icon.as_ref().and_then(|icon| icon.color.clone()),
        },
    )
    .await?;

    return Ok(Some(id));
}

fn resolve_mado_app_identity(app_info: &AppInfo) -> Option<ResolvedAppIdentity> {
    let bundle_id = app_info
        .bundle_id
        .as_deref()
        .map(str::trim)
        .filter(|bundle_id| !bundle_id.is_empty());
    let process_path = app_info
        .process_path
        .as_deref()
        .map(str::trim)
        .filter(|path| !path.is_empty());

    if bundle_id.is_none() && process_path.is_none() {
        return None;
    }

    let identity = resolve_app_identity(
        bundle_id.unwrap_or(""),
        app_info.name.as_deref().unwrap_or("App"),
        process_path.unwrap_or(""),
    );
    return Some(identity);
}

async fn ensure_browser_website(
    app: &AppHandle,
    browser: &BrowserInfo,
) -> Result<Option<i64>, ForegroundActivityRecorderError> {
    let website_info = browser.website.as_ref();
    let hostname = website_info
        .and_then(|website| extract_hostname(&website.hostname))
        .or_else(|| browser.url.as_deref().and_then(extract_hostname));
    let Some(hostname) = hostname else {
        return Ok(None);
    };

    let database_state = app.state::<DatabaseState>();
    let id = CatalogRepository::upsert_website(
        &database_state.pool,
        UpsertWebsiteInput {
            hostname,
            name: None,
            icon: website_info.and_then(|website| website.favicon.clone()),
            color: website_info.and_then(|website| website.color.clone()),
        },
    )
    .await?;

    return Ok(Some(id));
}

#[derive(Debug)]
pub enum ForegroundActivityRecorderError {
    Unavailable,
    Catalog(CatalogRepositoryError),
    Repository(ForegroundActivityRepositoryError),
}

impl fmt::Display for ForegroundActivityRecorderError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::Unavailable => write!(f, "Foreground activity recorder unavailable"),
            Self::Catalog(error) => write!(f, "{}", error),
            Self::Repository(error) => write!(f, "{}", error),
        };
    }
}

impl From<CatalogRepositoryError> for ForegroundActivityRecorderError {
    fn from(value: CatalogRepositoryError) -> Self {
        return Self::Catalog(value);
    }
}

impl From<ForegroundActivityRepositoryError> for ForegroundActivityRecorderError {
    fn from(value: ForegroundActivityRepositoryError) -> Self {
        return Self::Repository(value);
    }
}

const LOG_TARGET: &str = "modules::activity::recorder";

#[cfg(test)]
mod tests {
    use super::*;
    use mado::{WindowBoundsChange, WindowLifecycleChange};

    #[test]
    fn only_foreground_events_change_recorded_activity() {
        let app = AppInfo {
            pid: 42,
            name: None,
            bundle_id: None,
            process_path: None,
            icon: None,
        };
        let window = WindowInfo {
            app: app.clone(),
            window_id: Some(7),
            title: None,
            bounds: None,
            browser: None,
        };
        let lifecycle = WindowLifecycleChange {
            app: app.clone(),
            window_id: Some(7),
        };
        for event in [
            WindowEvent::AppActivated { app: app.clone() },
            WindowEvent::WindowChanged {
                window: window.clone(),
            },
        ] {
            assert!(!should_skip_activity_recording(&event), "{event:?}");
        }
        for event in [
            WindowEvent::AppTerminated { app: app.clone() },
            WindowEvent::WindowUpdated { window },
            WindowEvent::WindowBoundsChanged {
                window: WindowBoundsChange {
                    app,
                    window_id: Some(7),
                    bounds: None,
                },
            },
            WindowEvent::WindowMinimized {
                window: lifecycle.clone(),
            },
            WindowEvent::WindowRestored {
                window: lifecycle.clone(),
            },
            WindowEvent::WindowDestroyed { window: lifecycle },
        ] {
            assert!(should_skip_activity_recording(&event), "{event:?}");
        }
    }
}
