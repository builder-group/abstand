mod commands;
#[cfg(target_os = "macos")]
mod menu;
#[cfg(target_os = "macos")]
mod process_signal;
#[cfg(target_os = "macos")]
pub mod tray;
pub mod window;

use crate::{
    cli,
    environment::logger,
    modules::{
        activity, blocking, catalog, db, intentions, launch_at_login, permissions, quit_policy,
        recovery_agent, scheduler, settings, shortcuts, updater,
    },
};
#[cfg(debug_assertions)]
use specta_typescript::Typescript;
use tauri_specta::{collect_commands, collect_events, Builder as SpectaBuilder};

pub fn run() {
    let specta_builder = SpectaBuilder::<tauri::Wry>::new()
        .commands(collect_commands![
            // App commands
            commands::get_app_info,
            commands::get_system_typography,
            commands::notify_frontend_ready,
            commands::restart_app,
            commands::show_intention_in_main_window,
            commands::open_data_directory,
            commands::reveal_log_file,
            // CLI commands
            cli::commands::get_cli_status,
            cli::commands::install_cli,
            cli::commands::uninstall_cli,
            // Quit policy commands
            quit_policy::commands::confirm_balanced_quit,
            // Recovery agent commands
            recovery_agent::commands::get_recovery_agent_status,
            recovery_agent::commands::install_recovery_agent,
            recovery_agent::commands::uninstall_recovery_agent,
            recovery_agent::commands::reveal_recovery_agent_plist,
            // Launch at login commands
            launch_at_login::commands::get_launch_at_login_status,
            launch_at_login::commands::enable_launch_at_login,
            launch_at_login::commands::disable_launch_at_login,
            launch_at_login::commands::reveal_launch_at_login_plist,
            // Permission commands
            permissions::commands::is_accessibility_permission_granted,
            permissions::commands::open_accessibility_permission_settings,
            // Settings commands
            settings::commands::get_settings,
            settings::commands::set_settings,
            settings::commands::reset_settings,
            // Blocking commands
            blocking::commands::get_blocking_violation,
            blocking::commands::pause_blocking_overlay,
            blocking::commands::quit_blocked_app_by_bundle_id,
            // Intention commands
            intentions::commands::get_intentions,
            intentions::commands::get_intention,
            intentions::commands::get_active_intention_sessions,
            intentions::commands::get_active_intention_session,
            intentions::commands::get_today_intention_overview,
            intentions::commands::assess_intention_edit_policy,
            intentions::commands::create_intention,
            intentions::commands::update_intention,
            intentions::commands::pause_intention,
            intentions::commands::resume_intention,
            intentions::commands::delete_intention,
            intentions::commands::start_intention,
            intentions::commands::complete_intention,
            intentions::commands::stop_intention,
            // Shortcuts commands
            shortcuts::commands::get_shortcut_configs,
            // Updater commands
            updater::commands::check_for_update,
            updater::commands::install_update,
            // Catalog commands
            catalog::commands::search_catalog,
        ])
        .events(collect_events![
            // Catalog events
            catalog::types::CatalogAssetLoadedEvent,
            // Settings events
            settings::types::AppSettingsChangedEvent,
            // Blocking events
            blocking::types::BlockedAppQuitTimedOutEvent,
            blocking::types::BlockingViolationChangedEvent,
            // Intentions events
            intentions::types::IntentionCreatedEvent,
            intentions::types::IntentionUpdatedEvent,
            intentions::types::IntentionDeletedEvent,
            intentions::types::IntentionSessionStartedEvent,
            intentions::types::IntentionSessionCompletedEvent,
            intentions::types::IntentionSessionStoppedEvent,
            // App events
            quit_policy::types::QuitPreventedEvent,
            // Shortcuts events
            shortcuts::types::ShortcutTriggeredEvent,
        ])
        // Note: Current large integer exports are mainly app-local IDs and millisecond timestamps expected to stay within JS safe-integer range
        .dangerously_cast_bigints_to_number();

    // Generate Typescript bindings
    #[cfg(debug_assertions)]
    if let Err(error) = specta_builder.export(
        Typescript::default(),
        "../src/environment/specta/bindings.gen.ts",
    ) {
        eprintln!("Skipping TypeScript bindings export: {}", error);
    }

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if args
                .iter()
                .any(|arg| arg == launch_at_login::cli::LAUNCHED_AT_LOGIN_ARG)
            {
                return;
            }

            let _ = window::AppWindow::Main.show(app);
        }))
        .plugin(logger::Logger::build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(launch_at_login::plugin())
        .invoke_handler(specta_builder.invoke_handler());

    #[cfg(all(desktop, not(debug_assertions), not(feature = "app-store")))]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    #[cfg(target_os = "macos")]
    let builder = builder
        .menu(menu::AppMenu::build)
        .on_menu_event(menu::AppMenu::handle_event);

    let builder = builder.on_window_event(window::AppWindow::handle_event);

    builder
        .setup(move |app| {
            // https://docs.rs/tauri-specta/2.0.0-rc.21/tauri_specta/index.html
            specta_builder.mount_events(app);

            // Setup modules
            db::setup(app)?;
            #[cfg(target_os = "macos")]
            process_signal::setup(app.handle());
            quit_policy::setup(app);
            scheduler::setup(app);
            catalog::setup(app);
            settings::setup(app);
            blocking::setup(app);
            intentions::setup(app)?;
            activity::setup(app);
            #[cfg(target_os = "macos")]
            tray::AppTray::setup(app)?;

            if !launch_at_login::cli::was_launched_at_login() {
                let _ = window::AppWindow::Main.show(app.handle());
            }

            return Ok(());
        })
        .build(tauri::generate_context!())
        .expect("Error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                quit_policy::policy::handle_exit_requested(app_handle, &api);
            }
        });
}
