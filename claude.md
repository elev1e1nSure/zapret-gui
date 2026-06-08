# claude.md

## Stack & Environment

- **Frontend**: React 19, Vite 7, pnpm. Node 22+.
- **Backend**: Rust, Tauri v2, Tokio.
- **Platform**: Windows only. The app embeds `zapret-core` (WinDivert kernel driver).
- **zapret-core**: Our own open-source DPI bypass engine. It lives in `src-tauri/resources/zapret-core/`. The GUI wraps it; modify the core only when it misbehaves.

## Project Structure

Standard Tauri v2 layout:

```
src/              # React frontend
src-tauri/src/    # Rust backend
src-tauri/resources/zapret-core/  # Embedded engine binaries
tests/            # Vitest units + e2e smoke
docs/             # Project docs
```

Key Rust modules:
- `commands.rs` — IPC handlers exposed to the frontend.
- `process_manager.rs` — Spawns/kills `winws.exe` silently (no console window).
- `app_state.rs` — Global mutable state (engine status, strategy).
- `core_client.rs` — Talks to zapret-core.
- `sys_utils.rs` — Admin checks, Defender exclusions.
- `tray.rs` — System tray.

## Run & Test

```powershell
# Dev
pnpm install
pnpm tauri dev

# Frontend
pnpm lint
pnpm test          # Vitest

# Rust (run from src-tauri/)
cargo test
cargo clippy
cargo fmt --check
```

## Code Preferences

### Style
- Self-documenting code first. Add comments only to explain **why**, not **what**.
- Keep React components under 150 lines; functions under 40 lines. Extract early.
- One logical change per commit. Use Conventional Commits in English.

### Naming
- React: PascalCase components, `camelCase` hooks (`useSomething`), `SCREAMING_SNAKE_CASE` constants.
- Rust: PascalCase types, `snake_case` functions/variables, `SCREAMING_SNAKE_CASE` constants.

### What Not to Touch
- `src-tauri/resources/zapret-core/` binaries and driver files.
- `Cargo.toml` lint rules and `tauri.conf.json` without discussion.
- `package.json` scripts.

### Error Handling
- **Rust**: Propagate with `?`. Use `thiserror` enums. `unwrap`/`expect` only for impossible invariants; log the error before failing if user-facing.
- **JS**: Fail gracefully; surface actionable messages to the user. Never swallow errors silently.

## Project Context

Zapret-GUI is a one-click Windows wrapper around `zapret-core` to bypass DPI blocking on YouTube, Discord, etc. It requires administrator privileges because WinDivert installs a kernel driver.

### Non-Negotiable Decisions
- **Tauri v2**: Chosen for small binary size and native OS integration.
- **Windows-only**: WinDivert is Windows-specific.
- **`unsafe_code = "forbid"`**: No `unsafe` in the Rust codebase.
- **Embedded engine**: zapret-core binaries are bundled at build time via `include_dir` and extracted on first run.
- **NSIS installer only**: `.exe` installer, no MSI.

---

**See also:**
- `docs/ARCHITECTURE.md` — full architecture overview and data flow.
- `docs/STYLE_GUIDE.md` — detailed JS and Rust style rules.
- `docs/PROJECT_RULES.md` — versioning, branching, commit conventions, security.
- `docs/CONTRIBUTING.md` — setup, local dev, and PR checklist.
