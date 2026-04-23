use std::sync::atomic::AtomicBool;
use std::sync::Arc;

pub struct AppState {
    pub cancel_discovery: Arc<AtomicBool>,
    pub toggle_item: std::sync::Mutex<Option<tauri::menu::MenuItem<tauri::Wry>>>,
    pub tray: std::sync::Mutex<Option<tauri::tray::TrayIcon<tauri::Wry>>>,
}
