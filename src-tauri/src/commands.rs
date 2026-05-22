use std::sync::atomic::Ordering;

use tauri::{AppHandle, State};

use crate::app_error::{AppError, AppResult};
use crate::app_state::AppState;
use crate::core_client;
use crate::process_manager;
use crate::{autostart, tray};

#[tauri::command]
pub async fn run_strategy(handle: AppHandle, name: String, is_game_filter: bool) -> AppResult<()> {
    tracing::info!(strategy = %name, game_filter = is_game_filter, "run_strategy");

    // Ensure zapret-core is running
    if let Err(e) = process_manager::ensure_core_running(&handle).await {
        tracing::error!(error = %e, "ensure_core_running failed");
        return Err(e);
    }
    tracing::info!("zapret-core is running");

    // Wait for API to be ready
    if let Err(e) = core_client::wait_ready(5).await {
        tracing::error!(error = %e, "wait_ready failed");
        return Err(e);
    }
    tracing::info!("zapret-core API is ready");

    // Start the best strategy
    if let Err(e) = core_client::start_best().await {
        tracing::error!(error = %e, "start_best failed");
        return Err(e);
    }
    tracing::info!("start_best succeeded");

    Ok(())
}

#[tauri::command]
pub async fn abort_auto_discovery(state: State<'_, AppState>) -> AppResult<()> {
    // Raising the flag is enough: the discovery loop picks it up on the next
    // poll tick and stops the service itself. This avoids a redundant taskkill
    // racing with the in-flight strategy spawn.
    tracing::info!("abort_auto_discovery requested");
    state.cancel_discovery.store(true, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn run_auto_discovery(
    _handle: AppHandle,
    _state: State<'_, AppState>,
    strategies: Vec<String>,
    is_game_filter: bool,
) -> AppResult<String> {
    tracing::info!(
        count = strategies.len(),
        game_filter = is_game_filter,
        "run_auto_discovery started"
    );
    // TODO: Implement using zapret-core API
    Err(AppError::Process("Not implemented yet".to_string()))
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
    // TODO: Implement using process_manager
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
