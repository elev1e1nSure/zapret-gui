mod app_error;
mod app_state;
mod autostart;
mod commands;
mod constants;
mod engine;
mod sys_utils;
mod tray;

use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use tauri::Manager;

use crate::app_state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cancel_discovery = Arc::new(AtomicBool::new(false));
    let toggle_item_store = std::sync::Mutex::new(None);
    let tray_store = std::sync::Mutex::new(None);

    tauri::Builder::default()
        .manage(AppState {
            cancel_discovery,
            toggle_item: toggle_item_store,
            tray: tray_store,
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
            tray::setup_tray(app.app_handle())?;

            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "windows")]
                let _ = window.set_shadow(false);
                let _ = window.show();
                let _ = window.set_focus();
            }
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
