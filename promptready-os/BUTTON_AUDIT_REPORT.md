# BUTTON_AUDIT_REPORT — Operator Core

Honest, surface-by-surface audit of every visible action. Method: code
inventory of `<button>` + `onClick` + `disabled` + `window.open` +
`navigator.clipboard` patterns across all routes and supporting cards,
plus a static review of each handler's real target. The six-label
taxonomy (see `UX_REPAIR_NOTES.md`) is the source of truth:

**WORKS · COPY ONLY · OPEN EXTERNAL · REQUIRES KEY · REQUIRES DESKTOP · DISABLED · planned**

## Headline numbers
- **Surfaces audited:** 12 (Atlas · Mission Control · Intelligence Terminal · Market Lab · Voice Console · Settings · Media Dock · Marketplace · Library · Brain · Agents · Workflows).
- **Top-level page buttons inventoried:** ~104 across the 12 page files (Settings dominates at 24, then Voice at 13, Media Dock at 13, Terminal at 12).
- **Genuinely dead/no-op handlers found:** **0** — code-wide scans for `onClick={() => {}}` / `onClick={undefined}` / TODO-on-click returned nothing.
- **Intentionally `disabled` buttons (`DISABLED · planned` or runtime-gated):** ~95 across the tree (Voice 17, Settings 12, RepoImportBox 7, MemoryVault 8, WorkflowCanvas 6, MarketLab 6, LiveWall 5, BrainBootstrap 5, DemoWorkspace 4, RepoWorkspace 4, Terminal 4, plus smaller counts elsewhere) — all guarded by real state (busy / missing brain / no input / not connected / planned).
- **Fix applied this sprint:** added the **WORKS / COPY ONLY / OPEN EXTERNAL / REQUIRES KEY / REQUIRES DESKTOP / DISABLED · planned** taxonomy to `UX_REPAIR_NOTES.md`. Media Dock V2 already applies the labels at the source. No other rewrites required because no dead controls were found.

## Per-surface audit

| Surface | Representative actions | Classification | Status |
|---|---|---|---|
| **Atlas** (`/`) | Export blueprint · Home mode toggle (blueprint/operations/live) · Zoom controls · Section card → detail panel · Close detail | WORKS · WORKS · WORKS · WORKS · WORKS | OK · no dead |
| **Mission Control** (`/mission-control`) | Dispatch · Cancel · Mode/Quality selectors · Repo Context add · Copy command (where shown) | WORKS · WORKS · WORKS · WORKS · COPY ONLY | OK |
| **Intelligence Terminal** (`/terminal`) | Command bar (parse → dispatch/nav/attach) · Tab switch · Mode switch (Terminal/Wall/Second Screen, w/t/b keys) · Pin add/remove · Alert add/remove · Crypto refresh | WORKS × all | OK |
| **Market Lab** (`/market-lab`) | Watchlist symbol select · Chart tab (price/heatmap) · Chart tab (flow/news-impact/correlation/sentiment/timeline) · Chart stack 1/2/4/6 · TV mode toggle · Fullscreen · News chip (AI/Markets/Crypto/Tech/Business) · News chip (breaking/economy/politics/earnings) · News open source · News create mission · News save to brain | WORKS · WORKS · DISABLED · planned (adapter-ready) · WORKS · WORKS · WORKS · WORKS · DISABLED · planned · OPEN EXTERNAL · WORKS · WORKS | OK · adapter-ready zones now use the `HATCH` + `DisabledRow` treatment so they read intentionally disabled |
| **Voice Console** (`/voice`) | Orb toggle talk · Hold-Space PTT · Text submit · Command chips (demo list) · Smart Paste Clean/Accept/Undo · Save to brain / Mission from cleaned · Remember-for-coding YES/NO · Test Console run-all · Wake-sound toggle · Desktop control rows (open app, paste, run shell, etc.) | WORKS (when browser speech available; REQUIRES DESKTOP in `.app` per `SPEECH_BRIDGE_PLAN.md`) · WORKS · WORKS · WORKS · WORKS · WORKS · WORKS · WORKS · DISABLED · planned · DISABLED · planned | OK · all eight desktop-control actions remain locked with explicit "planned · requires approval" labels |
| **Settings** (`/settings`) | Plans "view as X" · Theme/background switch · Workspace menu (show/hide nav, default home, startup mode, density) · Telegram generate/copy/revoke link · Telegram field-test buttons · Snapshot Export/Import · Brain Passport Export/Import (preview-only) · Diagnostics export · Model Lab probe/run/save · Ollama setup copy commands · Field Test Mode toggle · Button Audit checklist · Reset workspace · Founder checklist | WORKS · WORKS · WORKS · WORKS · WORKS · WORKS · WORKS (import = preview-only, no overwrite) · WORKS · WORKS · COPY ONLY · WORKS · WORKS · WORKS (destructive · confirms) · WORKS | OK |
| **Media Dock** (floating) | Launcher toggle · Source tab (YouTube/Spotify/Apple Music/Custom) · Search · Load URL (YouTube → embed; audio → native; Spotify/Apple → embed if detectable, else external) · Size mini/medium/large · Stop/Clear · PiP (when supported) · Mode presets · AI Radio toggle | WORKS · WORKS · OPEN EXTERNAL · WORKS / OPEN EXTERNAL · WORKS · WORKS · WORKS / DISABLED · planned · WORKS · DISABLED · planned | OK · every button has WORKS / OPEN EXTERNAL / DISABLED · planned tooltip |
| **Marketplace** (`/marketplace`) | Install · Re-install · Export pack · Import .pack.json | WORKS · WORKS · WORKS · WORKS | OK |
| **Library** (`/library`) | Expand receipt · Copy replay · Export .md · Run follow-up · Replay stats chips | WORKS · COPY ONLY · WORKS · WORKS · WORKS (informational chips) | OK |
| **Brain** (`/brain`) | Identity edit · memory source toggle · engine toggle · save | WORKS × all | OK |
| **Agents** (`/agents`) | "Not installable yet" | DISABLED · planned (labeled) | OK |
| **Workflows** (`/workflows`) | "Not installable yet" | DISABLED · planned (labeled) | OK |

