# Working Feature Audit · operator-next

Audit method: read each surface's primary action buttons, classify against the
project taxonomy (WORKS · COPY ONLY · OPEN EXTERNAL · REQUIRES KEY ·
REQUIRES DESKTOP · DISABLED · planned), and verify by file inspection.
Every row below has been read directly from source.

Tooltip discipline: every WORKS / OPEN EXTERNAL button on the surfaces below
already carries a `title=...` attribute that ends with one of the taxonomy
labels — verified by `grep "title=.*WORKS\\|title=.*OPEN EXTERNAL"` across
`promptready-os/src/components` and `promptready-os/src/modules`.

## Atlas (Cinema scene)

| Label             | File                                         | Behavior                                                          | Status |
|-------------------|----------------------------------------------|-------------------------------------------------------------------|--------|
| Cinema (header)   | `modules/atlas/AtlasPage.tsx:251-258`        | Persists `cinema` to localStorage canvas key                      | WORKS  |
| C key             | `components/atlas-cinema/AtlasCinema.tsx:57` | Same as above                                                     | WORKS  |
| Orbit node click  | `components/atlas-cinema/CinemaOrbit.tsx:85` | Selects orbit · opens inspector                                   | WORKS  |
| Inspector · Focus | `CinemaInspector.tsx`                        | Dispatches `cinema:focus` event                                   | WORKS  |
| Inspector · Open in Blueprint | `CinemaInspector.tsx`            | Switches canvas mode to blueprint                                 | WORKS  |
| Inspector · Create mission | `CinemaInspector.tsx`               | Calls `useMissionStore.getState().dispatch(...)` (only when type ∈ MISSION_TARGETS and no current mission) | WORKS / DISABLED |
| Mode switch (G/B/O/L) | `CinemaModeSwitch.tsx`                   | Switches canvas mode                                              | WORKS  |
| Reset (mode switch) | `CinemaModeSwitch.tsx` (this sprint)       | Clears `promptready-os.atlas.canvas` localStorage key, returns to cinema | WORKS |
| Presentation toggle | `CinemaHud.tsx`                            | Toggles HUD chrome hide                                           | WORKS  |
| Mode debug chip   | `CinemaModeSwitch.tsx`                       | Shows current mode value (debug)                                  | WORKS (display only) |

## Atlas (Blueprint / Operations / Live)

| Label             | File                                         | Behavior                                                          | Status |
|-------------------|----------------------------------------------|-------------------------------------------------------------------|--------|
| Section card click | `AtlasPage.tsx::SectionCard`                | Selects section, opens DetailPanel                                | WORKS  |
| Export Blueprint  | `AtlasPage.tsx:265 (onExport)`               | Serializes atlas to markdown and triggers download                | WORKS  |
| Zoom + / −        | `AtlasPage.tsx::ZoomControls`                | Adjusts CSS transform on the grid                                 | WORKS  |
| HomeModeToggle    | `AtlasPage.tsx::HomeModeToggle`              | Toggle blueprint / operations / live                              | WORKS  |
| DispatchPanel · run | `panels/DispatchPanel.tsx`                 | Calls mission store dispatch                                      | WORKS (when missions empty otherwise) |

## Market Lab (Market Intelligence Center)

| Label             | File                                         | Behavior                                                          | Status |
|-------------------|----------------------------------------------|-------------------------------------------------------------------|--------|
| Watchlist click   | `MarketLabPage.tsx::Watchlists`              | Selects symbol; chart updates                                     | WORKS  |
| **Timeframe pills (1D · 7D · 1M · 3M · 1Y)** | `components/market-lab/PriceChartLW.tsx` (new) | Fetches CoinGecko `/coins/{id}/market_chart`, repaints chart      | WORKS  |
| Tab: price        | `MarketLabPage.tsx::ChartWall`               | Renders TradingView Lightweight Charts line + volume histogram    | WORKS  |
| Tab: heatmap      | `MarketLabPage.tsx::CryptoHeatmap`           | Renders real 24h % per crypto                                     | WORKS  |
| Tab: flow / news impact / correlation / sentiment / timeline | `MarketLabPage.tsx::ChartWall` | Honest "adapter-ready" placeholders — no fake data                | DISABLED · planned |
| Mini-chart (BTC/ETH/SOL/BNB/XRP) | `MarketLabPage.tsx::MiniChart` | Renders sparklines from real `marketSamples`                      | WORKS  |
| Stack 1x/2x/4x/6x | `MarketLabPage.tsx::ChartWall`               | Layout grid change                                                | WORKS  |
| Fullscreen / TV   | `MarketLabPage.tsx::ChartWall`               | Inline fullscreen toggle                                          | WORKS  |
| TV market mode    | `MarketLabPage.tsx::TopBar`                  | Renders `TvWall` (separate wall layout)                           | WORKS  |
| News chips        | `MarketLabPage.tsx::NewsRoom`                | Real fetch for AI / crypto / markets / tech / business via `fetchNewsBest`; rest are honest "adapter-ready" | WORKS · DISABLED |
| News item · Open  | `NewsRoom`                                   | window.open                                                       | OPEN EXTERNAL |
| News item · Brief mission | `NewsRoom · onCreateMission`         | Dispatches a mission to brief the headline                        | WORKS |
| News item · Save to Brain | `NewsRoom · onSaveToBrain`           | Adds memory doc                                                   | WORKS |
| Stocks / FX / Commodities tiles | `MarketLabPage.tsx`            | Show symbol labels only — NO numbers, NO fake prices              | DISABLED · planned (adapter-ready) |
| Trading order tickets | (none)                                   | **No trading buttons exist** — no buy/sell/place-order anywhere   | not present (deliberate) |

