use include_dir::{include_dir, Dir};
use reqwest::Client;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};

static ENGINE_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/engine");

const CREATE_NO_WINDOW: u32 = 0x08000000;

struct AppState {
    cancel_discovery: Arc<AtomicBool>,
}

/// Strips UNC prefix (\\?\) which CMD.exe doesn't support
fn clean_unc_path(path: &Path) -> String {
    let path_str = path.to_string_lossy();
    if let Some(stripped) = path_str.strip_prefix(r"\\?\") {
        stripped.to_string()
    } else {
        path_str.into_owned()
    }
}

/// Checks internet connection through multiple targets
async fn check_connection() -> bool {
    let client = Client::builder()
        .timeout(Duration::from_secs(3))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36")
        .build()
        .unwrap_or_else(|_| Client::new());

    let targets = [
        "https://www.youtube.com/generate_204",
        "https://discord.com/api/v9/gateway",
        "https://rr1---sn-axmc5-n0se.googlevideo.com/generate_204",
    ];

    let mut success_count = 0;

    for url in targets {
        if let Ok(resp) = client.get(url).send().await {
            // 200, 204 are success. 403 often returned by googlevideo but still means SNI works.
            if resp.status().is_success() || resp.status().as_u16() == 403 {
                success_count += 1;
            }
        }
    }

    success_count >= 2
}

#[tauri::command]
async fn run_batch(handle: AppHandle, name: String) -> Result<(), String> {
    let final_path = resolve_engine_path(&handle, &name)?;
    execute_batch(&final_path)
}

fn extract_engine(handle: &AppHandle) -> Result<PathBuf, String> {
    let app_local_data = handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app local data dir: {}", e))?;
    let engine_dir = app_local_data.join("engine");

    if !engine_dir.exists() {
        std::fs::create_dir_all(&engine_dir)
            .map_err(|e| format!("Failed to create engine directory: {}", e))?;
        ENGINE_DIR
            .extract(&engine_dir)
            .map_err(|e| format!("Failed to extract engine: {}", e))?;
    }

    Ok(engine_dir)
}

fn resolve_engine_path(handle: &AppHandle, name: &str) -> Result<PathBuf, String> {
    let engine_dir = extract_engine(handle)?;
    let target_path = engine_dir.join(name);

    if target_path.exists() {
        Ok(target_path)
    } else {
        Err(format!(
            "Файл не найден в извлеченном движке: {}. Путь: {:?}",
            name, target_path
        ))
    }
}

fn execute_batch(path: &Path) -> Result<(), String> {
    let parent_path = path.parent().ok_or("Invalid engine path")?;
    let clean_exec_path = clean_unc_path(path);
    let clean_working_dir = clean_unc_path(parent_path);

    Command::new("cmd")
        .args(["/C", &clean_exec_path])
        .current_dir(clean_working_dir)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Process spawn error: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn abort_auto_discovery(state: State<'_, AppState>) -> Result<(), String> {
    state.cancel_discovery.store(true, Ordering::SeqCst);
    let _ = stop_batch().await;
    Ok(())
}

#[tauri::command]
async fn run_auto_discovery(
    handle: AppHandle,
    state: State<'_, AppState>,
    strategies: Vec<String>,
) -> Result<String, String> {
    state.cancel_discovery.store(false, Ordering::SeqCst);

    for strategy in strategies {
        if state.cancel_discovery.load(Ordering::SeqCst) {
            return Err("Поиск отменен".to_string());
        }

        let _ = stop_batch().await;
        let final_path = resolve_engine_path(&handle, &strategy)?;

        if execute_batch(&final_path).is_err() {
            continue;
        }

        // Wait with cancellation check
        for _ in 0..30 {
            if state.cancel_discovery.load(Ordering::SeqCst) {
                let _ = stop_batch().await;
                return Err("Поиск отменен".to_string());
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }

        if check_connection().await {
            return Ok(strategy);
        }
    }

    Err("Ни одна стратегия не подошла".to_string())
}

#[tauri::command]
async fn stop_batch() -> Result<(), String> {
    Command::new("cmd")
        .args(["/C", "taskkill /F /IM winws.exe /T >nul 2>&1"])
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|e| format!("Taskkill error: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            cancel_discovery: Arc::new(AtomicBool::new(false)),
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            run_batch,
            stop_batch,
            run_auto_discovery,
            abort_auto_discovery
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "windows")]
                let _ = window.set_shadow(false);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
