use std::os::windows::process::CommandExt;
use std::process::Command;
use std::process::Stdio;

use crate::app_error::{AppError, AppResult};
use crate::constants::CREATE_NO_WINDOW;

pub fn set_enabled(enable: bool) -> AppResult<()> {
    let exe_path = std::env::current_exe()
        .map_err(|e| AppError::Process(e.to_string()))?
        .to_string_lossy()
        .to_string();

    if enable {
        let _ = Command::new("reg")
            .args([
                "delete",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                "/v",
                "ZapretGUI",
                "/f",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();

        let status = Command::new("schtasks")
            .args([
                "/create",
                "/tn",
                "ZapretGUI",
                "/tr",
                &format!("\"{}\"", exe_path),
                "/sc",
                "onlogon",
                "/rl",
                "highest",
                "/f",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|e| AppError::Process(e.to_string()))?;

        if !status.success() {
            return Err(AppError::Process(format!(
                "schtasks /create failed with exit code {:?}",
                status.code()
            )));
        }
    } else {
        let status = Command::new("schtasks")
            .args(["/delete", "/tn", "ZapretGUI", "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|e| AppError::Process(e.to_string()))?;

        if !status.success() {
            return Err(AppError::Process(format!(
                "schtasks /delete failed with exit code {:?}",
                status.code()
            )));
        }
    }

    Ok(())
}

pub fn is_enabled() -> bool {
    let output = Command::new("schtasks")
        .args(["/query", "/tn", "ZapretGUI"])
        .creation_flags(CREATE_NO_WINDOW)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .output();

    if let Ok(out) = output {
        return out.status.success();
    }

    false
}
