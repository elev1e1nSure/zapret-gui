use include_dir::{include_dir, Dir};
use reqwest::Client;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State};
use thiserror::Error;
use futures::future::join_all;

static ENGINE_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/engine");

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Ошибка пути: {0}")]
    PathError(String),
    #[error("Ошибка ввода-вывода: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Ошибка извлечения движка: {0}")]
    ExtractionError(String),
    #[error("Ошибка сети: {0}")]
    NetworkError(String),
    #[error("Ошибка процесса: {0}")]
    ProcessError(String),
    #[error("Поиск отменен")]
    DiscoveryAborted,
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

struct AppState {
    cancel_discovery: Arc<AtomicBool>,
    toggle_item: std::sync::Mutex<Option<tauri::menu::MenuItem<tauri::Wry>>>,
}

// --- Вспомогательные функции для движка ---

fn clean_unc_path(path: &Path) -> String {
    let path_str = path.to_string_lossy();
    if let Some(stripped) = path_str.strip_prefix(r"\\?\") {
        stripped.to_string()
    } else {
        path_str.into_owned()
    }
}

async fn check_connection() -> bool {
    let client = Client::builder()
        .timeout(Duration::from_secs(3))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36")
        .build()
        .unwrap_or_else(|_| Client::new());

    let targets = [
        "https://www.google.com/generate_204",
        "https://www.youtube.com/generate_204",
        "https://discord.com/api/v9/gateway",
    ];

    let tasks = targets.iter().map(|&url| {
        let client = client.clone();
        async move {
            match client.get(url).send().await {
                Ok(resp) => resp.status().is_success() || resp.status().as_u16() == 403,
                Err(_) => false,
            }
        }
    });

    let results = join_all(tasks).await;
    let success_count = results.into_iter().filter(|&res| res).count();

    success_count >= 2
}

fn extract_engine(handle: &AppHandle) -> Result<PathBuf, AppError> {
    let app_local_data = handle
        .path()
        .app_local_data_dir()
        .map_err(|e| AppError::PathError(e.to_string()))?;
    let engine_dir = app_local_data.join("engine");

    // Если папка не существует или пуста, выполняем распаковку
    if !engine_dir.exists() || std::fs::read_dir(&engine_dir)?.next().is_none() {
        std::fs::create_dir_all(&engine_dir)?;
        ENGINE_DIR
            .extract(&engine_dir)
            .map_err(|e| AppError::ExtractionError(e.to_string()))?;
    }

    Ok(engine_dir)
}

fn resolve_strategy_path(handle: &AppHandle, name: &str) -> Result<PathBuf, AppError> {
    let engine_dir = extract_engine(handle)?;
    let target_path = engine_dir.join(name);

    if target_path.exists() {
        Ok(target_path)
    } else {
        Err(AppError::PathError(format!(
            "Файл стратегии не найден: {}",
            name
        )))
    }
}

fn execute_strategy(path: &Path) -> Result<(), AppError> {
    let parent_path = path.parent().ok_or_else(|| AppError::PathError("Некорректный путь".into()))?;
    let clean_exec_path = clean_unc_path(path);
    let clean_working_dir = clean_unc_path(parent_path);

    Command::new("cmd")
        .args(["/C", &clean_exec_path])
        .current_dir(clean_working_dir)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| AppError::ProcessError(e.to_string()))?;

    Ok(())
}

fn kill_winws() {
    let _ = Command::new("cmd")
        .args(["/C", "taskkill /F /IM winws.exe /T >nul 2>&1"])
        .creation_flags(CREATE_NO_WINDOW)
        .status();
}

// --- Tauri команды ---

#[tauri::command]
async fn run_strategy(handle: AppHandle, name: String) -> Result<(), AppError> {
    let strategy_path = resolve_strategy_path(&handle, &name)?;
    execute_strategy(&strategy_path)
}

#[tauri::command]
async fn abort_auto_discovery(state: State<'_, AppState>) -> Result<(), AppError> {
    state.cancel_discovery.store(true, Ordering::SeqCst);
    let _ = stop_service().await;
    Ok(())
}

#[tauri::command]
async fn run_auto_discovery(
    handle: AppHandle,
    state: State<'_, AppState>,
    strategies: Vec<String>,
) -> Result<String, AppError> {
    state.cancel_discovery.store(false, Ordering::SeqCst);

    for strategy in strategies {
        if state.cancel_discovery.load(Ordering::SeqCst) {
            return Err(AppError::DiscoveryAborted);
        }

        let _ = stop_service().await;
        let strategy_path = resolve_strategy_path(&handle, &strategy)?;

        if execute_strategy(&strategy_path).is_err() {
            continue;
        }

        // Ждем запуска прокси (3 секунды с проверкой на отмену)
        for _ in 0..30 {
            if state.cancel_discovery.load(Ordering::SeqCst) {
                let _ = stop_service().await;
                return Err(AppError::DiscoveryAborted);
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }

        if check_connection().await {
            return Ok(strategy);
        }
    }

    Err(AppError::NetworkError("Ни одна стратегия не подошла".into()))
}

#[tauri::command]
async fn stop_service() -> Result<(), AppError> {
    kill_winws();
    Ok(())
}

#[tauri::command]
async fn update_tray_status(state: State<'_, AppState>, is_active: bool) -> Result<(), AppError> {
    if let Some(item) = state.toggle_item.lock().unwrap().as_ref() {
        let _ = item.set_text(if is_active { "Выключить" } else { "Включить" });
    }
    Ok(())
}

#[tauri::command]
async fn is_autostart_enabled() -> bool {
    let exe_path = match std::env::current_exe() {
        Ok(path) => path.to_string_lossy().into_owned(),
        Err(_) => return false,
    };
    
    let output = Command::new("reg")
        .args(["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "ZapretGUI"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    
    if let Ok(out) = output {
        if out.status.success() {
            let s = String::from_utf8_lossy(&out.stdout);
            return s.contains(&exe_path);
        }
    }
    false
}

#[tauri::command]
async fn set_autostart(enable: bool) -> Result<(), String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .into_owned();
    
    if enable {
        Command::new("reg")
            .args(["add", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "ZapretGUI", "/t", "REG_SZ", "/d", &format!("\"{}\"", exe_path), "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|e| e.to_string())?;
    } else {
        Command::new("reg")
            .args(["delete", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "ZapretGUI", "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
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
            run_strategy,
            stop_service,
            run_auto_discovery,
            abort_auto_discovery,
            update_tray_status,
            is_autostart_enabled,
            set_autostart
        ])
        .setup(|app| {
            let toggle_item = MenuItem::with_id(app, "toggle", "Включить", true, None::<&str>)?;
            
            // Сохраняем пункт меню в состояние для обновлений
            let state = app.state::<AppState>();
            *state.toggle_item.lock().unwrap() = Some(toggle_item.clone());

            let show_item = MenuItem::with_id(app, "show", "Показать", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle_item, &show_item, &quit_item])?;

            let _tray = TrayIconBuilder::with_id("main_tray")
                .icon(app.default_window_icon().unwrap().clone())
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
                        kill_winws();
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { 
                        button: MouseButton::Left, 
                        button_state: MouseButtonState::Up, 
                        .. 
                    } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "windows")]
                let _ = window.set_shadow(false);
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