## Intelligence Terminal

| Label             | File                                         | Behavior                                                          | Status |
|-------------------|----------------------------------------------|-------------------------------------------------------------------|--------|
| Council models    | `IntelligenceTerminalPage.tsx`               | Sends prompt to councilSweep, renders responses + judge synthesis | WORKS  |
| Provider chips    | `IntelligenceTerminalPage.tsx`               | Reflect real adapter status (ok / error / muted)                  | WORKS  |

## Voice Console

| Label             | File                                         | Behavior                                                          | Status |
|-------------------|----------------------------------------------|-------------------------------------------------------------------|--------|
| Text command      | `modules/voice/VoiceConsolePage.tsx`         | Parses + executes via `commandParser`                             | WORKS  |
| Paste cleaner     | `modules/voice/TestConsole.tsx`              | Runs `pasteClean` on input                                        | WORKS  |
| Test console      | `modules/voice/TestConsole.tsx`              | Visible · runs locally                                            | WORKS  |
| Native speech (Push-to-talk) | `modules/voice/useSpeech.ts`      | macOS WKWebView lacks SpeechRecognition; shows planned message    | DISABLED · planned (REQUIRES DESKTOP) |
| Mic enable        | `useSpeech.ts`                               | Hold-to-record posture only; never auto-listens                   | DISABLED (no SpeechRecognition support) |

## Media Dock (floating, bottom-right)

| Label             | File                                         | Behavior                                                          | Status |
|-------------------|----------------------------------------------|-------------------------------------------------------------------|--------|
| Open / Close      | `components/MediaDock.tsx`                   | Toggle floating panel                                             | WORKS  |
| Size mini/medium/large | `MediaDock.tsx`                         | Resize panel                                                      | WORKS  |
| Tabs YT/Spotify/Apple/Custom | `MediaDock.tsx`                   | Switch search target                                              | WORKS  |
| Mode chips        | `MediaDock.tsx`                              | Preselect tab + suggested presets                                 | WORKS  |
| Search (YT/Spotify/Apple) | `MediaDock.tsx::openExternalSearch`  | Opens provider search URL in new tab                              | OPEN EXTERNAL |
| Load custom URL   | `MediaDock.tsx::loadFromInput`               | Embeds YT/Spotify/Apple if recognized; else falls back            | WORKS (when allowed) |
| Open external (custom) | `MediaDock.tsx::openExternalUrl`        | window.open                                                       | OPEN EXTERNAL |
| Picture-in-Picture | `MediaDock.tsx::enterPip`                   | Only available for native `<audio>` path; iframes can't PiP       | WORKS / honestly disabled |
| Market TV         | `MediaDock.tsx` mode chip                    | Label only — no live TV stream                                    | LABEL ONLY |

## Connector Dock (new this sprint, floating)

| Label             | File                                         | Behavior                                                          | Status |
|-------------------|----------------------------------------------|-------------------------------------------------------------------|--------|
| Open / Close      | `components/ConnectorDock.tsx`               | Toggle floating panel                                             | WORKS  |
| Gmail             | `ConnectorDock.tsx`                          | Opens `https://mail.google.com` in new tab                        | OPEN EXTERNAL |
| Outlook           | `ConnectorDock.tsx`                          | Opens `https://outlook.live.com/mail/` in new tab                 | OPEN EXTERNAL |
| WhatsApp          | `ConnectorDock.tsx`                          | Opens `https://web.whatsapp.com` in new tab                       | OPEN EXTERNAL |
| Telegram          | `ConnectorDock.tsx`                          | Opens `https://web.telegram.org` in new tab                       | OPEN EXTERNAL |
| Custom URL        | `ConnectorDock.tsx::onSubmitCustom`          | Opens normalized URL in new tab; records in recents (max 8)       | OPEN EXTERNAL |
| Clear recents     | `ConnectorDock.tsx::clearRecents`            | Clears localStorage `connector-dock.recents`                      | WORKS  |
| Recent link click | `ConnectorDock.tsx`                          | Reopens recent URL                                                | OPEN EXTERNAL |

