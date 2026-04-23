// Prevents additional console window on Windows, DO NOT REMOVE!!
#![windows_subsystem = "windows"]

fn main() {
    // On panic, write a human-readable crash report to %TEMP%\zapret-gui-crashes\
    // instead of silently disappearing (which would happen with windows_subsystem = "windows").
    human_panic::setup_panic!();

    zapret_app_lib::run()
}
