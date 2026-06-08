pub struct AppState {
    pub toggle_item: std::sync::Mutex<Option<tauri::menu::MenuItem<tauri::Wry>>>,
}
