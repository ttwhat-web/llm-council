# TAURI_BUILD_REPORT — Operator Core

## macOS (verified on Apple Silicon, Sprint E2 → E3)

- Frontend build (`npm run build`): **pass**
- Rust release build: **pass**
- App bundle: **pass** — opens successfully
  - `src-tauri/target/release/bundle/macos/Operator Core.app`
- DMG bundling: **PASS with `CI=true`** (unsigned)
  - `src-tauri/target/release/bundle/dmg/Operator Core_0.1.0_aarch64.dmg`
  - command: `CI=true npm run tauri:build` (or `npm run tauri:build:ci`)
- Plain `npm run tauri:build` (no CI): DMG step fails at the `bundle_dmg.sh`
  AppleScript Finder styling (leaves a `rw.*.dmg`); `CI=true` skips that step.

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
| `.app` / binary | **pass · opens** | blocked |
| DMG / installer | **pass · unsigned (`CI=true`)** | n/a |
| Signing | missing | missing |
| Notarization | missing | n/a |
| Updater | missing | missing |

## Commands
```bash
cd promptready-os
npm run tauri:build         # builds .app (works on Mac); DMG step may fail on Finder styling
npm run tauri:build:ci      # CI=true → skips Finder styling, produces a plain DMG
# open the app directly:
open "src-tauri/target/release/bundle/macos/Operator Core.app"
```