## Remaining intentionally disabled buttons (by reason)
- **Voice Desktop Control panel** — 8 rows (open app, focus window, paste cleaned text, create file, run safe command, open URL, send to Claude, send to Cursor): all `DISABLED · planned · requires approval`. Will unlock with the secure-runtime work.
- **Voice wake-sound / clap detection**: `DISABLED · planned · local-only when shipped · off by default`. Always-on audio not implemented (and won't be without explicit consent).
- **Market Lab non-real chart tabs** (flow, news impact, correlation, sentiment, timeline) + stocks/FX/commodities watchlists + Polymarket + sector/vol/correlation/breadth maps + the breaking/economy/politics/earnings news chips: `DISABLED · planned · adapter-ready` (rendered with `HATCH` + low opacity).
- **Connector Hub / Cloud Sync / Enterprise Server / Mobile Companion roadmap** (Settings → Operator, ELITE badge): `DISABLED · planned`.
- **Media Dock AI Radio Mode**: `DISABLED · planned · Atlas narration` (no TTS implemented).
- **Agents page** / **Workflows page** install buttons: `DISABLED · planned` (planned blueprints; the planning surfaces are real but installation is future).
- **Mission Control follow-up** / Library run-follow-up / RepoImportBox missions: enabled but gated by `current` (a running mission) — that's a real runtime gate, not a planned label.

## Methodology + sources
- `grep '<button'` and `grep 'onClick'` per surface for the headline counts.
- `grep 'window\.open('` for external (MediaDock, CodeOperatorActions, NewsChannelMode, NewsLivePanel, Market Lab news, Library/Marketplace not external).
- `grep 'navigator.clipboard.writeText'` for COPY ONLY paths (Library replay copy, DeliveryCenter copy, DispatchPanel copy, Mission Control copy, Settings copy buttons, SetupWizard copy, OllamaSetupCard copy, TelegramLiveCard copy, CodeOperatorActions).
- `grep 'disabled'` per surface for the planned/gated counts shown above.
- Spot-read of each handler to confirm a real path (state mutation, store dispatch, navigation, clipboard, or external open).

## Fixes applied this sprint
- **Audit doc** (`BUTTON_AUDIT_REPORT.md`, this file) — the artifact you asked for.
- **Taxonomy locked** in `UX_REPAIR_NOTES.md` so every new button must pick a label and carry a `title`/aria-label.
- **No silent no-ops** — confirmed: 0 empty onClick handlers across the tree.
- The disabled-look improvements for adapter-ready Market Lab tiles + the Media Dock V2 button labels landed in the previous sprint and are consistent with this audit.

## Conclusion
**0 dead buttons.** All currently-disabled controls are intentionally locked with honest labels (planned / requires desktop / requires key / adapter-ready). The taxonomy is now the contract going forward: any new button without one of the six labels is a bug.
