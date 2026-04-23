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

const REQUIRED_FILES: &[&str] = &[
    "bin/winws.exe",
    "bin/WinDivert.dll",
    "bin/WinDivert64.sys",
    "bin/cygwin1.dll",
    "general_silent.bat",
    "general (ALT)_silent.bat",
    "general (ALT2)_silent.bat",
    "general (ALT3)_silent.bat",
    "general (ALT4)_silent.bat",
    "general (ALT5)_silent.bat",
    "general (ALT6)_silent.bat",
    "general (ALT7)_silent.bat",
    "general (ALT8)_silent.bat",
    "general (ALT9)_silent.bat",
    "general (ALT10)_silent.bat",
    "general (ALT11)_silent.bat",
    "general (FAKE TLS AUTO)_silent.bat",
    "general (FAKE TLS AUTO ALT)_silent.bat",
    "general (FAKE TLS AUTO ALT2)_silent.bat",
    "general (FAKE TLS AUTO ALT3)_silent.bat",
    "general (SIMPLE FAKE)_silent.bat",
    "general (SIMPLE FAKE ALT)_silent.bat",
    "general (SIMPLE FAKE ALT2)_silent.bat",
];

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
    tray: std::sync::Mutex<Option<tauri::tray::TrayIcon<tauri::Wry>>>,
}

// --- Модуль: Системные утилиты ---
mod sys_utils {
    use super::*;

    pub fn kill_winws() {
        // Используем taskkill с фильтром по имени образа, чтобы минимизировать риск
        let _ = Command::new("taskkill")
            .args(["/F", "/IM", "winws.exe", "/T"])
            .creation_flags(CREATE_NO_WINDOW)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
    }

    pub fn add_to_defender_exclusions(path: &Path) {
        let path_str = path.to_string_lossy();
        
        // Используем Add-MpPreference напрямую. Если Defender отключен или путь уже есть, 
        // ErrorAction SilentlyContinue предотвратит ошибки.
        // Запускаем через spawn(), чтобы не блокировать основной поток выполнения.
        let script = format!("Add-MpPreference -ExclusionPath '{}' -ErrorAction SilentlyContinue", path_str);
        
        let _ = Command::new("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
    }
}

// --- Модуль: Движок Zapret ---
mod engine {
    use super::*;
    use super::sys_utils::kill_winws;

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
        let app_data = handle
            .path()
            .app_local_data_dir()
            .map_err(|e| AppError::Path(format!("Ошибка получения AppData: {}", e)))?;
        
        let engine_dir = app_data.join("engine");

        // Добавляем папку в исключения Defender при каждом запуске
        sys_utils::add_to_defender_exclusions(&engine_dir);

        // Проверяем наличие всех критически важных файлов
        let needs_extraction = !engine_dir.exists() || REQUIRED_FILES.iter().any(|f| !engine_dir.join(f).exists());

        if needs_extraction {
            println!("[ZAPRET DEBUG] (Пере)распаковка движка в {:?}", engine_dir);
            kill_winws();
            
            if !engine_dir.exists() {
                std::fs::create_dir_all(&engine_dir).map_err(AppError::Io)?;
            }

            ENGINE_DIR.extract(&engine_dir).map_err(|e| AppError::Extraction(e.to_string()))?;
        }

        Ok(engine_dir)
    }

    pub fn resolve_strategy_path(handle: &AppHandle, name: &str) -> AppResult<PathBuf> {
        let engine_dir = extract_engine(handle)?;
        let file_name = if name.ends_with(".bat") { name.to_string() } else { format!("{}.bat", name) };
        let strategy_path = engine_dir.join(&file_name);

        if strategy_path.exists() {
            return Ok(strategy_path);
        }

        // Поиск без учета регистра
        if let Ok(entries) = std::fs::read_dir(&engine_dir) {
            let name_lower = file_name.to_lowercase();
            for entry in entries.flatten() {
                if entry.file_name().to_string_lossy().to_lowercase() == name_lower {
                    return Ok(entry.path());
                }
            }
        }

        Err(AppError::Path(format!("Стратегия '{}' не найдена. Пожалуйста, проверьте целостность файлов.", file_name)))
    }

