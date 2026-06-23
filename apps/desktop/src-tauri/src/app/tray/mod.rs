mod menu;
mod snapshot;

use crate::environment::configs::app::AppConfig;
use menu::TrayMenu;
use tauri::{
    menu::Menu,
    tray::{TrayIcon, TrayIconBuilder},
    App, AppHandle,
};

pub struct AppTray;

impl AppTray {
    fn id() -> &'static str {
        return "tray_main";
    }

    pub fn setup(app: &mut App) -> tauri::Result<()> {
        // Note: Accessory mode gives Abstand tray-app behavior without a Dock or Cmd-Tab entry
        app.set_activation_policy(tauri::ActivationPolicy::Accessory);
        Self::build(app.handle())?;
        Self::set_title(app.handle(), None);
        return Ok(());
    }

    pub fn get(app: &AppHandle) -> Option<TrayIcon<tauri::Wry>> {
        return app.tray_by_id(Self::id());
    }

    pub fn set_title(app: &AppHandle, title: Option<&str>) {
        let Some(tray) = Self::get(app) else {
            return;
        };

        let _ = tray.set_title(Some(title.unwrap_or("")));
    }

    fn build(app: &AppHandle) -> tauri::Result<TrayIcon<tauri::Wry>> {
        let menu = tauri::async_runtime::block_on(Self::build_menu(app))?;
        let icon = tauri::image::Image::from_bytes(AppConfig::tray_icon_bytes())?;

        return TrayIconBuilder::with_id(Self::id())
            .icon(icon)
            .icon_as_template(true)
            .menu(&menu)
            .show_menu_on_left_click(true)
            .tooltip(AppConfig::tray_tooltip())
            .on_menu_event(|app, event| TrayMenu::handle_event(app, event.id().as_ref()))
            .build(app);
    }

    async fn build_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
        return TrayMenu::build(app).await;
    }

    pub async fn refresh_menu(app: &AppHandle) -> tauri::Result<()> {
        let Some(tray) = Self::get(app) else {
            return Ok(());
        };

        let menu = Self::build_menu(app).await?;
        tray.set_menu(Some(menu))?;
        return Ok(());
    }
}
