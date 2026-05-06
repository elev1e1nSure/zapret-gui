use crate::app_error::{AppError, AppResult};
use crate::sys_utils::hidden_command;

pub fn set_enabled(enable: bool) -> AppResult<()> {
    let exe_path = std::env::current_exe()
        .map_err(|e| AppError::Process(e.to_string()))?
        .to_string_lossy()
        .to_string();

    if enable {
        let _ = hidden_command("reg")
            .args([
                "delete",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                "/v",
                "ZapretGUI",
                "/f",
            ])
            .status();

        let status = hidden_command("schtasks")
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
            .status()
            .map_err(|e| AppError::Process(e.to_string()))?;

        if !status.success() {
            return Err(AppError::Process(format!(
                "schtasks /create failed with exit code {:?}",
                status.code()
            )));
        }
    } else {
        let status = hidden_command("schtasks")
            .args(["/delete", "/tn", "ZapretGUI", "/f"])
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
    let output = hidden_command("schtasks")
        .args(["/query", "/tn", "ZapretGUI"])
        .output();

    if let Ok(out) = output {
        return out.status.success();
    }

    false
}