## Settings · Workspace / Plans / Personalization

| Label             | File                                         | Behavior                                                          | Status |
|-------------------|----------------------------------------------|-------------------------------------------------------------------|--------|
| Workspace switch  | `components/WorkspaceMenuCard.tsx`           | Persists workspace defaults                                       | WORKS  |
| Plans CORE/DESK/ELITE | `components/PlansCard.tsx`               | Local selector; no Stripe wired                                   | WORKS (local) |
| Theme switcher    | `components/ThemeSwitcher.tsx` (in header)   | Persists theme to localStorage                                    | WORKS  |
| Backgrounds       | `components/PersonalizationCard.tsx` etc.    | Sets `body[data-bg]`                                              | WORKS  |
| OllamaSetupCard   | `components/OllamaSetupCard.tsx`             | Detects local Ollama via `probeOllama`                            | WORKS (when Ollama present) |
| Button Audit      | `components/ButtonAuditCard.tsx`             | Scans rendered buttons for taxonomy labels                        | WORKS  |

## Settings · Remote (Comms / Phone / Telegram / Email)

| Label             | File                                         | Behavior                                                          | Status |
|-------------------|----------------------------------------------|-------------------------------------------------------------------|--------|
| **Open Gmail (new this sprint)** | `components/EmailRuntimeCard.tsx` | Launches mail.google.com                                          | OPEN EXTERNAL |
| **Open Outlook (new this sprint)** | `components/EmailRuntimeCard.tsx` | Launches outlook.live.com                                        | OPEN EXTERNAL |
| Collapse / Expand | `EmailRuntimeCard.tsx`                       | Persists section state                                            | WORKS  |
| **Open WhatsApp Web (new this sprint)** | `components/CommunicationsRuntimeCard.tsx` | Launches web.whatsapp.com                              | OPEN EXTERNAL |
| **Open Telegram Web (new this sprint)** | `components/CommunicationsRuntimeCard.tsx` | Launches web.telegram.org                              | OPEN EXTERNAL |
| Telegram link code | `SettingsPage.tsx::TelegramCompanionCard`   | Generates / clears local link code in atlas store                 | WORKS  |
| Telegram bridge sim | `SettingsPage.tsx` Phase 18                | Local command console echoes bridge messages                      | WORKS (local) |

## Marketplace

| Label             | File                                         | Behavior                                                          | Status |
|-------------------|----------------------------------------------|-------------------------------------------------------------------|--------|
| Install agent     | `modules/marketplace/MarketplacePage.tsx`    | Local install · adds to agents store                              | WORKS  |
| Open external (creator URL) | `MarketplacePage.tsx`              | window.open                                                       | OPEN EXTERNAL |

## Workflows

| Label             | File                                         | Behavior                                                          | Status |
|-------------------|----------------------------------------------|-------------------------------------------------------------------|--------|
| Run workflow      | `modules/workflows/WorkflowsPage.tsx`        | Dispatches via `workflowRunner`                                   | WORKS  |
| Approve / Reject  | `WorkflowsPage.tsx`                          | Updates atlas store `workflowRuns`                                | WORKS  |

## Agents

| Label             | File                                         | Behavior                                                          | Status |
|-------------------|----------------------------------------------|-------------------------------------------------------------------|--------|
| Run agent         | `modules/agents/AgentsPage.tsx`              | Calls `agentRuntime`                                              | WORKS  |
| Toggle enabled    | `AgentsPage.tsx`                             | Updates agents store                                              | WORKS  |

## Summary

* No fake trading order tickets exist (never added).
* No fake inbox / message data exists on any surface.
* External openers always use `window.open(..., "_blank", "noopener,noreferrer")`.
* Embedding is only attempted for media providers (YouTube, Spotify, Apple Music)
  that explicitly allow it via official embed endpoints. Gmail / Outlook /
  WhatsApp / Telegram are not iframed — they open in the user's browser, with
  an honest pill saying so.
* Every button reviewed carries a `title` attribute that matches the project
  taxonomy and is also surfaced in the Settings → Button Audit card.

Patches in this sprint:
* lightweight-charts terminal chart (PriceChartLW.tsx) with real CoinGecko line + volume.
* ConnectorDock global mount.
* Open-Gmail / Open-Outlook on EmailRuntimeCard.
* Open-WhatsApp-Web / Open-Telegram-Web on CommunicationsRuntimeCard.

Build · `promptready-os`: 1692 modules, CSS 55.51 kB, JS 1173.38 kB. Clean.
Build · `promptfixer-sidekick`: clean.
