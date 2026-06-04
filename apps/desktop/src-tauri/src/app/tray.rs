use crate::{
    app::{quit_policy, window::AppWindow},
    environment::configs::app::AppConfig,
};
use tauri::{
    menu::{Menu, MenuBuilder, MenuEvent, MenuItem},
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
        let menu = Self::build_menu(app)?;
        let icon = tauri::image::Image::from_bytes(AppConfig::tray_icon_bytes())?;

        return TrayIconBuilder::with_id(Self::id())
            .icon(icon)
            .icon_as_template(true)
            .menu(&menu)
            .show_menu_on_left_click(false)
            .tooltip(AppConfig::tray_tooltip())
            .on_menu_event(Self::handle_menu_event)
            .on_tray_icon_event(|tray, event| {
                if let tauri::tray::TrayIconEvent::Click {
                    button: tauri::tray::MouseButton::Left,
                    ..
                } = event
                {
                    let _ = AppWindow::Main.show(tray.app_handle());
                }
            })
            .build(app);
    }

    fn build_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
        let show_app = MenuItem::with_id(
            app,
            AppTrayMenuItem::ShowApp.id(),
            AppTrayMenuItem::ShowApp.label(),
            true,
            None::<&str>,
        )?;
        let quit = MenuItem::with_id(
            app,
            AppTrayMenuItem::Quit.id(),
            AppTrayMenuItem::Quit.label(),
            true,
            None::<&str>,
        )?;
        #[cfg(debug_assertions)]
        let dev_force_quit = MenuItem::with_id(
            app,
            AppTrayMenuItem::DevForceQuit.id(),
            AppTrayMenuItem::DevForceQuit.label(),
            true,
            None::<&str>,
        )?;

        let builder = MenuBuilder::new(app)
            .item(&show_app)
            .separator()
            .item(&quit);

        // Keep the development escape hatch in the tray so it remains visible when
        // Strict Enforcement blocks normal quit or the main window is hidden or broken
        #[cfg(debug_assertions)]
        let builder = builder.item(&dev_force_quit);

        return builder.build();
    }

    fn handle_menu_event(app: &AppHandle, event: MenuEvent) {
        let Some(item) = AppTrayMenuItem::from_id(event.id().as_ref()) else {
            return;
        };

        item.handle(app);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AppTrayMenuItem {
    ShowApp,
    Quit,
    #[cfg(debug_assertions)]
    DevForceQuit,
}

impl AppTrayMenuItem {
    fn id(&self) -> &'static str {
        return match self {
            Self::ShowApp => "tray_show_app",
            Self::Quit => "tray_quit_app",
            #[cfg(debug_assertions)]
            Self::DevForceQuit => "tray_dev_force_quit",
        };
    }

    fn label(&self) -> &'static str {
        return match self {
            Self::ShowApp => "Show Abstand",
            Self::Quit => "Quit",
            #[cfg(debug_assertions)]
            Self::DevForceQuit => "Force Quit (Dev)",
        };
    }

    fn from_id(id: &str) -> Option<Self> {
        return match id {
            "tray_show_app" => Some(Self::ShowApp),
            "tray_quit_app" => Some(Self::Quit),
            #[cfg(debug_assertions)]
            "tray_dev_force_quit" => Some(Self::DevForceQuit),
            _ => None,
        };
    }

    fn handle(&self, app: &AppHandle) {
        match self {
            Self::ShowApp => {
                let _ = AppWindow::Main.show(app);
            }
            Self::Quit => {
                quit_policy::request_quit_blocking(app, quit_policy::QuitRequestSource::Tray);
            }
            #[cfg(debug_assertions)]
            Self::DevForceQuit => {
                std::process::exit(0);
            }
        }
    }
}
