# TAURI_BUILD_REPORT — Operator Core (Sprint E)

Attempted: `cd promptready-os && npm run tauri:build` on Linux x86_64.

## Result: FAILED (host system libraries missing)

- Frontend build (`npm run build`, the `beforeBuildCommand`): **succeeded**.
- Icon set: **present** (generated this sprint via `tauri icon`).
- Rust shell compile: **failed** while building `gdk-sys v0.15.1`.

### Exact error
```
error: failed to run custom build command for `gdk-sys v0.15.1`
  pkg-config exited with status code 1
  > PKG_CONFIG_ALLOW_SYSTEM_CFLAGS=1 pkg-config --libs --cflags gdk-3.0 'gdk-3.0 >= 3.22'
  Package gdk-3.0 was not found in the pkg-config search path.
  Package 'gdk-3.0', required by 'virtual:world', not found
  The system library `gdk-3.0` required by crate `gdk-sys` was not found.
```

### Diagnosis
This is **not** a Tauri config problem — `tauri.conf.json` and the icon set are
valid and cargo fetched/compiled crates fine up to `gdk-sys`. The Linux Tauri
toolchain requires GTK3 + WebKit2GTK **development** system packages, which are
not installed in this build environment. No safe config patch applies; this is
a host-provisioning step.

### Fix (Linux) — install system deps, then rebuild
Debian/Ubuntu:
```bash
sudo apt-get update
sudo apt-get install -y \
  libgtk-3-dev libwebkit2gtk-4.0-dev librsvg2-dev \
  libayatana-appindicator3-dev patchelf build-essential curl wget file
cd promptready-os && npm run tauri:build
```
Fedora:
```bash
sudo dnf install -y gtk3-devel webkit2gtk4.0-devel librsvg2-devel \
  libappindicator-gtk3-devel patchelf
```

### macOS / Windows
- macOS: `npm run tauri:build` needs Xcode command-line tools; produces an
  unsigned `.app`/`.dmg` (signing/notarization still missing).
- Windows: needs WebView2 + MSVC build tools; produces an unsigned MSI/NSIS.

## Status summary
| Stage | Status |
|---|---|
| Frontend build | pass |
| Icons present | yes |
| Tauri config valid | yes |
| Rust shell compile | blocked — missing GTK/WebKit system libs |
| Artifact produced | none |
| Signing | missing |
| Updater | missing |

## No config changes were made
The build config is correct; the only blocker is host system libraries.
Re-run after installing the packages above on a provisioned build host/CI.
