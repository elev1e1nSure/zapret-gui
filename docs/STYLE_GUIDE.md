# Style Guide

## JavaScript / React (Frontend)

- **Language**: ES2022+, strict mode, Vite bundler.
- **Linter**: ESLint with `@eslint/js` and `eslint-plugin-react-hooks`.
  - Run `pnpm lint` before committing.
- **Naming**:
  - Components: PascalCase (`ToggleButton.jsx`).
  - Hooks: camelCase prefixed with `use` (`useService.js`).
  - Utils / constants: camelCase or SCREAMING_SNAKE_CASE for true constants.
- **Imports**: Group in this order — React, third-party, `@tauri-apps/*`, internal absolute, relative.
- **Components**: Prefer functional components + hooks. Keep components under 200 lines; extract logic into hooks or utils.
- **CSS**: Use plain CSS modules in `src/styles/`. Avoid inline styles for static rules.
- **Tests**: Co-locate or place in `src/**/__tests__/**/*.test.{js,jsx}`. Use Vitest + jsdom for DOM tests.

## Rust (Backend)

- **Formatter**: `cargo fmt` (enforced in CI).
- **Linter**: Clippy with `[lints.clippy]` in `Cargo.toml`.
  - `correctness = "deny"`
  - `suspicious = "warn"`
  - `perf = "warn"`
- **Naming**:
  - Types / traits: PascalCase (`ProcessManager`).
  - Functions / variables: snake_case (`spawn_engine`).
  - Constants: SCREAMING_SNAKE_CASE (`ENGINE_BUNDLE_STAMP`).
- **Error handling**: Use `thiserror` derived enums. Propagate with `?`. Never unwrap in production paths; use `expect` only for programmer invariants with a message.
- **Safety**: `unsafe_code = "forbid"` globally. If you absolutely need FFI, isolate it in a minimal module and document why.
- **Async**: Use `tokio` runtime. Tauri commands can be `async fn`.
- **Comments**: Explain "why", not "what". Keep doc comments (`///`) on public API.

## General

- **Line endings**: LF (enforced by `.gitattributes`).
- **File encoding**: UTF-8.
- **Trailing whitespace**: Trim it.
