fn main() {
    let mut windows = tauri_build::WindowsAttributes::new();
    // In dev/debug, running the app with a `requireAdministrator` manifest makes `tauri dev`
    // fail to spawn the executable (Windows error 740). Use a non-elevating manifest for
    // debug builds while keeping elevation for release builds.
    let profile = std::env::var("PROFILE").unwrap_or_default();
    let manifest = if profile == "release" {
        include_str!("app.manifest")
    } else {
        include_str!("app.dev.manifest")
    };
    windows = windows.app_manifest(manifest);
    let attrs = tauri_build::Attributes::new().windows_attributes(windows);
    tauri_build::try_build(attrs).expect("failed to run build script");
}
