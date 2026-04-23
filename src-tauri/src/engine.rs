use futures::stream::{FuturesUnordered, StreamExt};
use reqwest::Client;
use std::os::windows::process::CommandExt;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::time::Duration;

use tauri::AppHandle;
use tauri::Manager;

use crate::app_error::{AppError, AppResult};
use crate::constants::{CREATE_NO_WINDOW, ENGINE_DIR, REQUIRED_FILES};
use crate::sys_utils;

fn is_simple_file_name(file_name: &str) -> bool {
    let mut components = Path::new(file_name).components();
    matches!(components.next(), Some(Component::Normal(_))) && components.next().is_none()
}

pub fn build_connection_client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(3))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36")
        .build()
        .unwrap_or_else(|_| Client::new())
}

pub async fn check_connection_with_client(client: &Client) -> bool {
    let targets = [
        "https://www.google.com/generate_204",
        "https://www.youtube.com/generate_204",
        "https://discord.com/api/v9/gateway",
    ];

    let mut tasks = FuturesUnordered::new();
    for &url in &targets {
        let c = client.clone();
        tasks.push(async move {
            match c.get(url).send().await {
                Ok(resp) => resp.status().is_success() || resp.status().as_u16() == 403,
                Err(_) => false,
            }
        });
    }

    let mut success_count = 0usize;
    while let Some(ok) = tasks.next().await {
        if ok {
            success_count += 1;
            if success_count >= 2 {
                return true;
            }
        }
    }

    false
}

pub fn extract_engine(handle: &AppHandle) -> AppResult<PathBuf> {
    let app_data = handle
        .path()
        .app_local_data_dir()
        .map_err(|e| AppError::Path(format!("Failed to get AppData: {}", e)))?;

    let engine_dir = app_data.join("engine");

    sys_utils::add_to_defender_exclusions(&engine_dir);

    let needs_extraction =
        !engine_dir.exists() || REQUIRED_FILES.iter().any(|f| !engine_dir.join(f).exists());

    if needs_extraction {
        sys_utils::kill_winws();

        if !engine_dir.exists() {
            std::fs::create_dir_all(&engine_dir).map_err(AppError::Io)?;
        }

        ENGINE_DIR
            .extract(&engine_dir)
            .map_err(|e| AppError::Extraction(e.to_string()))?;
    }

    Ok(engine_dir)
}

pub fn resolve_strategy_path(handle: &AppHandle, name: &str) -> AppResult<PathBuf> {
    let engine_dir = extract_engine(handle)?;
    resolve_strategy_path_in_dir(&engine_dir, name)
}

pub fn resolve_strategy_path_in_dir(engine_dir: &Path, name: &str) -> AppResult<PathBuf> {
    let file_name = if name.ends_with(".bat") {
        name.to_string()
    } else {
        format!("{}.bat", name)
    };

    if !is_simple_file_name(&file_name) {
        return Err(AppError::Path("Invalid strategy name".into()));
    }

    let strategy_path = engine_dir.join(&file_name);
    if strategy_path.exists() {
        return Ok(strategy_path);
    }

    if let Ok(entries) = std::fs::read_dir(engine_dir) {
        let name_lower = file_name.to_lowercase();
        for entry in entries.flatten() {
            if entry.file_name().to_string_lossy().to_lowercase() == name_lower {
                return Ok(entry.path());
            }
        }
    }

    Err(AppError::Path(format!(
        "Strategy '{}' not found. Please check file integrity.",
        file_name
    )))
}

pub fn execute_strategy(_handle: &AppHandle, path: &Path, is_game_filter: bool) -> AppResult<()> {
    let parent = path
        .parent()
        .ok_or_else(|| AppError::Path("Invalid engine directory".into()))?;
    let file_name = path
        .file_name()
        .ok_or_else(|| AppError::Path("Invalid file name".into()))?;

    let mut cmd = Command::new("cmd");
    cmd.args(["/C", &file_name.to_string_lossy()])
        .current_dir(parent)
        .creation_flags(CREATE_NO_WINDOW);

    // When game filter is enabled, keep bypass away from game traffic ports
    // to reduce the chance of added latency in online games.
    let filter_val = if is_game_filter { "12" } else { "1024-65535" };
    cmd.env("GameFilter", filter_val)
        .env("GameFilterTCP", filter_val)
        .env("GameFilterUDP", filter_val);

    cmd.spawn().map(|_| ()).map_err(|e| {
        AppError::Process(format!(
            "Failed to start {}: {}",
            file_name.to_string_lossy(),
            e
        ))
    })
}

pub fn stop_zapret() {
    sys_utils::kill_winws();
}
