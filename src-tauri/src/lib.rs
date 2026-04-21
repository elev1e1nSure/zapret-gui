use tauri::{AppHandle, Manager, path::BaseDirectory};
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
    // 1. Resolve path to engine file in resources
    let resource_path = handle.path().resolve(format!("engine/{}", name), BaseDirectory::Resource)
        .map_err(|e| format!("Could not resolve resource path: {}", e))?;

    // 2. Fallback to dev path if resource doesn't exist (common during development)
    let final_path = if !resource_path.exists() {
        let cwd = std::env::current_dir().map_err(|e| format!("Could not get current dir: {}", e))?;
        let dev_path = if cwd.ends_with("src-tauri") {
            cwd.join("engine").join(&name)
        } else {
            cwd.join("src-tauri").join("engine").join(&name)
        };
        
        if !dev_path.exists() {
            return Err(format!("Batch file not found in resources or dev path: {}", name));
        }
        dev_path
    } else {
        resource_path
    };

    let parent_path = final_path.parent().ok_or("Resource path should have a parent")?;
    
    let clean_exec_path = clean_unc_path(&final_path);
    let clean_working_dir = clean_unc_path(parent_path);

    #[cfg(debug_assertions)]
    {
        println!("Executing: {}", clean_exec_path);
        println!("Working Dir: {}", clean_working_dir);
    }

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
    // Using taskkill /F /IM winws.exe /T ensures all instances are killed
    let status = Command::new("cmd")
        .args(&["/C", "taskkill /F /IM winws.exe /T >nul 2>&1"])
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map_err(|e| format!("Failed to execute taskkill: {}", e))?;

    if !status.success() {
        // Taskkill returns non-zero if process not found, which is fine
        #[cfg(debug_assertions)]
        println!("Taskkill finished with status: {}", status);
    }

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
