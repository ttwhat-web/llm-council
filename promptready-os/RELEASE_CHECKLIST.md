# RELEASE_CHECKLIST — Operator Core v1 RC

Release candidate gate. Every item below must be true before tagging
**v1.0**. Items already true are checked; the rest are the explicit
gating work.

## Build & types
- [x] `cd promptready-os && npm run build` — passes (tsc -b + vite, no errors).
- [x] `cd ../promptfixer-sidekick && npm run build` — passes (next, Compiled successfully).
- [x] `tsc --noEmit` clean across the tree (strict mode).
- [x] No `console.error` / hidden warnings in build output (only the chunk-size advisory).

## Honesty contract (non-negotiable)
- [x] No fake prices, headlines, odds, transcripts, or "connected" states.
- [x] Real feeds = CoinGecko (crypto) + Hacker News / NewsAPI-via-bridge (news). Everything else is adapter-ready and labeled.
- [x] Mic only active while held / toggled; MIC ACTIVE banner shows whenever capturing.
- [x] Native desktop speech is **planned** (see `SPEECH_BRIDGE_PLAN.md`); browser preview uses real `SpeechRecognition` when present; text mode is the universal fallback.
- [x] Every button carries one of the six labels (`WORKS · COPY ONLY · OPEN EXTERNAL · REQUIRES KEY · REQUIRES DESKTOP · DISABLED · planned`). See `BUTTON_AUDIT_REPORT.md`.

## Packaging (macOS first)
- [x] Tauri product identity = "Operator Core"; icons generated; bundle id `com.promptready.os`.
- [x] `npm run tauri:build:app` produces the unsigned `.app` (beta artifact).
- [ ] DMG bundling still blocked by `bundle_dmg.sh` Finder styling — not required for beta (see `TAURI_BUILD_REPORT.md`).
- [ ] Code signing (Developer ID) — required before public distribution.
- [ ] Notarization (`notarytool` + staple) — required before public distribution.
- [ ] Updater feed — required for auto-update.

## Surfaces (per Sprint OMEGA polish phases)
- [x] **Atlas** — permanent home; honest counters; bootstrap overlay handles no-brain.
- [x] **Mission Control** — dispatch / cancel / mode+quality / repo context all work.
- [x] **Intelligence Terminal** — Terminal / Live Wall / Second Screen modes; w/t/b keys; command bar quick-find; provider health rail; cost mini.
- [x] **Market Lab (Terminal Pro)** — dense terminal frame (`220px / 1fr / 300px` + bottom news tape), `HATCH`/`DisabledRow` for adapter-ready zones, real crypto chart + heatmap, world clocks, AI stack honest states.
- [x] **Voice Console** — Atlas Orb modes, MIC banner, real waveform, paste autopilot, task queue, command palette, Jarvis deck; desktop control all locked planned.
- [x] **Settings** — Plans card, Workspace Menu, Theme/Background, Setup Wizard, Snapshots, Brain Passport (export + preview-only import), Connector Keys, Provider Diagnostics, Ollama Setup, Model Lab, Model Costs, Operator Bulletin, Communications, Telegram (live + field test), Compliance, Founder Beta, Button Audit, Field Test Mode, Packaging card.
- [x] **Media Dock V2** — YouTube/Spotify/Apple Music/Custom tabs, external search, embed rules, mini/medium/large sizes, real PiP, no Bloomberg/proprietary, no autoplay.
- [x] **Marketplace** — install/export/import real; packs install real workflows + templates + watchlists + repo presets + notes.
- [x] **Library** — Replay v2 lineage stats, copy/export/follow-up; read-only, no rerun.
- [x] **Brain / Agents / Workflows** — display + planned controls clearly labeled.

## Documentation present
- [x] `APP_REALITY_CHECK.md`
- [x] `BETA_TEST_CHECKLIST.md`
- [x] `BLOOMBERG_TERMINAL_REPO_AUDIT.md` (Option 1: not imported, original implementation)
- [x] `BUTTON_AUDIT_REPORT.md`
- [x] `INSTALLER_READINESS.md`
- [x] `INSTALL_STATUS.md`
- [x] `OPERATOR_FLOW_CHECK.md`
- [x] `SPEECH_BRIDGE_PLAN.md`
- [x] `TAURI_BUILD_REPORT.md`
- [x] `UX_REPAIR_NOTES.md`
- [x] `RELEASE_CHECKLIST.md` (this file)
- [x] `BETA_LIMITATIONS.md`
- [x] `KNOWN_CONNECTORS.md`
- [x] `PREMIUM_SURFACES.md`

## Release blockers (must clear before v1.0 public)
1. macOS signing + notarization (Developer ID, notarytool).
2. Updater feed configured.
3. (Optional but recommended) Windows MSI + signing; Linux AppImage/deb on a provisioned host.

## v1.0 RC tag criteria
- Build passes on both apps · all docs present · no dead buttons (audit confirms 0) · `.app` opens and the BETA_TEST_CHECKLIST 10-step flow passes manually on macOS.
