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
| macOS (Apple Silicon / Intel) | partial | Builds locally via `npm run tauri:build`; **not signed/notarized**; universal target not configured. |
| Windows (x86_64) | partial | NSIS/MSI buildable via Tauri; **no code-signing cert**; WiX/NSIS toolchain needed on CI. |
| Linux (AppImage / deb) | planned | Targets available; not yet produced/tested. |

## Blockers found

### Missing icons — BLOCKER
`src-tauri/icons/` contains only `README.md`. The config references:
`icons/32x32.png`, `icons/128x128.png`, `icons/128x128@2x.png`, `icons/icon.icns`, `icons/icon.ico` — **none exist**. Bundling will fail until icons are generated.
- Fix: `npm run tauri icon path/to/logo.png` (generates the full icon set).

### Missing signing / certs — BLOCKER (distribution)
- macOS: no Developer ID certificate, no notarization profile.
- Windows: no OV/EV code-signing certificate.
- Result: unsigned binaries → OS Gatekeeper / SmartScreen warnings.

### Missing updater — NOT CONFIGURED
- No `tauri.updater` block / no signed release feed / no update public key.

### Naming note (no change made)
- `package.productName` is `"PromptReady OS"` (legacy). Product rename is out of scope for this sprint per guardrails — flagged only.

## Readiness summary
- **Ready:** Tauri config, dev/build wiring, window + tray setup.
- **Blocked before any installer:** icon set (must generate).
- **Blocked before public distribution:** code signing (mac + win), notarization, updater feed.
- **Not started:** Linux packaging artifacts, CI signing pipeline.

## Exact commands
```bash
cd promptready-os
npm run tauri icon ./brand/logo.png   # generate missing icons (unblocks bundling)
npm run tauri:build                   # local unsigned build per host platform
```
