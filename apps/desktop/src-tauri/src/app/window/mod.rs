#[cfg(target_os = "macos")]
mod macos;
pub mod overlay_window;

use self::overlay_window::types::OverlayWindow;
use crate::environment::configs::app::AppConfig;
#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
use tauri::{
    App, AppHandle, CloseRequestApi, LogicalPosition, Manager, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, Window, WindowEvent,
};

pub fn setup(app: &mut App) {
    overlay_window::setup(app);
}

// MARK: - App Window

/// Native windows owned by the app.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppWindow {
    Main,
    Overlay(OverlayWindow),
}

impl AppWindow {
    fn label(&self) -> String {
        return match self {
            Self::Main => "main".to_string(),
            Self::Overlay(window) => window.label(),
        };
    }

    fn title(&self) -> String {
        return match self {
            Self::Main => AppConfig::app_name().to_string(),
            Self::Overlay(_) => format!("{} Overlay", AppConfig::app_name()),
        };
    }

    fn base_route(&self) -> &'static str {
        return match self {
            Self::Main => "/window/main",
            Self::Overlay(_) => "/window/overlay",
        };
    }

    fn default_local_route(&self) -> &'static str {
        return match self {
            Self::Main => "/splash",
            Self::Overlay(_) => "/",
        };
    }

    fn size(&self) -> Option<(f64, f64)> {
        return match self {
            Self::Main => Some((880.0, 700.0)),
            Self::Overlay(_) => None,
        };
    }

    fn min_size(&self) -> Option<(f64, f64)> {
        return match self {
            Self::Main => Some((880.0, 700.0)),
            Self::Overlay(_) => None,
        };
    }

    pub fn get(&self, app: &AppHandle) -> Option<WebviewWindow> {
        return app.get_webview_window(&self.label());
    }

    /// Returns the existing native window or builds it at the default window-local route.
    ///
    /// This preserves the current route when the native window already exists. It does
    /// not show, focus, resize, or reposition the window.
    pub fn get_or_build(&self, app: &AppHandle) -> tauri::Result<WebviewWindow> {
        return if let Some(window) = self.get(app) {
            Ok(window)
        } else {
            self.build(app, &self.resolve_full_route(self.default_local_route()))
        };
    }

    /// Returns the native window after routing it to `local_route` under this window's base route.
    ///
    /// This does not show, focus, resize, or reposition the window.
    pub fn get_or_build_at(
        &self,
        app: &AppHandle,
        local_route: &str,
    ) -> tauri::Result<WebviewWindow> {
        let full_route = self.resolve_full_route(local_route);

        return if let Some(window) = self.get(app) {
            self.navigate_to_route(&window, &full_route, false)?;
            Ok(window)
        } else {
            self.build(app, &full_route)
        };
    }

    /// Shows the native window at its current route or builds it at the default window-local route.
    ///
    /// This focuses the window and preserves the current route when the native window
    /// already exists.
    pub fn show(&self, app: &AppHandle) -> tauri::Result<WebviewWindow> {
        let window = self.get_or_build(app)?;
        window.show()?;
        window.set_focus()?;
        return Ok(window);
    }

    /// Shows the native window after routing it to `local_route` under this window's base route.
    ///
    /// This focuses the window and navigates existing windows client-side.
    pub fn show_at(&self, app: &AppHandle, local_route: &str) -> tauri::Result<WebviewWindow> {
        let window = self.get_or_build_at(app, local_route)?;
        window.show()?;
        window.set_focus()?;
        return Ok(window);
    }

    pub fn hide(&self, app: &AppHandle) -> tauri::Result<()> {
        let Some(window) = self.get(app) else {
            return Ok(());
        };

        return window.hide();
    }

    /// Handles Tauri window events for app-owned windows.
    pub fn handle_event(window: &Window, event: &WindowEvent) {
        match event {
            WindowEvent::Focused(true) => {
                Self::handle_focus(window);
            }
            WindowEvent::CloseRequested { api, .. } => {
                Self::handle_close(window.label(), window, api);
            }
            _ => {}
        }
    }

    fn handle_focus(window: &Window) {
        match window.label() {
            label if label == Self::Main.label().as_str() => {
                overlay_window::hide_all(window.app_handle());
            }
            label if overlay_window::is_overlay_window_label(label) => {}
            _ => {}
        }
    }

    fn handle_close(label: &str, window: &Window, api: &CloseRequestApi) {
        match label {
            label if label == Self::Main.label().as_str() => {
                api.prevent_close();
                let _ = window.hide();
            }
            label if overlay_window::is_overlay_window_label(label) => {
                api.prevent_close();
            }
            _ => {}
        }
    }

    fn build(&self, app: &AppHandle, full_route: &str) -> tauri::Result<WebviewWindow> {
        match self {
            Self::Main => {
                let mut builder = self
                    .base_builder(app, full_route)
                    .resizable(true)
                    .maximizable(true)
                    .minimizable(true);

                #[cfg(target_os = "macos")]
                {
                    builder = builder
                        .title_bar_style(TitleBarStyle::Overlay)
                        .hidden_title(true)
                        .traffic_light_position(LogicalPosition::new(16.0, 24.0));
                }

                let window = builder.build()?;

                #[cfg(target_os = "macos")]
                macos::apply_liquid_glass(&window, &self.label());

                return Ok(window);
            }
            Self::Overlay(_) => {
                return self
                    .base_builder(app, full_route)
                    .decorations(false)
                    .shadow(false)
                    .resizable(false)
                    .maximizable(false)
                    .minimizable(false)
                    .closable(false)
                    .visible_on_all_workspaces(true)
                    .skip_taskbar(true)
                    .focusable(true)
                    .visible(false)
                    .accept_first_mouse(true)
                    .build();
            }
        }
    }

    fn base_builder<'app>(
        &self,
        app: &'app AppHandle,
        full_route: &str,
    ) -> WebviewWindowBuilder<'app, tauri::Wry, AppHandle> {
        let mut builder =
            WebviewWindowBuilder::new(app, self.label(), WebviewUrl::App(full_route.into()))
                .title(self.title());

        if let Some((width, height)) = self.size() {
            builder = builder.inner_size(width, height);
        }

        if let Some((min_width, min_height)) = self.min_size() {
            builder = builder.min_inner_size(min_width, min_height);
        }

        return builder;
    }

    pub fn resolve_full_route(&self, local_route: &str) -> String {
        if local_route.starts_with("/window/") {
            log::warn!(
                target: LOG_TARGET,
                "expected a window-local route for {}, got full route '{}'",
                self.label(),
                local_route
            );
            return local_route.to_string();
        }

        if local_route.is_empty() || local_route == "/" {
            return self.base_route().to_string();
        }

        return format!(
            "{}/{}",
            self.base_route(),
            local_route.trim_start_matches('/')
        );
    }

    pub fn navigate_to_route(
        &self,
        window: &WebviewWindow,
        full_route: &str,
        replace: bool,
    ) -> tauri::Result<()> {
        return window.eval(&format!(
            "window.__TAURI_ROUTER__?.navigate({{ href: {:?}, replace: {} }});",
            full_route, replace
        ));
    }
}

const LOG_TARGET: &str = "app::window";
