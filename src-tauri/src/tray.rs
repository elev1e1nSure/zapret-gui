use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};

use crate::app_error::AppError;
use crate::app_state::AppState;
use crate::engine;

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let toggle_item = MenuItem::with_id(app, "toggle", "Turn On", true, None::<&str>)?;
    let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;

    let state = app.state::<AppState>();
    *state.toggle_item.lock().unwrap_or_else(|e| e.into_inner()) = Some(toggle_item.clone());

    let menu = Menu::with_items(app, &[&toggle_item, &show_item, &quit_item])?;

    let tray_icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| tauri::Error::AssetNotFound("Default window icon not found".to_string()))?;

    TrayIconBuilder::with_id("main_tray")
        .icon(tray_icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle" => {
                let _ = app.emit("tray-toggle", ());
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                if let Some(tray) = app.tray_by_id("main_tray") {
                    let _ = tray.set_visible(false);
                }
                engine::stop_zapret();
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

pub fn update_tray_status(
    state: &tauri::State<'_, AppState>,
    is_active: bool,
) -> Result<(), AppError> {
    let guard = state.toggle_item.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(item) = guard.as_ref() {
        item.set_text(if is_active { "Turn Off" } else { "Turn On" })
            .map_err(|e| AppError::Tray(e.to_string()))?;
    }
    Ok(())
}
