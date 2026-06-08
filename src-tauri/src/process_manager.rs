use crate::app_error::{AppError, AppResult};
use crate::constants::CREATE_NO_WINDOW;
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

static CORE_CHILD: Mutex<Option<Child>> = Mutex::new(None);
static LAST_TRANSITION: Mutex<u64> = Mutex::new(0);
const TRANSITION_COOLDOWN_MS: u64 = 1000;

fn check_transition_cooldown() -> bool {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let mut last = LAST_TRANSITION.lock().unwrap();
    if now - *last < TRANSITION_COOLDOWN_MS {
        return false;
    }
    *last = now;
    true
}

pub fn core_path(app_handle: &AppHandle) -> AppResult<PathBuf> {
    // In dev builds, always use the source resources dir — single source of truth.
    #[cfg(debug_assertions)]
    {
        let dev_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("zapret-core")
            .join("zapret-core.exe");
        if dev_path.exists() {
            return Ok(dev_path);
        }
    }

    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| AppError::Path(format!("Failed to get resource dir: {}", e)))?;

    let path = resource_dir.join("zapret-core").join("zapret-core.exe");
    if path.exists() {
        return Ok(path);
    }

    let current_exe = std::env::current_exe()
        .map_err(|e| AppError::Path(format!("Failed to get current exe: {}", e)))?;
    let exe_dir = current_exe
        .parent()
        .ok_or_else(|| AppError::Path("Failed to get exe parent dir".to_string()))?;
    let fallback = exe_dir.join("resources").join("zapret-core").join("zapret-core.exe");

    if fallback.exists() {
        Ok(fallback)
    } else {
        Err(AppError::Path(format!(
            "zapret-core.exe not found at {} or {}",
            path.display(),
            fallback.display()
        )))
    }
}

pub async fn start_core(app_handle: &AppHandle) -> AppResult<()> {
    if !check_transition_cooldown() {
        eprintln!("start_core: transition too fast, skipping");
        return Ok(());
    }

    let core_path = core_path(app_handle)?;
    eprintln!("zapret-core.exe path: {}", core_path.display());

    // Use app data dir as CWD so runtime files (logs, data/) go to %APPDATA%,
    // not into src-tauri/resources/ where Tauri's dev watcher would pick them up.
    let data_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| AppError::Path(format!("Failed to get app data dir: {}", e)))?;
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| AppError::Io(e))?;
    eprintln!("zapret-core data dir: {}", data_dir.display());

    let child = Command::new(&core_path)
        .arg("--server")
        .current_dir(&data_dir)
        .spawn()
        .map_err(|e| AppError::Process(format!("Failed to spawn zapret-core.exe: {}", e)))?;

    // Wait 500ms and check if process is still alive using tasklist
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    if is_core_running() {
        *CORE_CHILD.lock().map_err(|e| {
            AppError::Process(format!("Failed to lock CORE_CHILD mutex: {}", e))
        })? = Some(child);
        Ok(())
    } else {
        Err(AppError::Process("zapret-core.exe exited immediately".to_string()))
    }
}

pub fn stop_core() -> AppResult<()> {
    if !check_transition_cooldown() {
        eprintln!("stop_core: transition too fast, skipping");
        return Ok(());
    }

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
        .output();

    // We don't error on taskkill failure - it's just a cleanup attempt
    if let Err(e) = taskkill_result {
        eprintln!("taskkill failed: {}", e);
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
