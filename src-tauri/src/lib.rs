mod app_error;
mod app_state;
mod autostart;
mod commands;
mod constants;
mod engine;
mod sys_utils;
mod tray;

use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use tauri::Manager;

use crate::app_state::AppState;

/// Initialises structured JSON logging to a daily-rotating log file.
///
/// The `WorkerGuard` is intentionally leaked so it outlives the entire
/// process and ensures buffered messages are flushed on clean exit.
fn init_logging(log_dir: PathBuf) {
    use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

    let file_appender = tracing_appender::rolling::daily(&log_dir, "zapret-gui.log");
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(filter)
        .with(
            fmt::layer()
                .json()
                .with_writer(non_blocking)
                .with_target(false)
                .with_current_span(false),
        )
        .init();

    // Keep the guard alive for the program's lifetime.
    Box::leak(Box::new(guard));

    tracing::info!(
        version = env!("CARGO_PKG_VERSION"),
        log_dir = %log_dir.display(),
        "Logging initialised"
    );
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cancel_discovery = Arc::new(AtomicBool::new(false));
    let toggle_item_store = std::sync::Mutex::new(None);

    tauri::Builder::default()
        .manage(AppState {
            cancel_discovery,
            toggle_item: toggle_item_store,
        })
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::run_strategy,
            commands::stop_service,
            commands::run_auto_discovery,
            commands::abort_auto_discovery,
            commands::update_tray_status,
            commands::is_autostart_enabled,
            commands::set_autostart,
            commands::set_tray_visible,
            commands::exit_app
        ])
        .setup(|app| {
            // Resolve log directory before anything else so all subsequent
            // operations can emit structured log events.
            let log_dir = app
                .path()
                .app_log_dir()
                .unwrap_or_else(|_| std::env::temp_dir());
            init_logging(log_dir);

            tracing::info!("Tauri setup starting");

            tray::setup_tray(app.app_handle())?;

            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "windows")]
                let _ = window.set_shadow(false);
                let _ = window.show();
                let _ = window.set_focus();
            }

            tracing::info!("Tauri setup complete");
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
