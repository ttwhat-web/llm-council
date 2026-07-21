# KNOWN_CONNECTORS — Operator Core

Every external integration seam in the app. **Status truth:** `Provider
Diagnostics` (Settings → Intelligence) reads these live; this doc is the
static reference. Surfaces honor the six-label taxonomy.

Legend · **L = Live (browser + Tauri)** · **D = Tauri runtime** ·
**K = needs key** · **C = CORS-blocked from browser** · **P = planned · adapter design only**.

## Markets / on-chain
| Provider | Path | Status | Env key | Where used |
|---|---|---|---|---|
| CoinGecko | `services/providers/coingecko.ts` (browser fetch) | **L** | none (keyless) | Market Lab crypto · Live Wall · Broadcast Wall · Theater · marketSamples |
| Binance (public) | adapter only · keyless | adapter-ready (L candidate) | none | Market Lab crypto · not wired |
| TwelveData | `runtime_provider_fetch("twelvedata", …)` | **D · K** | `TWELVEDATA_API_KEY` | Markets / FX / commodities (when keyed) |
| FMP | `runtime_provider_fetch("fmp", …)` | **D · K** | `FMP_API_KEY` | Earnings |
| Etherscan | `runtime_provider_fetch("etherscan", …)` | **D · K** | `ETHERSCAN_API_KEY` | On-chain / gas |

## News
| Provider | Path | Status | Env key | Where used |
|---|---|---|---|---|
| Hacker News (Algolia) | `services/providers/news.ts` (browser fetch) | **L** | none | News Wire · News Room · News Channel · Theater |
| NewsAPI | `runtime_provider_fetch("newsapi", …)` via `fetchNewsBest` | **D · K** | `NEWSAPI_KEY` | News Room / Wire preferred when keyed; HN fallback |
| CryptoPanic | `runtime_provider_fetch("cryptopanic", …)` | **D** (often free) · **C** in browser | `CRYPTOPANIC_API_KEY` (optional) | Crypto news |

## Remote / messaging
| Provider | Path | Status | Env key | Where used |
|---|---|---|---|---|
| Telegram bot | `runtime_telegram_send` / `runtime_telegram_poll_once` (Tauri) + local simulator (browser) | **D · K** · simulator in browser | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALLOWED_CHAT_ID` | Telegram Live · Field Test · Comms Runtime |
| WhatsApp | adapter design only | **P** | n/a | Communications Runtime card |

## Email
| Provider | Path | Status | Env key | Where used |
|---|---|---|---|---|
| Gmail | adapter design (OAuth + History API + draft-only later) | **P** | n/a | Email Runtime · Communications |
| Outlook / Microsoft 365 | adapter design (Microsoft Graph + delta) | **P** | n/a | Email Runtime · Communications |
| IMAP | adapter design (host / port 993 TLS · app password) | **P** | n/a | Email Runtime |
| Apple Mail | adapter design (local desktop import) | **P** | n/a | Email Runtime |

## Voice
| Path | Status | Notes |
|---|---|---|
| Browser `SpeechRecognition` / `webkitSpeechRecognition` | **L** in browser preview; absent in macOS WKWebView | text mode is the universal fallback |
| Native macOS Speech bridge (`SFSpeechRecognizer` + `AVAudioEngine`) | **P** | roadmap in `SPEECH_BRIDGE_PLAN.md` |

## Engines
| Engine | Path | Status | Notes |
|---|---|---|---|
| Deterministic (local rules) | `services/missionRunner.ts` | **L** | always available, offline |
| Ollama (localhost:11434) | `probeOllama` + dispatch | **L** when running locally | shown in Model Lab / Ollama Setup |
| Claude / GPT / Gemini | BYOK · adapter-ready | **P** | we never store keys |

## Search
| Provider | Path | Status | Env key | Where used |
|---|---|---|---|---|
| Browser open fallback | `services/search.ts → openExternalSearch` | **L · OPEN EXTERNAL** | none | Search Runtime · command bar `search:` |
| Google Custom Search | adapter | **P · K** | `GOOGLE_CSE_KEY` | Search Runtime |
| SerpAPI | adapter | **P · K** | `SERPAPI_KEY` | Search Runtime |
| Brave Search API | adapter | **P · K** | `BRAVE_SEARCH_KEY` | Search Runtime |
| Tavily | adapter | **P · K** | `TAVILY_API_KEY` | Search Runtime |

## Media
| Source | Path | Status | Notes |
|---|---|---|---|
| YouTube | `youtube-nocookie` embed when user pastes a watch/embed URL · external search otherwise | **L** (embed) · **OPEN EXTERNAL** (search) | sandboxed iframe; no auto-content |
| Spotify | embed for `open.spotify.com/(track|playlist|album|episode|show)/<id>`; external search otherwise | **L** (embed) · **OPEN EXTERNAL** (search) | sandboxed iframe |
| Apple Music | embed for `music.apple.com/.../(album|playlist|song)/...`; external otherwise | **L** (embed) · **OPEN EXTERNAL** (search) | sandboxed iframe |
| Custom URL | open externally (or embed only if YT/Spotify/AM matches) | **L / OPEN EXTERNAL** | never autoplay; user-selected only |
| Native audio file (`.mp3/.m4a/.ogg/.opus/.wav/.aac`) | native `<video>` (handles audio too) · supports real PiP | **L** | requestPictureInPicture only on native media |

## Operator runtime (in-app · always live)
- Atlas runtime · Mission system · Brain · Delivery Center · Workflow store · Audit log · Replay v1+v2 lineage · Snapshots · Brain Passport · Marketplace installs · Provider Diagnostics · Connector Keys · Field Test Mode · Workspace Menu · Command Palette · Themes + backgrounds.

All adapter-ready (`P`) and CORS-blocked-in-browser (`C`) providers will move to **Live** once (a) the desktop runtime + env keys are set, or (b) the planned auth/OAuth pieces land.
