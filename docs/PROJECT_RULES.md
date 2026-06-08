# Project Rules

## Commits

- **Format**: [Conventional Commits](https://www.conventionalcommits.org/).
- **Language**: English.
- **Examples**:
  - `feat(tray): add tooltip with current strategy`
  - `fix(engine): handle winws exit code 1 gracefully`
  - `refactor(state): replace mutex with RwLock for reads`
  - `ci(release): auto-publish on version tag`
- **Scope**: Use the module name (`tray`, `engine`, `ui`, `ci`, etc.).

## Versioning

- Follow [SemVer](https://semver.org/).
- Version is defined in three places; bump all simultaneously:
  1. `package.json`
  2. `src-tauri/Cargo.toml`
  3. `src-tauri/tauri.conf.json`
- Release flow:
  1. Update versions.
  2. Commit: `chore(release): bump version to X.Y.Z`.
  3. Tag: `git tag vX.Y.Z`.
  4. Push tag: `git push origin vX.Y.Z`.
  5. GitHub Actions builds, tests, and publishes the release automatically.

## Branches

- `main` — stable, deployable.
- `dev` / feature branches — `feat/description` or `fix/description`.
- All PRs target `main` and must pass CI (lint + test + build) before merge.

## Code Review

- Every PR needs at least one review.
- Keep PRs focused: one logical change per PR.
- Update tests when changing behavior; do not delete tests without justification.

## Security

- Do not commit secrets, tokens, or personal paths.
- Audit JS dependencies: `pnpm audit --audit-level high`.
- Audit Rust dependencies: `cargo audit`.
