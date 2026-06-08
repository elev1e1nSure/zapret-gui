# Contributing

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/)
- [Rust](https://rustup.rs/) (latest stable)
- Windows 10/11 (the app relies on WinDivert)

### Install

```powershell
pnpm install
```

### Development

```powershell
# Start Vite dev server + Tauri in watch mode
pnpm tauri dev
```

### Lint & Test

```powershell
pnpm lint        # ESLint (frontend)
pnpm test        # Vitest (frontend)
cargo test       # Rust tests (run in src-tauri/)
cargo clippy     # Rust lints
cargo fmt        # Rust formatting
```

## Before Opening a PR

1. Branch from `main`: `git checkout -b feat/my-feature`.
2. Write / update tests for changed code.
3. Ensure CI passes locally (`pnpm lint && pnpm test && cargo test`).
4. Commit with [Conventional Commits](https://www.conventionalcommits.org/).
5. Push and open a PR against `main`.

## Project Structure Quick Reference

- `src/` — React frontend.
- `src-tauri/src/` — Rust backend modules.
- `tests/` — Vitest unit tests and e2e smoke scripts.
- `.github/workflows/` — CI/CD definitions.

## Questions?

Open a [Discussion](https://github.com/elev1e1nSure/zapret-gui/discussions) or ping in an issue.
