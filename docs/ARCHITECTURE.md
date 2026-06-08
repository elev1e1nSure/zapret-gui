# Architecture

Zapret-GUI is a Tauri v2 desktop application. The stack splits cleanly into a React frontend and a Rust backend.

## Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | React 19 + Vite | UI, state management, user interactions |
| Backend | Rust (Tauri v2) | OS integration, process management, tray |
| Bundling | Tauri CLI | Cross-compilation, NSIS installer |

## Project Layout

```
├── src/                     # React frontend
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Custom React hooks (service, state, etc.)
│   ├── utils/               # Pure JS helpers
│   ├── styles/              # CSS modules / theme files
│   ├── App.jsx              # Root component
│   └── main.jsx             # Entry point
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── lib.rs           # Tauri init, plugin setup
│   │   ├── main.rs          # Binary entry
│   │   ├── commands.rs      # IPC command handlers exposed to frontend
│   │   ├── app_state.rs     # Global mutable state (engine status, config)
│   │   ├── process_manager.rs # Spawning / killing winws.exe
│   │   ├── core_client.rs   # Communication with zapret-core engine
│   │   ├── sys_utils.rs     # Windows-specific helpers (admin checks, Defender)
│   │   ├── autostart.rs     # Windows autorun registry logic
│   │   ├── tray.rs          # System tray icon & menu
│   │   ├── app_error.rs     # Unified error types
│   │   └── constants.rs     # Hardcoded paths, magic numbers
│   └── resources/           # Embedded zapret-core binaries
└── tests/                   # Vitest units + e2e smoke tests
```

## Data Flow

1. **Frontend** calls `invoke('command_name', payload)` via Tauri API.
2. **Rust commands** (`commands.rs`) receive the payload, mutate `AppState` or spawn processes.
3. **Backend events** (engine status changes) are pushed to the frontend via Tauri events.
4. **Process Manager** handles `winws.exe` lifecycle silently (no console window).

## State Ownership

- **React**: UI-local state (toggles, loading spinners).
- **Rust `AppState`**: Source of truth for engine running / stopped, selected strategy, port.
- **Config**: Persisted to disk via Tauri shell commands or custom JSON file.

## Key Constraints

- The app is **Windows-only** because it embeds `WinDivert` (kernel driver).
- All child processes must be spawned with hidden console windows.
- `unsafe_code` is forbidden at the crate level (`[lints.rust]` in `Cargo.toml`).
