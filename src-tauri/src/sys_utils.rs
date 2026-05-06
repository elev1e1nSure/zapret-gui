use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::{Command, Stdio};

use crate::constants::CREATE_NO_WINDOW;

/// Builder for child processes that must not show a console window and should not inherit stdio.
pub(crate) fn hidden_command(program: &str) -> Command {
    let mut cmd = Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW)
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    cmd
}

/// Kill user-mode bypass and ask Windows to stop kernel services so WinDivert can unload.
///
/// `WinDivert64.sys` stays locked while the driver is loaded; `sc stop` is best-effort and may
/// require an elevated process for service installs that run as SYSTEM.
pub fn kill_winws() {
    // If zapret was installed as a Windows service, stop it first (releases winws + driver).
    let _ = hidden_command("sc").args(["stop", "zapret"]).status();

    let _ = hidden_command("taskkill")
        .args(["/F", "/IM", "winws.exe", "/T"])
        .status();

    for svc in ["WinDivert", "WinDivert14"] {
        let _ = hidden_command("sc").args(["stop", svc]).status();
    }
}

const DEFENDER_PATH_ENV: &str = "ZAPRET_GUI_DEFENDER_EXCLUSION_PATH";

pub fn add_to_defender_exclusions(path: &Path) {
    if path.as_os_str().is_empty() {
        return;
    }

    // Pass the path via the process environment so the PowerShell script never interpolates raw
    // path bytes into `-Command` (avoids quoting/escaping mistakes and delimiter injection).
    let ps_script = format!(
        "Add-MpPreference -ExclusionPath $env:{DEFENDER_PATH_ENV} -ErrorAction SilentlyContinue"
    );

    let _ = hidden_command("powershell")
        .arg("-NoProfile")
        .arg("-WindowStyle")
        .arg("Hidden")
        .arg("-Command")
        .arg(&ps_script)
        .env(DEFENDER_PATH_ENV, path.as_os_str())
        .spawn();
}
