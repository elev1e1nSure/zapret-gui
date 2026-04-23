# Runbook

Operational reference for development, debugging, and maintenance.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22+ | https://nodejs.org |
| pnpm | latest | `npm i -g pnpm` |
| Rust | stable (1.74+) | https://rustup.rs |
| Tauri CLI | v2 | installed via `pnpm tauri` |

---

## Development setup

```powershell
# 1. Clone and install JS deps
git clone <repo-url>
cd zapret-gui
pnpm install

# 2. Run in dev mode (hot reload for React; full Tauri window)
pnpm tauri dev
```

The engine assets (`src-tauri/engine/`) must be present for the Rust side to compile. They are committed to the repository.

---

## Build

```powershell
# Release build (.msi installer + .exe)
pnpm tauri build

# Artifacts land in:
#   src-tauri/target/release/bundle/msi/
#   src-tauri/target/release/bundle/nsis/
```

---

## Quality checks

```powershell
# Frontend lint
pnpm lint

# All tests (JS + hook integration)
pnpm test

# Rust checks
cd src-tauri
cargo fmt --check
cargo clippy
cargo test
```

---

## Troubleshooting

### Service won't start

1. Check that the engine is extracted — look in `%LOCALAPPDATA%\com.zapret-gui.app\engine\`.
2. Verify `winws.exe` is not blocked by Windows Defender. The app automatically adds the engine directory to exclusions, but Defender may have already quarantined the binary.
3. Run the `.bat` strategy file manually from that directory to see the raw error output.

### Auto-discovery always fails

- The discovery loop makes HTTPS requests to `google.com/generate_204`, `youtube.com/generate_204`, and `discord.com` — if those domains are not reachable at all (e.g. no internet), every strategy will time out.
- Try a specific strategy first to isolate whether the engine itself starts.

### Autostart not working

- Autostart uses a scheduled task (`schtasks /create /rl highest`) that runs at logon.
- Check Task Scheduler for a task named **ZapretGUI**.
- If creation fails, re-enable autostart from the Settings screen. The app reports the schtasks exit code in the error status.

### Tray icon missing

- The tray icon is registered on app start. If it doesn't appear, check that `src-tauri/icons/icon.ico` exists and the Tauri bundle completed without errors.

### `cargo check` fails — missing engine directory

The `include_dir!("$CARGO_MANIFEST_DIR/engine")` macro embeds the engine at compile time. If the `engine/` folder is missing, the build fails. The folder is tracked in git — run `git status src-tauri/engine` to verify.

---

## Logs

- **Rust panics / startup errors:** Tauri writes to the system stdout when running from a terminal (`pnpm tauri dev`).
- **JS errors:** Browser DevTools console (open with `Ctrl+Shift+I` in dev mode).
- **Old `engine_log.txt`:** This file no longer exists (removed). Engine stdout is discarded; errors surface through the IPC error response.

---

## Useful commands

```powershell
# Kill a stuck winws process manually
taskkill /F /IM winws.exe /T

# Check if the scheduled task exists
schtasks /query /tn ZapretGUI

# Remove the scheduled task manually
schtasks /delete /tn ZapretGUI /f

# Check Windows Defender exclusions
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
```
