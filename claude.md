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

See `docs/ARCHITECTURE.md` for module descriptions and data flow.

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

### What Not to Touch
- `src-tauri/resources/zapret-core/` binaries and driver files.
- `Cargo.toml` lint rules and `tauri.conf.json` without discussion.
- `package.json` scripts.

### Error Handling
- **Rust**: propagate with `?`, use `thiserror`. See `docs/STYLE_GUIDE.md` for details.
- **JS**: fail gracefully; surface actionable messages to the user. Never swallow errors silently.

## Autonomy Boundaries

**Do without asking:**
- Bug fixes, refactors, test additions.
- UI copy changes or small styling tweaks.
- Adding a new IPC command that follows the existing pattern.
- Creating a new hook that follows the existing pattern.

**Stop and ask first:**
- Adding new dependencies (Rust crates or npm packages).
- Changing Tauri configuration, Cargo lint rules, or build scripts.
- Modifying zapret-core binaries or driver files.
- Architectural changes that cross the frontend/backend boundary in a new way.
- Changes to CI/CD workflows, release process, or signing.
- Any `unsafe` code (already forbidden by lint, but still — ask).

## Patterns

**Adding an IPC command:**
1. Define the handler in `src-tauri/src/commands.rs` using `#[tauri::command]`.
2. Register it in `src-tauri/src/lib.rs` inside `tauri::generate_handler![...]`.
3. Call it from the frontend via `invoke("command_name", { args })`.

Example: see `commands::get_status` → frontend `invoke("get_status")` in `src/hooks/useService.js`.

**Adding a React hook:**
- Keep hooks focused on one concern.
- Use `usePersistedState` for settings that should survive reloads.
- Use `useServiceUI` for UI state derived from service state.
- See `src/hooks/usePersistedState.js` for localStorage-backed state and `src/hooks/useService.js` for coordinating with the Rust backend.

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