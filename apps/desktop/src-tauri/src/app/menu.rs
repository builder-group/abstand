use crate::{
    app::{quit_policy, window::AppWindow},
    environment::configs::app::AppConfig,
};
use tauri::{
    menu::{Menu, MenuBuilder, MenuEvent, MenuItem, SubmenuBuilder},
    AppHandle,
};

/// Builds the native macOS app menu.
///
/// Note: In accessory mode, this menu may not visibly own the macOS menu bar, but
/// its configured items still provide native accelerators such as Cmd-Q.
pub struct AppMenu;

impl AppMenu {
    pub fn build(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
        let show_app = MenuItem::with_id(
            app,
            AppMenuItem::ShowApp.id(),
            AppMenuItem::ShowApp.label(),
            true,
            None::<&str>,
        )?;
        let quit = MenuItem::with_id(
            app,
            AppMenuItem::Quit.id(),
            AppMenuItem::Quit.label(),
            true,
            Some("CmdOrCtrl+Q"),
        )?;

        let app_menu = SubmenuBuilder::new(app, AppConfig::app_name())
            .about(None)
            .separator()
            .item(&show_app)
            .separator()
            .services()
            .separator()
            .hide()
            .hide_others()
            .separator()
            .item(&quit)
            .build()?;
        let edit_menu = SubmenuBuilder::new(app, "Edit")
            .undo()
            .redo()
            .separator()
            .cut()
            .copy()
            .paste()
            .select_all()
            .build()?;

        return MenuBuilder::new(app)
            .item(&app_menu)
            .item(&edit_menu)
            .build();
    }

    pub fn handle_event(app: &AppHandle, event: MenuEvent) {
        let Some(item) = AppMenuItem::from_id(event.id().as_ref()) else {
            return;
        };

        item.handle(app);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AppMenuItem {
    ShowApp,
    Quit,
}

impl AppMenuItem {
    fn id(&self) -> &'static str {
        return match self {
            Self::ShowApp => "app_show",
            Self::Quit => "app_quit",
        };
    }

    fn label(&self) -> &'static str {
        return match self {
            Self::ShowApp => "Show Abstand",
            Self::Quit => "Quit Abstand",
        };
    }

    fn from_id(id: &str) -> Option<Self> {
        return match id {
            "app_show" => Some(Self::ShowApp),
            "app_quit" => Some(Self::Quit),
            _ => None,
        };
    }

    fn handle(&self, app: &AppHandle) {
        match self {
            Self::ShowApp => {
                let _ = AppWindow::Main.show(app);
            }
            Self::Quit => {
                quit_policy::request_quit(app, quit_policy::QuitRequestSource::AppMenu);
            }
        }
    }
}
