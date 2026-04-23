# Release process

Step-by-step checklist for cutting a new release.

---

## 1. Update version numbers

Version must be kept in sync across **three** files:

| File | Key |
|------|-----|
| `package.json` | `"version"` |
| `src-tauri/Cargo.toml` | `[package] version` |
| `src-tauri/tauri.conf.json` | `"version"` |

```powershell
# Example: bump to 1.5.0
# Edit each file manually, or use sed / your editor.
# Then verify:
Select-String -Pattern '"version"' package.json, src-tauri/tauri.conf.json
Select-String -Pattern '^version' src-tauri/Cargo.toml
```

After changing `Cargo.toml`, regenerate the lock file:

```powershell
cd src-tauri
cargo check   # updates Cargo.lock
```

---

## 2. Quality gate

Run the full CI suite locally before tagging:

```powershell
pnpm lint
pnpm test
cd src-tauri
cargo fmt --check
cargo clippy
cargo test
```

All checks must pass with **zero errors**.

---

## 3. Build the release artifacts

```powershell
pnpm tauri build
```

Artifacts:

| Format | Path |
|--------|------|
| MSI installer | `src-tauri/target/release/bundle/msi/zapret-gui_X.Y.Z_x64_en-US.msi` |
| NSIS installer | `src-tauri/target/release/bundle/nsis/zapret-gui_X.Y.Z_x64-setup.exe` |
| Standalone EXE | `src-tauri/target/release/zapret-gui.exe` |

---

## 4. Smoke-test the release build

1. Run the **NSIS installer** on a clean Windows machine (or a VM snapshot).
2. Verify:
   - App launches and the tray icon appears.
   - Power button starts a strategy (use "General" as baseline).
   - Status changes to `<strategy> запущен`.
   - Clicking again stops the service.
   - Autostart toggle creates/removes the ZapretGUI scheduled task.
   - Closing the window hides to tray (if Minimize to Tray is enabled).
   - "Exit" from tray context menu terminates the process.

---

## 5. Tag and publish

```powershell
git tag -a v1.5.0 -m "Release 1.5.0"
git push origin v1.5.0
```

Attach the `.msi` and `.exe` installers to the GitHub release.

---

## Rollback

If a release is found to be critically broken:

1. Yank the GitHub release (mark as "Pre-release" or delete).
2. Point users to the previous tagged release.
3. Fix the issue on a branch, repeat this checklist.

---

## Versioning policy

This project follows [Semantic Versioning](https://semver.org/):

| Change | Version bump |
|--------|-------------|
| New engine version, breaking settings change | MAJOR |
| New feature, new strategy | MINOR |
| Bug fix, UI improvement, performance | PATCH |
