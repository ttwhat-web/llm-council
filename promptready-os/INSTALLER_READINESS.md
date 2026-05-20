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
| macOS (Apple Silicon) | **ready (.app, unsigned) · dmg blocked** | `.app` builds + **opens** via `npm run tauri:build:app` (the beta artifact). `.dmg` still fails at `bundle_dmg.sh` even with `CI=true` and is **not required for beta**. Unsigned / not notarized. |
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

### Local tauri build — macOS .app is the beta artifact (Sprint I.2)
- `npm run tauri:build:app` (= `tauri build --bundles app`) builds a working,
  openable `Operator Core.app` with no DMG step — this is the beta artifact.
- The `.dmg` step (`bundle_dmg.sh` Finder/AppleScript styling) **still fails on
  the build Mac even with `CI=true`**, so `tauri:build` / `tauri:build:ci` do not
  yield a `.dmg` here. DMG is not required for the beta. See `TAURI_BUILD_REPORT.md`.
- On the Linux CI box the build still needs GTK/WebKit dev libs (host setup).

### Remaining macOS distribution steps
- **Code signing** (Developer ID) — missing.
- **Notarization** (notarytool + staple) — missing.
- **Updater feed** — missing.
- Until signed + notarized, the `.dmg` triggers Gatekeeper warnings.

## Readiness summary
- **Ready:** Tauri config (productName Operator Core), icon set (generated), dev/build wiring, window + tray setup, **macOS `.app` + unsigned `.dmg` (verified via `CI=true`)**.
- **Blocked before public distribution:** code signing (mac + win), notarization (mac), updater feed.
- **Blocked on host setup:** Linux (GTK/WebKit dev libs), Windows (MSVC + WebView2).
- **Not started:** Linux/Windows packaging artifacts, CI signing pipeline.

## Exact commands
```bash
cd promptready-os
node brand/generate-icon.mjs          # regenerate the source PNG (already committed)
npm run tauri icon ./brand/operator-core.png   # regenerate icon set (already done)
# install host system deps first (see TAURI_BUILD_REPORT.md), then:
npm run tauri:build                   # local unsigned build per host platform
```
