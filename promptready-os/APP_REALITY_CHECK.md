# Operator.Center — App Reality Check

_Sprint C · Provider Wiring. This document is honest about what is real,
what is adapter-ready, and what still needs keys or the desktop runtime.
Nothing here claims a connection that has not been verified by a real
call._

## Status legend

- **REAL** — works today, locally, no external dependency.
- **WITH OLLAMA** — works once a local Ollama instance is running.
- **WITH TOKEN** — works once a Telegram bot token + chat id are configured.
- **LIVE PUBLIC** — real public data, no key, CORS-friendly (works in browser + Tauri).
- **NEEDS KEY** — adapter seam exists; requires a provider API key.
- **NEEDS RUNTIME** — blocked by browser CORS; needs the Tauri runtime or a server proxy.

---

## What works without keys (REAL)

- Atlas runtime, Mission runtime, Delivery Center, Brain layer.
- Marketplace **Operator Brain Installer** — installs real workflows,
  templates, watchlists (terminal pins), repo sources, and **brain notes**
  (memory docs) into the local stores.
- Runtime Bus, Team Spaces, Audit log, Replay v1.
- Presence v2 (desktop/ollama/workflow/memory/agents/telegram/email/markets/news rollups).
- Themes (13) + backgrounds (7).
- Setup Guide v2 (10 auto-detected steps).
- Cost Runtime v2 (Claude/GPT/Gemini/Ollama/Local; cloud spend $0, cloud-avoided estimate from real receipts).
- Provider Diagnostics table.
- Intelligence Terminal layout (Markets/Research/Signals/Operator) + Operator group real local state.

## What works with local Ollama (WITH OLLAMA)

- Model Lab: probes `/api/tags`, lists installed models, per-missing-model
  `ollama pull <tag>` copy helper, Run test mission per model, Save result.
- Presence "ollama" flips to ready only after a successful probe.
- Mission engine can route to Ollama; latency shown in Model Lab is read
  from real receipts only (no synthetic benchmarks).

## What works with a Telegram token (WITH TOKEN)

- `telegramLive.ts` send + poll, shield gates, `/status`.
- Telegram **Field test checklist** (7 steps) shows real per-step status:
  token present, chat id present, send succeeded, poll succeeded — driven
  by `getTelegramBridgeStatus()`. Steps 5–7 (`/status` return, receipt push,
  approval command) are operator-verified field tests, marked "manual" until
  a real signal exists. No fake passes.
- Telegram API has no browser CORS → **NEEDS RUNTIME** (Tauri/server) to send.

## What now has real public data (LIVE PUBLIC)

- **CoinGecko crypto** (`services/providers/coingecko.ts`): BTC/ETH/SOL/BNB/XRP
  price, 24h change, market cap. Public, no key, CORS-friendly. Mounted in
  Intelligence Terminal → Markets → Crypto. Adapter registry flips to
  "connected" only after a verified fetch; "error" on failure/rate-limit.
- **Hacker News news** (`services/providers/news.ts`): real story headlines
  via the public Algolia search API (AI / Markets / Crypto / Tech). Public,
  no key, CORS-friendly. Mounted in Intelligence Terminal → Research → News Feed.

Both record success/error in `providerHealth.ts`, which drives the registry
status and Presence "markets"/"news" rollups. **No fake prices, no fake headlines.**

## What still needs provider keys (NEEDS KEY)

- TwelveData (stocks/indices/FX/commodities), FMP (earnings), NewsAPI,
  CryptoPanic, Etherscan (whale/on-chain). Seams are registered in
  `services/adapters.ts`; supply `VITE_*` keys or runtime config to move
  them from "offline" → "adapter ready", then a verified call → "connected".

## What still needs the Tauri runtime (NEEDS RUNTIME)

- Telegram send/poll (CORS).
- NewsAPI, CryptoPanic (CORS on free tier).
- Gmail / IMAP / Outlook (OAuth + IMAP socket) — **design only** this sprint,
  documented in the Email Runtime card. No OAuth implemented.
- Signed installers, auto-update, keychain token storage.

## Desktop packaging (Sprint E2)

- macOS `.app`: **builds + opens** (verified, Apple Silicon, unsigned) at
  `src-tauri/target/release/bundle/macos/Operator Core.app`.
- macOS `.dmg`: **blocked** at `bundle_dmg.sh` Finder styling → use
  `npm run tauri:build:ci` (CI=true) to skip it and emit a plain DMG.
- Signing / notarization / updater: still missing.
- Linux: needs GTK/WebKit dev libs; Windows: MSVC + WebView2.

## What blocks launch

1. Signed + notarized installers (macOS `.dmg`/Windows MSI); `.app` works unsigned today.
2. Tauri runtime fetch path (CORS-free) + secure key storage for keyed/CORS providers.
3. Gmail/Outlook OAuth + IMAP server piece (design done, not built).
4. Mobile companion, Cloud sync, Connector Hub, Payments.

## What to test manually

| Provider | UI path | Expectation |
|---|---|---|
| Ollama | Settings → Intelligence → Model Lab | reachable models listed; pull helper copies command; Run test mission records latency |
| CoinGecko | Intelligence Terminal → Markets → Crypto | live prices + 24h change; "connected" after fetch; "error" if rate-limited/CORS |
| Hacker News | Intelligence Terminal → Research → News Feed | real headlines per category; "error" on failure |
| Telegram | Settings → Remote → Telegram Live → Field test | steps reflect real token/chat/send/poll state |
| Diagnostics | Settings → Intelligence → Provider Diagnostics | per-provider status, last success/error, key/CORS/runtime facts |
| Presence | Atlas HUD strip | markets/news flip to connected only after a successful terminal fetch |

> Browser preview note: CoinGecko + Hacker News work in-browser (CORS-friendly).
> Telegram/NewsAPI/CryptoPanic/Gmail/IMAP/Outlook will show offline/error in the
> browser and require the Tauri runtime — this is expected and honest.
