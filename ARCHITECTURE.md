# Architecture

## Overview

Zapret GUI is a **Windows-only** desktop application that wraps the [zapret](https://github.com/bol-van/zapret) DPI-bypass engine with a single-click user interface. It is built with [Tauri v2](https://tauri.app) (Rust backend + React frontend).

---

## Tech stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| UI         | React 19, plain CSS (no component library)    |
| Bridge     | Tauri v2 IPC (`invoke`, `emit`/`listen`)       |
| Backend    | Rust (Tokio async runtime, reqwest HTTP)       |
| Packaging  | Tauri bundler → `.msi` / NSIS installer        |
| Build      | Vite 7 (frontend), Cargo (backend)             |
| Tests      | Vitest + @testing-library/react (JS), `cargo test` (Rust) |

---

## Directory structure

```
zapret-gui/
├── src/                     # React frontend
│   ├── App.jsx              # Root component; wires all hooks together
│   ├── App.css              # All styles (single-file, ~1200 lines)
│   ├── config.js            # Shared constants (STRATEGIES, APP_STATUS, STORAGE_KEYS, …)
│   ├── components/
│   │   ├── PowerButton.jsx  # Main toggle button + settings cog
│   │   ├── StatusHeader.jsx # Status text + connection indicator
│   │   ├── StrategySelector.jsx  # Dropdown for strategy selection
│   │   ├── SettingsScreen.jsx    # Settings panel (autostart, game filter, exclusions…)
│   │   └── TitleBar.jsx     # Custom drag region + window controls
│   ├── hooks/
│   │   ├── useService.js    # Core state machine: start / stop / discovery / tray sync
│   │   ├── useDiscovery.js  # Auto-discovery loop orchestration
│   │   ├── useServiceUI.js  # Derived UI state (showLoadingUI, isDiscovery)
│   │   ├── useSettings.js   # All persisted user preferences (localStorage)
│   │   └── usePersistedState.js  # Reusable hook: useState + localStorage
│   └── utils/
│       ├── errors.js        # humanizeError: Tauri IPC error → Russian string
│       └── strategyCache.js # Last-working-strategy cache (localStorage)
│
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── lib.rs           # Tauri app builder, plugin registration, AppState init
│   │   ├── main.rs          # Binary entry point
│   │   ├── app_state.rs     # Shared state (AtomicBool cancel_discovery, Mutex tray item)
│   │   ├── app_error.rs     # AppError enum + typed JSON serialization for IPC
│   │   ├── commands.rs      # All `#[tauri::command]` handlers
│   │   ├── engine.rs        # Engine extraction, strategy execution, connection check
│   │   ├── sys_utils.rs     # Windows system utilities (taskkill, Defender exclusions)
│   │   ├── autostart.rs     # Scheduled task management (schtasks)
│   │   ├── tray.rs          # System tray icon + menu
│   │   └── constants.rs     # Engine directory (embedded), required file list
│   ├── engine/              # Embedded engine assets (included at compile time)
│   ├── capabilities/        # Tauri v2 capability definitions
│   └── Cargo.toml
│
├── .github/workflows/ci.yml # CI pipeline
├── eslint.config.js         # ESLint flat config
├── vitest.config.js         # Vitest config
└── vite.config.js           # Vite build config
```

---

## Data flow

```
User click
    │
    ▼
PowerButton.onClick
    │
    ▼
useService.toggleService()          ← React hook state machine
    │
    ├─ strategy === "auto"
    │       │
    │       ▼
    │   useDiscovery.startDiscovery()
    │       │
    │       ▼
    │   invoke("run_auto_discovery", { strategies, isGameFilter })
    │       │  Rust iterates strategies, starts each as a child process,
    │       │  polls 3 HTTPS endpoints concurrently until 2 succeed,
    │       │  or times out after 5 s per strategy
    │       │
    │       └─ Ok(winnerStrategy) → setIsActive(true), cache winner
    │
    └─ strategy !== "auto"
            │
            ▼
        invoke("run_strategy", { name, isGameFilter })
            │  Rust: extract engine → resolve path → spawn .bat via cmd.exe
            └─ Ok(()) → setIsActive(true)
```

### Error contract (Rust → JS)

`AppError` serializes as a structured JSON object so the frontend can branch on type without string parsing:

```json
{ "type": "DiscoveryAborted", "message": "Search aborted" }
{ "type": "Process",          "message": "Process error: winws.exe failed …" }
{ "type": "Path",             "message": "Path error: Strategy 'x.bat' not found …" }
```

The JS constant `DISCOVERY_ABORTED_TYPE = "DiscoveryAborted"` in `config.js` is the canonical counterpart to `AppError::error_type()` in `app_error.rs`. **Keep them in sync.**

---

## Key design decisions

| Decision | Rationale |
|---|---|
| Windows-only | The bypass engine (`winws.exe`, WinDivert) is Windows-specific. Portability is out of scope. |
| Single CSS file | Avoids CSS Modules/Tailwind build complexity for a ~10-screen app. |
| Engine embedded via `include_dir!` | Guarantees the correct engine version ships with every build; no separate download step. |
| Auto-discovery polling | Connectivity check uses concurrent HTTPS HEAD requests to 3 targets; 2/3 success is the threshold. Keeps the check fast and resilient to single CDN outages. |
| Structured `AppError` IPC | Prevents brittle string-matching between Rust and JS across refactors. |
| `schtasks /rl highest` for autostart | Required to run with elevated privileges on startup without a UAC prompt. |
