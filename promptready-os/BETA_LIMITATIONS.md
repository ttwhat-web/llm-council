# BETA_LIMITATIONS — Operator Core

What the beta does NOT do today. Each item is intentional and visible
inside the app — none of these are silent failures.

## Desktop packaging
- macOS **`.app` is the beta artifact**, unsigned and not notarized. Gatekeeper will warn — right-click → Open, or strip quarantine: `xattr -dr com.apple.quarantine "Operator Core.app"`.
- macOS **DMG** still fails at `bundle_dmg.sh` (Finder/AppleScript styling) — not required for beta. See `TAURI_BUILD_REPORT.md`.
- Windows / Linux installers — buildable from source; system deps required (MSVC + WebView2 on Windows, GTK3 + WebKit2GTK on Linux). Not published.
- No code signing, no notarization, no auto-update feed.

## Runtime / connectors
- **Native desktop voice** is **planned** (`SPEECH_BRIDGE_PLAN.md`). In the macOS `.app` the WKWebView lacks `SpeechRecognition`, so text mode is the supported path; the Voice Diagnostics card explicitly says so.
- **Telegram send/poll** works via the Tauri bridge when `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALLOWED_CHAT_ID` are in the process env. Browser preview shows simulator only (CORS blocks `api.telegram.org`).
- **GUI launches do not inherit shell env.** To pass connector env vars today, launch the `.app` binary from a terminal. A secure keychain store is planned.
- **Keyed providers** (TwelveData / FMP / NewsAPI / CryptoPanic / Etherscan) require env keys + the desktop runtime; the Provider Diagnostics + Connector Keys card show "set / not set".
- **Email** (Gmail / IMAP / Outlook / Apple Mail) and **WhatsApp** are **adapter design only** — no OAuth, no sync, no send.
- **Search APIs** (Google CSE / SerpAPI / Brave / Tavily) are adapter-ready; the working fallback is opening an external browser search.

## Surfaces
- **Market Lab**: only crypto (CoinGecko) + news (HN / NewsAPI when keyed) are live. Stocks / FX / commodities / Polymarket / sector / volatility / correlation / breadth maps are all `adapter-ready` and rendered with `HATCH` + low opacity.
- **Voice Desktop Control** (8 actions: open app, focus window, paste cleaned text, create file, run safe command, open URL, send to Claude, send to Cursor) — all `DISABLED · planned · requires approval`. No shell / filesystem writes.
- **Voice wake-sound / clap detection** — `DISABLED · planned · local-only when shipped · off by default`.
- **Agents / Workflows** install — `DISABLED · planned · Not installable yet`.
- **AI Radio Mode** (Media Dock) — `DISABLED · planned`.
- **Density toggle** (Workspace) — persists `body[data-density]` for future CSS hooks; only future styles consume it today.

## Honesty / non-features
- No fake prices, odds, headlines, transcripts, confidence, or "connected" states anywhere.
- Media Dock plays only what the operator pastes/clicks; no autoplay; no proprietary feeds; no Bloomberg branding or trade dress.
- No telemetry by default. No background mic. No automatic desktop control.

## What still prevents v1.0 public
1. Signing + notarization of the macOS `.dmg`/installer.
2. Updater feed.
3. (Optional) Windows MSI + Linux artifacts on a CI host with signing.

The beta is testable and shippable for a closed audience via the unsigned `.app`. The list above is what's labeled in-app and what testers should expect to see "planned / adapter-ready" against.
