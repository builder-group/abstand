mod commands;
#[cfg(target_os = "macos")]
mod menu;
mod quit_policy;
#[cfg(target_os = "macos")]
pub mod tray;
pub mod window;

use crate::{
    environment::logger,
    modules::{catalog, db, intentions, scheduler, settings, shortcuts},
};
use specta_typescript::{BigIntExportBehavior, Typescript};
use tauri_specta::{collect_commands, collect_events, Builder as SpectaBuilder};

pub fn run() {
    let specta_builder = SpectaBuilder::<tauri::Wry>::new()
        .commands(collect_commands![
            // App commands
            commands::get_app_info,
            commands::get_system_typography,
            commands::open_data_directory,
            // Settings commands
            settings::commands::get_settings,
            settings::commands::set_settings,
            settings::commands::reset_settings,
            // Intention commands
            intentions::commands::get_intentions,
            intentions::commands::get_intention,
            intentions::commands::get_active_intention_sessions,
            intentions::commands::get_active_intention_session,
            intentions::commands::get_today_intention_overview,
            intentions::commands::assess_intention_edit_policy,
            intentions::commands::create_intention,
            intentions::commands::update_intention,
            intentions::commands::delete_intention,
            intentions::commands::start_intention,
            intentions::commands::complete_intention,
            intentions::commands::stop_intention,
            // Shortcuts commands
            shortcuts::commands::get_shortcut_configs,
            // Catalog commands
            catalog::commands::search_catalog,
        ])
        .events(collect_events![
            // Catalog events
            catalog::types::CatalogAssetLoadedEvent,
            // Settings events
            settings::types::AppSettingsChangedEvent,
            // Intentions events
            intentions::types::IntentionCreatedEvent,
            intentions::types::IntentionUpdatedEvent,
            intentions::types::IntentionDeletedEvent,
            intentions::types::IntentionSessionStartedEvent,
            intentions::types::IntentionSessionCompletedEvent,
            intentions::types::IntentionSessionStoppedEvent,
            // App events
            quit_policy::QuitPreventedEvent,
            // Shortcuts events
            shortcuts::types::ShortcutTriggeredEvent,
        ]);

    // Generate Typescript bindings
    #[cfg(debug_assertions)]
    if let Err(error) = specta_builder.export(
        Typescript::default().bigint(BigIntExportBehavior::Number),
        "../src/environment/specta/bindings.gen.ts",
    ) {
        eprintln!("Skipping TypeScript bindings export: {}", error);
    }

    let builder = tauri::Builder::default()
        .plugin(logger::Logger::build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(specta_builder.invoke_handler());

    #[cfg(target_os = "macos")]
    let builder = builder
        .menu(menu::AppMenu::build)
        .on_menu_event(menu::AppMenu::handle_event);

    let builder = builder.on_window_event(window::AppWindow::handle_event);

    builder
        .setup(move |app| {
            // https://docs.rs/tauri-specta/2.0.0-rc.21/tauri_specta/index.html
            specta_builder.mount_events(app);

            #[cfg(target_os = "macos")]
            tray::AppTray::setup(app)?;

            // Setup modules
            db::setup(app)?;
            scheduler::setup(app);
            catalog::setup(app);
            intentions::setup(app)?;
            settings::setup(app);

            // Show main window on startup
            let _ = window::AppWindow::Main.show(app.handle());

            return Ok(());
        })
        .build(tauri::generate_context!())
        .expect("Error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                quit_policy::handle_exit_requested(app_handle, &api);
            }
        });
}
