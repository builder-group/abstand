use crate::{app::window::AppWindow, environment::configs::app::AppConfig};
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuBuilder, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    App, AppHandle, Manager,
};

pub fn setup(app: &mut App) -> tauri::Result<()> {
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);
    app.manage(TrayState::init(app)?);
    TrayState::set_title(app.handle(), None);
    return Ok(());
}

// MARK: - Tray

struct Tray;

impl Tray {
    fn setup(app: &AppHandle) -> tauri::Result<TrayIcon<tauri::Wry>> {
        let menu = Self::build_menu(app)?;
        let icon = tauri::image::Image::from_bytes(AppConfig::tray_icon_bytes())?;

        return TrayIconBuilder::new()
            .icon(icon)
            .icon_as_template(true)
            .menu(&menu)
            .show_menu_on_left_click(false)
            .tooltip(AppConfig::tray_tooltip())
            .on_menu_event(|app, event| Self::handle_menu_event(app, event.id().as_ref()))
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
            TrayMenuItem::ShowApp.id(),
            TrayMenuItem::ShowApp.label(),
            true,
            None::<&str>,
        )?;
        let quit = MenuItem::with_id(
            app,
            TrayMenuItem::Quit.id(),
            TrayMenuItem::Quit.label(),
            true,
            None::<&str>,
        )?;

        return MenuBuilder::new(app)
            .item(&show_app)
            .separator()
            .item(&quit)
            .build();
    }

    fn handle_menu_event(app: &AppHandle, event_id: &str) {
        let Some(item) = TrayMenuItem::from_id(event_id) else {
            return;
        };

        item.handle(app);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TrayMenuItem {
    ShowApp,
    Quit,
}

impl TrayMenuItem {
    fn id(&self) -> &'static str {
        return match self {
            Self::ShowApp => "show_app",
            Self::Quit => "quit",
        };
    }

    fn label(&self) -> &'static str {
        return match self {
            Self::ShowApp => "Show Abstand",
            Self::Quit => "Quit",
        };
    }

    fn from_id(id: &str) -> Option<Self> {
        return match id {
            "show_app" => Some(Self::ShowApp),
            "quit" => Some(Self::Quit),
            _ => None,
        };
    }

    fn handle(&self, app: &AppHandle) {
        match self {
            Self::ShowApp => {
                let _ = AppWindow::Main.show(app);
            }
            Self::Quit => app.exit(0),
        }
    }
}

// MARK: - State

pub struct TrayState(Mutex<TrayIcon<tauri::Wry>>);

impl TrayState {
    fn init(app: &App) -> tauri::Result<Self> {
        return Ok(Self(Mutex::new(Tray::setup(app.handle())?)));
    }

    pub fn set_title(app: &AppHandle, title: Option<&str>) {
        let Some(state) = app.try_state::<TrayState>() else {
            return;
        };

        let tray = state.0.lock().unwrap();
        let _ = tray.set_title(title.or(Some("")));
    }
}
