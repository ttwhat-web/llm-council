# TAURI_BUILD_REPORT — Operator Core

## macOS (verified on Apple Silicon, Sprint E2 → E3)

- Frontend build (`npm run build`): **pass**
- Rust release build: **pass**
- App bundle: **pass** — opens successfully
  - `src-tauri/target/release/bundle/macos/Operator Core.app`
- DMG bundling: **STILL FAILS** at `bundle_dmg.sh` even with `CI=true`
  (the Finder/AppleScript volume-styling step), on this Mac. No final
  `.dmg` is produced.
- **Beta decision: ship the `.app`.** Build it directly without the DMG
  bundle step:
  ```bash
  npm run tauri:build:app     # = tauri build --bundles app  → .app only, no DMG
  ```
  Artifact: `src-tauri/target/release/bundle/macos/Operator Core.app` (unsigned).
- `npm run tauri:build` and `npm run tauri:build:ci` are kept for when the
  DMG step is fixed (signing/notarization / a CI host that can run the
  Finder styling, or a future Tauri that drops the AppleScript step).

### DMG failure — cause
Tauri's `bundle_dmg.sh` creates a read-write `rw.*.dmg`, then runs an
**AppleScript `tell application "Finder"`** step to set the volume window
size, icon positions and background. That styling step is the failure point:
the read-write image is created (hence the leftover `rw.…dmg`) but the
finalize/convert step never runs. The Finder AppleScript fails when:
- the build host can't send Apple events to Finder (automation permission
  not granted / no interactive GUI session / SSH or CI context), or
- `hdiutil` can't detach the volume because Finder still holds it.

This is an **environment/automation** issue, not a config bug, and **not**
caused by the space in "Operator Core" (the leftover temp image already
contains the space and was created fine).

### Safe fix — skip the fragile Finder styling
Tauri's `bundle_dmg.sh` skips the AppleScript window-styling block when the
`CI` environment variable is set. That produces a plain (un-styled but valid)
DMG. Added an npm script:

```bash
npm run tauri:build:ci      # = CI=true tauri build  → DMG without Finder styling
```

If a styled DMG is wanted later, grant the terminal app "Automation → Finder"
permission (System Settings → Privacy & Security → Automation) and re-run the
normal `npm run tauri:build` in an interactive session.

### Current valid Mac artifacts
- `src-tauri/target/release/bundle/macos/Operator Core.app` — working app.
- `src-tauri/target/release/bundle/dmg/Operator Core_0.1.0_aarch64.dmg` —
  working **unsigned** DMG (built with `CI=true`).

Both are **unsigned / not notarized** — Gatekeeper will warn. Open via
right-click → Open, or `xattr -dr com.apple.quarantine "Operator Core.app"`.
Signing + notarization are the remaining steps before public distribution.

## Linux (CI box, Sprint E)
- Blocked at `gdk-sys` — missing GTK/WebKit dev libs. Install
  `libgtk-3-dev libwebkit2gtk-4.0-dev librsvg2-dev …` then `npm run tauri:build`.

## Status summary
| Stage | macOS | Linux |
|---|---|---|
| Frontend build | pass | pass |
| Icons present | yes | yes |
| Rust release build | pass | blocked (host libs) |
| `.app` / binary | **pass · opens · `tauri:build:app`** | blocked |
| DMG / installer | **blocked · bundle_dmg.sh (even CI=true)** | n/a |
| Signing | missing | missing |
| Notarization | missing | n/a |
| Updater | missing | missing |

## Commands
```bash
cd promptready-os
npm run tauri:build:app     # BETA · .app only (no DMG) → always succeeds on Mac
npm run tauri:build         # full (app + dmg) · dmg step currently fails
npm run tauri:build:ci      # CI=true full · dmg step still fails on this Mac
# open the app directly:
open "src-tauri/target/release/bundle/macos/Operator Core.app"
```

## Beta artifact
`src-tauri/target/release/bundle/macos/Operator Core.app` (unsigned). DMG is
not required for the beta and remains blocked by `bundle_dmg.sh`.
