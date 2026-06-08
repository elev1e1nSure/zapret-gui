use tauri::{AppHandle, Emitter, State};


use crate::app_error::{AppError, AppResult};
use crate::app_state::AppState;
use crate::constants::CREATE_NO_WINDOW;
use crate::core_client;
use crate::process_manager;
use crate::{autostart, tray};

#[tauri::command]
pub async fn run_strategy(handle: AppHandle, name: String, is_game_filter: bool) -> AppResult<()> {
    eprintln!("RUN_STRATEGY CALLED");
    eprintln!("run_strategy: strategy={}, game_filter={}", name, is_game_filter);

    // Ensure zapret-core is running
    if let Err(e) = process_manager::ensure_core_running(&handle).await {
        eprintln!("ensure_core_running failed: {}", e);
        return Err(e);
    }
    eprintln!("zapret-core is running");

    // Wait for API to be ready
    if let Err(e) = core_client::wait_ready(5).await {
        eprintln!("wait_ready failed: {}", e);
        return Err(e);
    }
    eprintln!("zapret-core API is ready");

    // Wait for any previous operation (e.g. stop) to finish
    if let Err(e) = core_client::wait_idle(5).await {
        eprintln!("wait_idle failed: {}", e);
        return Err(e);
    }
    eprintln!("zapret-core is idle");

    // Start the best strategy
    if let Err(e) = core_client::start_best().await {
        eprintln!("start_best failed: {}", e);
        return Err(e);
    }
    eprintln!("start_best succeeded");

    Ok(())
}

#[tauri::command]
pub async fn abort_auto_discovery() -> AppResult<()> {
    eprintln!("abort_auto_discovery requested");
    // Stop the current discovery operation in zapret-core
    core_client::stop().await
}

#[tauri::command]
pub async fn run_auto_discovery(
    handle: AppHandle,
    _state: State<'_, AppState>,
    strategies: Vec<String>,
    is_game_filter: bool,
) -> AppResult<String> {
    eprintln!("RUN_AUTO_DISCOVERY CALLED");
    eprintln!("strategies: {:?}, game_filter: {}", strategies, is_game_filter);

    // Ensure zapret-core is running
    if let Err(e) = process_manager::ensure_core_running(&handle).await {
        eprintln!("ensure_core_running failed: {}", e);
        return Err(e);
    }
    eprintln!("zapret-core is running");

    // Wait for API to be ready
    if let Err(e) = core_client::wait_ready(5).await {
        eprintln!("wait_ready failed: {}", e);
        return Err(e);
    }
    eprintln!("zapret-core API is ready");

    eprintln!("Starting discovery via SSE stream...");

    let result = core_client::start_find(|event| {
        match event {
            core_client::SseEvent::Progress { strategy, current, total } => {
                let _ = handle.emit("discovery-strategy", serde_json::json!({
                    "strategy": strategy,
                    "index": current,
                    "total": total
                }));
            }
            core_client::SseEvent::Success { strategy } => {
                let _ = handle.emit("discovery-complete", serde_json::json!({
                    "strategy": strategy
                }));
            }
            core_client::SseEvent::Error { message } => {
                eprintln!("SSE error: {}", message);
            }
        }
    }).await;

    result
}

#[tauri::command]
pub async fn get_status() -> Result<String, String> {
    match core_client::get_status().await {
        Ok(status) => Ok(serde_json::to_string(&status).unwrap_or_default()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn stop_service() -> AppResult<()> {
    tracing::info!("stop_service");

    // Try to get current status
    match core_client::get_status().await {
        Ok(status) => {
            if status.winws_running {
                // Stop the service via API
                core_client::stop().await?;
            }
        }
        Err(_) => {
            // Core not running - treat as success
            tracing::info!("zapret-core not running, nothing to stop");
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn update_tray_status(state: State<'_, AppState>, is_active: bool) -> AppResult<()> {
    tray::update_tray_status(&state, is_active)?;
    Ok(())
}

#[tauri::command]
pub async fn set_tray_visible(handle: AppHandle, visible: bool) -> AppResult<()> {
    if let Some(tray) = handle.tray_by_id("main_tray") {
        tray.set_visible(visible)
            .map_err(|e| AppError::Tray(e.to_string()))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn exit_app(handle: AppHandle) {
    tracing::info!("exit_app requested");
    if let Some(tray) = handle.tray_by_id("main_tray") {
        let _ = tray.set_visible(false);
    }
    let _ = process_manager::stop_core();
    handle.exit(0);
}

#[tauri::command]
pub async fn is_autostart_enabled() -> bool {
    autostart::is_enabled()
}

#[tauri::command]
pub async fn set_autostart(enable: bool) -> AppResult<()> {
    tracing::info!(enable, "set_autostart");
    autostart::set_enabled(enable)
}

#[tauri::command]
pub async fn reset_knowledge(handle: AppHandle) -> AppResult<()> {
    tracing::info!("reset_knowledge requested");

    // Stop winws first so --reset can write files cleanly
    let _ = core_client::stop().await;
    tokio::time::sleep(tokio::time::Duration::from_millis(400)).await;

    let path = process_manager::core_path(&handle)?;
    let output = tokio::process::Command::new(&path)
        .arg("--reset")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .await
        .map_err(|e| AppError::Process(format!("Failed to run --reset: {}", e)))?;

    if !output.status.success() {
        return Err(AppError::Process(format!(
            "--reset failed: {}",
            String::from_utf8_lossy(&output.stderr)
        )));
    }

    Ok(())
}