    pub fn execute_strategy(_handle: &AppHandle, path: &Path, is_game_filter: bool) -> AppResult<()> {
        let parent = path.parent().ok_or_else(|| AppError::Path("Некорректная директория движка".into()))?;
        let file_name = path.file_name().ok_or_else(|| AppError::Path("Некорректное имя файла".into()))?;
        
        let mut cmd = Command::new("cmd");
        cmd.args(["/C", &file_name.to_string_lossy()])
            .current_dir(parent)
            .creation_flags(CREATE_NO_WINDOW);

        let filter_val = if is_game_filter { "1024-65535" } else { "12" };
        cmd.env("GameFilter", filter_val)
           .env("GameFilterTCP", filter_val)
           .env("GameFilterUDP", filter_val);

        cmd.spawn().map(|_| ()).map_err(|e| {
            AppError::Process(format!("Ошибка запуска {}: {}", file_name.to_string_lossy(), e))
        })
    }

    pub fn stop_zapret() {
        println!("[ZAPRET DEBUG] Остановка сервиса...");
        kill_winws();
    }
}

// --- Модуль: Автозагрузка (Registry) ---
mod autostart {
    use super::*;

    pub fn set_enabled(enable: bool) -> AppResult<()> {
        let exe_path = std::env::current_exe()
            .map_err(|e| AppError::Process(e.to_string()))?
            .to_string_lossy()
            .to_string();

        if enable {
            // Очищаем старый метод (реестр), если он там был
            let _ = Command::new("reg")
                .args(["delete", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "ZapretGUI", "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();

            // Используем Task Scheduler для обхода UAC и запуска с правами админа
            Command::new("schtasks")
                .args([
                    "/create",
                    "/tn", "ZapretGUI",
                    "/tr", &format!("\"{}\"", exe_path),
                    "/sc", "onlogon",
                    "/rl", "highest",
                    "/f"
                ])
                .creation_flags(CREATE_NO_WINDOW)
                .status()
                .map_err(|e| AppError::Process(e.to_string()))?;
        } else {
            Command::new("schtasks")
                .args(["/delete", "/tn", "ZapretGUI", "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status()
                .map_err(|e| AppError::Process(e.to_string()))?;
        }
        Ok(())
    }

    pub fn is_enabled() -> bool {
        let output = Command::new("schtasks")
            .args(["/query", "/tn", "ZapretGUI"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        if let Ok(out) = output {
            return out.status.success();
        }
        false
    }
}

// --- Tauri команды ---

#[tauri::command]
async fn run_strategy(handle: AppHandle, name: String, is_game_filter: bool) -> AppResult<()> {
    let strategy_path = engine::resolve_strategy_path(&handle, &name)?;
    engine::execute_strategy(&handle, &strategy_path, is_game_filter)
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
    is_game_filter: bool,
) -> AppResult<String> {
    state.cancel_discovery.store(false, Ordering::SeqCst);

    for strategy in strategies {
        if state.cancel_discovery.load(Ordering::SeqCst) {
            return Err(AppError::DiscoveryAborted);
        }

        let _ = stop_service().await;
        let strategy_path = engine::resolve_strategy_path(&handle, &strategy)?;

        if engine::execute_strategy(&handle, &strategy_path, is_game_filter).is_err() {
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
            println!("[ZAPRET DEBUG] Найдена подходящая стратегия: {}", strategy);
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

    let tray_icon = app.default_window_icon().cloned()
        .ok_or_else(|| tauri::Error::AssetNotFound("Default window icon not found".to_string()))?;

    let tray = TrayIconBuilder::with_id("main_tray")
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

    // Сохраняем объект трея, чтобы он не удалялся при выходе из области видимости
    *state.tray.lock().unwrap() = Some(tray);

    Ok(())
}

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
