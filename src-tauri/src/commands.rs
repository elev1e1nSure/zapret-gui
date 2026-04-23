use std::sync::atomic::Ordering;
use std::time::Duration;

use serde_json::json;
use tauri::{AppHandle, Emitter, State};

use crate::app_error::{AppError, AppResult};
use crate::app_state::AppState;
use crate::{autostart, engine, tray};

#[tauri::command]
pub async fn run_strategy(handle: AppHandle, name: String, is_game_filter: bool) -> AppResult<()> {
    tracing::info!(strategy = %name, game_filter = is_game_filter, "run_strategy");
    let engine_dir = engine::extract_engine(&handle)?;
    let strategy_path = engine::resolve_strategy_path_in_dir(&engine_dir, &name)?;
    let result = engine::execute_strategy(&handle, &strategy_path, is_game_filter);
    if let Err(ref e) = result {
        tracing::error!(strategy = %name, error = %e, "run_strategy failed");
    }
    result
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
    handle: AppHandle,
    state: State<'_, AppState>,
    strategies: Vec<String>,
    is_game_filter: bool,
) -> AppResult<String> {
    tracing::info!(count = strategies.len(), game_filter = is_game_filter, "run_auto_discovery started");
    state.cancel_discovery.store(false, Ordering::SeqCst);
    let engine_dir = engine::extract_engine(&handle)?;
    let client = engine::build_connection_client();
    let total = strategies.len();

    for (idx, strategy) in strategies.into_iter().enumerate() {
        if state.cancel_discovery.load(Ordering::SeqCst) {
            tracing::info!("auto_discovery aborted by user");
            return Err(AppError::DiscoveryAborted);
        }

        tracing::info!(strategy = %strategy, step = idx + 1, total, "trying strategy");
        engine::stop_zapret();
        let _ = handle.emit("discovery-strategy", json!({
            "strategy": strategy,
            "index": idx + 1,
            "total": total
        }));
        let strategy_path = engine::resolve_strategy_path_in_dir(&engine_dir, &strategy)?;

        if engine::execute_strategy(&handle, &strategy_path, is_game_filter).is_err() {
            tracing::warn!(strategy = %strategy, "strategy failed to spawn, skipping");
            continue;
        }

        let strategy_timeout = tokio::time::sleep(Duration::from_secs(5));
        tokio::pin!(strategy_timeout);
        let mut poll_interval = tokio::time::interval(Duration::from_millis(500));
        let mut matched = false;

        loop {
            tokio::select! {
                _ = &mut strategy_timeout => { break; }
                _ = poll_interval.tick() => {
                    if state.cancel_discovery.load(Ordering::SeqCst) {
                        engine::stop_zapret();
                        tracing::info!("auto_discovery aborted during polling");
                        return Err(AppError::DiscoveryAborted);
                    }
                    if engine::check_connection_with_client(&client).await {
                        matched = true;
                        break;
                    }
                }
            }
        }

        if matched {
            tracing::info!(strategy = %strategy, "auto_discovery matched strategy");
            return Ok(strategy);
        }
    }

    tracing::warn!("auto_discovery exhausted all strategies");
    Err(AppError::Network(
        "Ни одна стратегия не сработала. Проверьте подключение к интернету или попробуйте ещё раз.".into(),
    ))
}

#[tauri::command]
pub async fn stop_service() -> AppResult<()> {
    tracing::info!("stop_service");
    engine::stop_zapret();
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
    engine::stop_zapret();
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
