use crate::modules::quit_policy::{
    policy::request_quit,
    types::{ProcessQuitSignal, QuitRequestSource},
};
use tauri::AppHandle;
use tokio::signal::unix::{signal, SignalKind};

pub fn setup(app: &AppHandle) {
    let app = app.clone();

    tauri::async_runtime::spawn(async move {
        // SIGTERM: catch graceful process termination such as Activity Monitor Quit
        let mut terminate_signal = match signal(SignalKind::terminate()) {
            Ok(signal) => signal,
            Err(error) => {
                log::error!(target: LOG_TARGET, "failed to register SIGTERM handler: {}", error);
                return;
            }
        };

        // SIGINT: catch terminal-style interrupts, such as kill -INT
        // Note: SIGINT stays unhandled in debug so Ctrl-C can stop the dev process tree cleanly
        let interrupt_signal_result = if cfg!(debug_assertions) {
            Ok(None)
        } else {
            signal(SignalKind::interrupt()).map(Some)
        };
        let mut interrupt_signal = match interrupt_signal_result {
            Ok(signal) => signal,
            Err(error) => {
                log::error!(target: LOG_TARGET, "failed to register SIGINT handler: {}", error);
                return;
            }
        };

        // Note: SIGKILL from Force Quit cannot be caught, so recovery must happen outside this process

        loop {
            let signal = tokio::select! {
                Some(_) = terminate_signal.recv() => ProcessQuitSignal::Terminate,
                Some(_) = async {
                    let signal = interrupt_signal.as_mut()?;
                    return signal.recv().await;
                } => ProcessQuitSignal::Interrupt,
                else => return,
            };

            request_quit(&app, QuitRequestSource::ProcessSignal(signal)).await;
        }
    });
}

const LOG_TARGET: &str = "app::process_signal";
