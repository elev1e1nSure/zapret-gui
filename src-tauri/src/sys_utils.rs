use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::Command;

use crate::constants::CREATE_NO_WINDOW;

pub fn kill_winws() {
    let _ = Command::new("taskkill")
        .args(["/F", "/IM", "winws.exe", "/T"])
        .creation_flags(CREATE_NO_WINDOW)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status();
}

pub fn add_to_defender_exclusions(path: &Path) {
    let path_str = path.to_string_lossy();
    let escaped = path_str.replace('\'', "''");

    let script = format!(
        "Add-MpPreference -ExclusionPath '{}' -ErrorAction SilentlyContinue",
        escaped
    );

    let _ = Command::new("powershell")
        .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();
}
