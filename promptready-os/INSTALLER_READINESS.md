# INSTALLER_READINESS — Operator.Center (Sprint D)

Honest audit of desktop packaging readiness across macOS / Windows / Linux.
Source of truth: `src-tauri/tauri.conf.json` + `src-tauri/icons/`.

## Tauri config — PRESENT
- `src-tauri/tauri.conf.json` exists (schema v1), bundle `active: true`, `targets: "all"`.
- Identifier: `com.promptready.os`. Two windows (main + overlay). System tray configured.
- `beforeBuildCommand: npm run build`, `distDir: ../dist` — wired correctly.

## Per-platform

| Platform | State | Detail |
|---|---|---|
| macOS (Apple Silicon) | **ready (.app) / partial (.dmg)** | `.app` builds + **opens** (verified, unsigned) at `bundle/macos/Operator Core.app`. `.dmg` fails at `bundle_dmg.sh` Finder styling — use `npm run tauri:build:ci` (CI=true) to skip it. Not signed/notarized. |
| Windows (x86_64) | partial | NSIS/MSI buildable via Tauri; **no code-signing cert**; WiX/NSIS toolchain needed on CI. |
| Linux (AppImage / deb) | planned | Targets available; not yet produced/tested. |

## Blockers found

### Missing icons — RESOLVED (Sprint E)
`src-tauri/icons/` now contains the full generated set
(`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`, plus
Windows Store logos), generated from `brand/operator-core.png` via
`npm run tauri icon`. Bundling is no longer blocked on icons.

### Missing signing / certs — BLOCKER (distribution)
- macOS: no Developer ID certificate, no notarization profile.
- Windows: no OV/EV code-signing certificate.
- Result: unsigned binaries → OS Gatekeeper / SmartScreen warnings.

### Missing updater — NOT CONFIGURED
- No `tauri.updater` block / no signed release feed / no update public key.

### Naming — UPDATED (Sprint E)
- `package.productName` is now `"Operator Core"` (was "PromptReady OS"); window
  titles + Cargo description + index.html title updated. Brand stays
  Operator.Center. Folders/routes/package id unchanged.

### Local tauri build — macOS .app WORKS (Sprint E2)
- On macOS (Apple Silicon) `npm run tauri:build` produces a working, openable
  `Operator Core.app`. The `.dmg` step fails at `bundle_dmg.sh` (AppleScript
  Finder styling) — `npm run tauri:build:ci` (CI=true) skips that step and
  emits a plain DMG. See `TAURI_BUILD_REPORT.md`.
- On the Linux CI box the build still needs GTK/WebKit dev libs (host setup).

## Readiness summary
- **Ready:** Tauri config (productName Operator Core), icon set (generated), dev/build wiring, window + tray setup.
- **Blocked before a local artifact:** GTK/WebKit (Linux) or Xcode/MSVC (mac/win) system libraries.
- **Blocked before public distribution:** code signing (mac + win), notarization, updater feed.
- **Not started:** Linux packaging artifacts, CI signing pipeline.

## Exact commands
```bash
cd promptready-os
node brand/generate-icon.mjs          # regenerate the source PNG (already committed)
npm run tauri icon ./brand/operator-core.png   # regenerate icon set (already done)
# install host system deps first (see TAURI_BUILD_REPORT.md), then:
npm run tauri:build                   # local unsigned build per host platform
```
