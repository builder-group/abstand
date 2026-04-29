mod commands;
pub mod window;

use crate::modules::{catalog, db, intentions, scheduler, settings, shortcuts};
use specta_typescript::{BigIntExportBehavior, Typescript};
use tauri_specta::{collect_commands, collect_events, Builder as SpectaBuilder};

pub fn run() {
    let specta_builder = SpectaBuilder::<tauri::Wry>::new()
        .commands(collect_commands![
            // App commands
            commands::get_app_info,
            commands::open_data_directory,
            // Settings commands
            settings::commands::get_settings,
            settings::commands::set_settings,
            settings::commands::reset_settings,
            // Intention commands
            intentions::commands::get_intentions,
            intentions::commands::get_intention,
            intentions::commands::create_intention,
            // Shortcuts commands
            shortcuts::commands::get_shortcut_configs,
            // Catalog commands
            catalog::commands::search_catalog,
        ])
        .events(collect_events![
            // Settings events
            settings::types::AppSettingsChangedEvent,
            // Intentions events
            intentions::types::IntentionCreatedEvent,
            intentions::types::IntentionUpdatedEvent,
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

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app| {
            // https://docs.rs/tauri-specta/2.0.0-rc.21/tauri_specta/index.html
            specta_builder.mount_events(app);

            // Setup modules
            db::setup(app)?;
            catalog::setup(app);
            settings::setup(app);
            scheduler::setup(app);

            // Show main window on startup
            let _ = window::AppWindow::Main.show(app.handle());

            return Ok(());
        })
        .run(tauri::generate_context!())
        .expect("Error while running tauri application");
}
