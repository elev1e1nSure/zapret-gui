use futures::future::join_all;
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

static ENGINE_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/engine");

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Ошибка пути: {0}")]
    Path(String),
    #[error("Ошибка ввода-вывода: {0}")]
    Io(#[from] std::io::Error),
    #[error("Ошибка извлечения движка: {0}")]
    Extraction(String),
    #[error("Ошибка сети: {0}")]
    Network(String),
    #[error("Ошибка процесса: {0}")]
    Process(String),
    #[error("Поиск отменен")]
    DiscoveryAborted,
    #[error("Ошибка трея: {0}")]
    Tray(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type AppResult<T> = Result<T, AppError>;

struct AppState {
    cancel_discovery: Arc<AtomicBool>,
    toggle_item: std::sync::Mutex<Option<tauri::menu::MenuItem<tauri::Wry>>>,
}

// --- Модуль: Системные утилиты ---
mod sys_utils {
    use super::*;

    pub fn clean_unc_path(path: &Path) -> String {
        let path_str = path.to_string_lossy();
        path_str.strip_prefix(r"\\?\").unwrap_or(&path_str).to_string()
    }

    pub fn kill_winws() {
        // Используем taskkill с фильтром по имени образа, чтобы минимизировать риск
        let _ = Command::new("taskkill")
            .args(["/F", "/IM", "winws.exe", "/T"])
            .creation_flags(CREATE_NO_WINDOW)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
    }
}

// --- Модуль: Движок Zapret ---
mod engine {
    use super::*;
    use super::sys_utils::{clean_unc_path, kill_winws};

    pub async fn check_connection() -> bool {
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
        results.into_iter().filter(|&res| res).count() >= 2
    }

    pub fn extract_engine(handle: &AppHandle) -> AppResult<PathBuf> {
        let engine_dir = handle
            .path()
            .app_local_data_dir()
            .map_err(|e| AppError::Path(e.to_string()))?
            .join("engine");

        let is_empty = !engine_dir.exists() || 
            std::fs::read_dir(&engine_dir).map(|mut d| d.next().is_none()).unwrap_or(true);

        if is_empty {
            println!("[Zapret] Распаковка движка в {:?}", engine_dir);
            std::fs::create_dir_all(&engine_dir)?;
            ENGINE_DIR
                .extract(&engine_dir)
                .map_err(|e| AppError::Extraction(e.to_string()))?;
        }

        Ok(engine_dir)
    }

    pub fn resolve_strategy_path(handle: &AppHandle, name: &str) -> AppResult<PathBuf> {
        let strategy_path = extract_engine(handle)?.join(name);

        if strategy_path.exists() {
            Ok(strategy_path)
        } else {
            Err(AppError::Path(format!("Файл стратегии не найден: {}", name)))
        }
    }

    pub fn execute_strategy(path: &Path) -> AppResult<()> {
        let parent = path.parent().ok_or_else(|| AppError::Path("Некорректный путь".into()))?;
        let clean_path = clean_unc_path(path);
        
        println!("[Zapret] Запуск стратегии: {}", clean_path);
        
        Command::new("cmd")
            .args(["/C", &clean_path])
            .current_dir(clean_unc_path(parent))
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| AppError::Process(e.to_string()))?;

        Ok(())
    }

    pub fn stop_zapret() {
        println!("[Zapret] Остановка сервиса...");
        kill_winws();
    }
}

// --- Модуль: Автозагрузка (Registry) ---
mod autostart {
    use super::*;

    const REG_KEY: &str = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
    const APP_NAME: &str = "ZapretGUI";

    pub fn is_enabled() -> bool {
        let exe_path = std::env::current_exe()
            .map(|p| p.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        
        if exe_path.is_empty() { return false; }
        
        let output = Command::new("reg")
            .args(["query", REG_KEY, "/v", APP_NAME])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        
        if let Ok(out) = output {
            if out.status.success() {
                let s = String::from_utf8_lossy(&out.stdout).to_lowercase();
                return s.replace("\"", "").contains(&exe_path);
            }
        }
        false
    }

    pub fn set_enabled(enable: bool) -> AppResult<()> {
        let exe_path = std::env::current_exe()?
            .to_string_lossy()
            .into_owned();
        
        let mut cmd = Command::new("reg");
        cmd.creation_flags(CREATE_NO_WINDOW);

        if enable {
            println!("[Zapret] Включение автозагрузки...");
            cmd.args(["add", REG_KEY, "/v", APP_NAME, "/t", "REG_SZ", "/d", &format!("\"{}\"", exe_path), "/f"]);
        } else {
            println!("[Zapret] Отключение автозагрузки...");
            cmd.args(["delete", REG_KEY, "/v", APP_NAME, "/f"]);
        }

        let status = cmd.status()?;
        if status.success() {
            Ok(())
        } else {
            let err_msg = format!("Ошибка реестра (exit code: {:?})", status.code());
            println!("[Zapret] Error: {}", err_msg);
            Err(AppError::Process(err_msg))
        }
    }
}

// --- Tauri команды ---

#[tauri::command]
async fn run_strategy(handle: AppHandle, name: String) -> AppResult<()> {
    let strategy_path = engine::resolve_strategy_path(&handle, &name)?;
    engine::execute_strategy(&strategy_path)
}

#[tauri::command]
async fn abort_auto_discovery(state: State<'_, AppState>) -> AppResult<()> {
    state.cancel_discovery.store(true, Ordering::SeqCst);
    stop_service().await
}

#[tauri::command]
async fn run_auto_discovery(
    handle: AppHandle,
    state: State<'_, AppState>,
    strategies: Vec<String>,
) -> AppResult<String> {
    state.cancel_discovery.store(false, Ordering::SeqCst);

    for strategy in strategies {
        if state.cancel_discovery.load(Ordering::SeqCst) {
            return Err(AppError::DiscoveryAborted);
        }

        let _ = stop_service().await;
        let strategy_path = engine::resolve_strategy_path(&handle, &strategy)?;

        if engine::execute_strategy(&strategy_path).is_err() {
            continue;
        }

        let strategy_timeout = tokio::time::sleep(Duration::from_secs(5));
        tokio::pin!(strategy_timeout);
        let mut poll_interval = tokio::time::interval(Duration::from_millis(500));
        let mut matched = false;

        loop {
            tokio::select! {
                _ = &mut strategy_timeout => {
                    break;
                }
                _ = poll_interval.tick() => {
                    if state.cancel_discovery.load(Ordering::SeqCst) {
                        let _ = stop_service().await;
                        return Err(AppError::DiscoveryAborted);
                    }
                    if engine::check_connection().await {
                        matched = true;
                        break;
                    }
                }
            }
        }

        if matched {
            println!("[Zapret] Найдена подходящая стратегия: {}", strategy);
            return Ok(strategy);
        }
    }

    Err(AppError::Network("Ни одна стратегия не подошла".into()))
}

#[tauri::command]
async fn stop_service() -> AppResult<()> {
    engine::stop_zapret();
    Ok(())
}

#[tauri::command]
async fn update_tray_status(state: State<'_, AppState>, is_active: bool) -> AppResult<()> {
    if let Some(item) = state.toggle_item.lock().unwrap().as_ref() {
        item.set_text(if is_active { "Выключить" } else { "Включить" })
            .map_err(|e| AppError::Tray(e.to_string()))?;
    }
    Ok(())
}

#[tauri::command]
async fn set_tray_visible(handle: AppHandle, visible: bool) -> AppResult<()> {
    if let Some(tray) = handle.tray_by_id("main_tray") {
        tray.set_visible(visible).map_err(|e| AppError::Tray(e.to_string()))?;
    }
    Ok(())
}

#[tauri::command]
async fn exit_app(handle: AppHandle) {
    handle.exit(0);
}

#[tauri::command]
async fn is_autostart_enabled() -> bool {
    autostart::is_enabled()
}

#[tauri::command]
async fn set_autostart(enable: bool) -> AppResult<()> {
    autostart::set_enabled(enable)
}

// --- Настройка Трей-меню ---

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let toggle_item = MenuItem::with_id(app, "toggle", "Включить", true, None::<&str>)?;
    let show_item = MenuItem::with_id(app, "show", "Показать", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;
    
    // Сохраняем пункт меню в состояние для обновлений
    let state = app.state::<AppState>();
    *state.toggle_item.lock().unwrap() = Some(toggle_item.clone());

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
            } = event {
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
            set_autostart,
            set_tray_visible,
            exit_app
        ])
        .setup(|app| {
            setup_tray(app.app_handle())?;

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
