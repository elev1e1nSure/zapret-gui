use crate::app_error::{AppError, AppResult};
use crate::constants::CREATE_NO_WINDOW;
use std::process::Child;
use std::sync::Mutex;
use tauri::AppHandle;
use tokio::process::Command;

static CORE_CHILD: Mutex<Option<Child>> = Mutex::new(None);

pub async fn start_core(app_handle: &AppHandle) -> AppResult<()> {
    let core_path = app_handle
        .path_resolver()
        .resolve_resource("zapret-core/zapret-core.exe")
        .ok_or_else(|| AppError::Path("Failed to resolve zapret-core.exe".to_string()))?;

    if !core_path.exists() {
        return Err(AppError::Path(format!(
            "zapret-core.exe not found at {}",
            core_path.display()
        )));
    }

    let working_dir = core_path
        .parent()
        .ok_or_else(|| AppError::Path("Failed to get parent directory".to_string()))?;

    let mut child = Command::new(&core_path)
        .arg("--server")
        .current_dir(working_dir)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| AppError::Process(format!("Failed to spawn zapret-core.exe: {}", e)))?;

    // Wait 500ms and check if process is still alive
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    let status = child.try_wait();
    match status {
        Ok(Some(exit_code)) => Err(AppError::Process(format!(
            "zapret-core.exe exited immediately with code: {:?}",
            exit_code
        ))),
        Ok(None) => {
            // Process is still running
            *CORE_CHILD.lock().map_err(|e| {
                AppError::Process(format!("Failed to lock CORE_CHILD mutex: {}", e))
            })? = Some(child);
            Ok(())
        }
        Err(e) => Err(AppError::Process(format!(
            "Failed to check process status: {}",
            e
        ))),
    }
}

pub async fn stop_core() -> AppResult<()> {
    // Kill the child process if we have a handle to it
    let mut child_guard = CORE_CHILD.lock().map_err(|e| {
        AppError::Process(format!("Failed to lock CORE_CHILD mutex: {}", e))
    })?;

    if let Some(mut child) = child_guard.take() {
        child.kill().map_err(|e| {
            AppError::Process(format!("Failed to kill zapret-core.exe child: {}", e))
        })?;
    }

    // Also run taskkill to handle any zombie processes
    let taskkill_result = Command::new("taskkill")
        .args(["/F", "/IM", "zapret-core.exe"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .await;

    // We don't error on taskkill failure - it's just a cleanup attempt
    if let Err(e) = taskkill_result {
        tracing::warn!("taskkill failed: {}", e);
    }

    Ok(())
}

pub fn is_core_running() -> bool {
    let output = std::process::Command::new("tasklist")
        .args(["/FI", "IMAGENAME eq zapret-core.exe"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match output {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            stdout.contains("zapret-core.exe")
        }
        Err(_) => false,
    }
}

pub async fn ensure_core_running(app_handle: &AppHandle) -> AppResult<()> {
    if !is_core_running() {
        start_core(app_handle).await
    } else {
        Ok(())
    }
}
