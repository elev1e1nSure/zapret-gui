use tauri::{AppHandle, Manager};
use std::process::Command;
use std::os::windows::process::CommandExt;
use std::path::Path;

// Windows flag to prevent opening a console window
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Helper function to strip UNC prefix (\\?\) which CMD.exe doesn't support
fn clean_unc_path(path: &Path) -> String {
    let path_str = path.to_string_lossy();
    if path_str.starts_with(r"\\?\") {
        path_str[4..].to_string()
    } else {
        path_str.into_owned()
    }
}

#[tauri::command]
async fn run_batch(handle: AppHandle, name: String) -> Result<(), String> {
    // 1. Try to find in standard resource directory
    let mut resource_path = handle.path().resource_dir()
        .map_err(|e| format!("Could not get resource directory: {}", e))?
        .join("engine")
        .join(&name);

    // 2. If not found (common during dev when new files added), try source directory
    if !resource_path.exists() {
        if let Ok(cwd) = std::env::current_dir() {
            let dev_path = if cwd.ends_with("src-tauri") {
                cwd.join("engine").join(&name)
            } else {
                cwd.join("src-tauri").join("engine").join(&name)
            };
            
            if dev_path.exists() {
                resource_path = dev_path;
            }
        }
    }

    if !resource_path.exists() {
        return Err(format!("Batch file not found: {:?}", resource_path));
    }

    let parent_path = resource_path.parent().expect("Resource path should have a parent");
    
    let clean_exec_path = clean_unc_path(&resource_path);
    let clean_working_dir = clean_unc_path(parent_path);

    println!("Executing: {}", clean_exec_path);
    println!("Working Dir: {}", clean_working_dir);

    // Run the batch file directly with CREATE_NO_WINDOW.
    Command::new("cmd")
        .args(&["/C", &clean_exec_path])
        .current_dir(&clean_working_dir)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Failed to start batch file: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn stop_batch() -> Result<(), String> {
    // Kill the winws.exe process and its children
    Command::new("cmd")
        .args(&["/C", "taskkill /F /IM winws.exe /T >nul 2>&1"])
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|e| format!("Failed to stop processes: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![run_batch, stop_batch])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            
            // На Windows убираем системные тени, которые создают прямоугольный контур
            #[cfg(target_os = "windows")]
            {
                let _ = window.set_shadow(false);
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
