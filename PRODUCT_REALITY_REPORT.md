# Product Reality Report · operator-next

## 1. Buttons fixed / upgraded

* **Market Lab · price chart** (`PriceChartLW.tsx`, new). Replaces the
  custom SVG line that only used in-session samples with TradingView
  Lightweight Charts v5. Pulls real OHLC-class history from CoinGecko
  `/coins/{id}/market_chart` (1D / 7D / 1M / 3M / 1Y windows) and renders
  a line series + volume histogram. Time scale, crosshair, last-value
  label, fit-content on data change — standard terminal behavior.
* **Email Runtime Card · Open Gmail / Open Outlook** (`EmailRuntimeCard.tsx`).
  Open the official web app in the default browser. OAuth-required pill
  surfaced inline.
* **Communications Runtime Card · Open WhatsApp Web / Open Telegram Web**
  (`CommunicationsRuntimeCard.tsx`). Same pattern. Provider-auth pill
  surfaced inline. The Telegram bot bridge is unchanged and remains
  separately surfaced.
* **Atlas Cinema · Reset + mode debug chip** (`CinemaModeSwitch.tsx`).
  Already shipped in the previous recovery commit; carried forward.

## 2. Buttons disabled / honestly labelled

* **Chart Wall tabs** beyond `price` and `heatmap` continue to render the
  `adapter-ready` placeholder with no fake numbers (`MarketLabPage.tsx`).
* **Stocks / FX / Commodities tile rows** in the Market Lab keep showing
  symbol labels with no values — no fake equity / FX prices.
* **WhatsApp Twilio / Meta API** rows in CommunicationsRuntimeCard remain
  `planned · adapter ready` until real credentials are wired.
* **All Email adapter rows** (Gmail / IMAP / Outlook / Apple Mail) remain
  `not connected` with no counts.
* **Native speech mic** continues to refuse to listen until a real
  SpeechRecognition implementation is shipped via the desktop runtime
  (documented in `SPEECH_BRIDGE_PLAN.md`).
* **Trading order tickets** do not exist in the codebase. No buy / sell /
  place-order surfaces were ever rendered; we did not add them this sprint.

## 3. Real connectors added (Connector Dock V3)

`components/ConnectorDock.tsx` (new) mounted in `ShellLayout.tsx`
alongside MediaDock. Honest external launchers — no iframe attempts for
providers known to block, no scraping, no credentials touched.

| Connector | URL                          | Status pill        | Mechanism                |
|-----------|------------------------------|--------------------|--------------------------|
| Gmail     | mail.google.com              | `external`         | `window.open(..., _blank)` |
| Outlook   | outlook.live.com/mail/       | `external`         | `window.open(..., _blank)` |
| WhatsApp  | web.whatsapp.com             | `external`         | `window.open(..., _blank)` |
| Telegram  | web.telegram.org             | `external`         | `window.open(..., _blank)` |
| Custom    | user-supplied                | `external`         | `window.open(..., _blank)` + 8-item recents list (localStorage) |

The dock includes a launcher chip when collapsed, a "blocked by provider"
explanation in the footer, and a "clear recents" button. Recents persist
in `promptready-os.connector-dock.recents`. Open state persists in
`promptready-os.connector-dock.open`.

## 4. Connector limitations (honestly stated)

* Gmail / Outlook / WhatsApp / Telegram all send `X-Frame-Options: DENY`
  or strict CSP `frame-ancestors`. We never attempt to embed them — we
  open in the browser and say so on the tile.
* Tauri child-window API is not used in this sprint. The opener uses the
  default browser via `window.open`. A Tauri child window opener is a
  future, additive enhancement; nothing here blocks it.
* Recents are URL-only — we never store messages, subject lines, or
  any content from the external app.
* No PiP for connectors (only for the native audio path in MediaDock).

## 5. Market data: real vs adapter-ready

**Real, live, in this sprint:**
* CoinGecko price + 24h % + market cap via `useCryptoFeed`
  (`services/marketFeed.ts`).
* CoinGecko historical line + volume series via new `fetchCoinHistory`
  (added to `services/providers/coingecko.ts`) for BTC, ETH, SOL, BNB,
  XRP across 1D / 7D / 1M / 3M / 1Y.
* News feed (HN / NewsAPI fallback) via `fetchNewsBest`.
* Provider latency / status via `providerHealth` recorded on every
  CoinGecko call.

**Adapter-ready, honest:**
* OHLC candlesticks (lightweight-charts supports candles; we render
  line-only because CoinGecko does not return OHLC on the free
  endpoint — the chart wall footer says `CoinGecko · line (OHLC
  adapter-ready)`).
* Stocks (SPY / QQQ / AAPL / NVDA / MSFT / GOOG), FX, commodities,
  Polymarket odds, sector / risk / vol / correlation maps — all
  rendered without numbers, labeled clearly.
* Provider latency badge surfaces real CoinGecko round-trip ms (from
  `providerHealth.history`) — the chart's "fetched <time>" stamp also
  shows the last successful call.

## 6. Exact paths to test

1. `cd promptready-os && npm run dev` then open `http://localhost:5173/`.
2. **Atlas Cinema (default).** Verify orbits, HUD, inspector, mode switch,
   Reset button, mode debug chip. Press `B` to leave Cinema.
3. Click left rail → **Brain → Market Lab · MIC** (or visit `/market-lab`).
   * Click watchlist BTC / ETH / SOL. Chart repaints.
   * Click timeframe pills `1D / 7D / 1M / 3M / 1Y`. CoinGecko request
     fires; chart and "fetched <time>" stamp update.
   * Hover the chart — crosshair + last-value pill visible.
   * Click `heatmap` tab — real 24h % grid renders.
   * Click any non-real chart tab — adapter-ready placeholder appears
     with no numbers.
4. Floating **Connector Dock** (bottom-right, between Atlas Orb and
   Media Dock). Click `connect` → opens the dock.
   * Click Gmail / Outlook / WhatsApp / Telegram → opens external tab.
     "Recent" list grows; click any recent to re-launch.
   * Paste any URL into the input → opens external tab; auto-prefixes
     `https://` if missing.
   * Click `clear` to drop recents.
5. Left rail → **System → Settings**, scroll to the **Remote** section.
   * `EmailRuntimeCard` exposes **open gmail** / **open outlook** with
     an `oauth required` pill.
   * `CommunicationsRuntimeCard` exposes **open whatsapp web** /
     **open telegram web** with a `provider auth required` pill.
6. **Settings → end** → `ButtonAuditCard` continues to enumerate buttons
   with their taxonomy labels for verification.

## 7. Build results

```
$ cd promptready-os && npm run build
> tsc -b && vite build
✓ 1692 modules transformed.
dist/assets/index-*.css     55.51 kB │ gzip: 11.11 kB
dist/assets/index-*.js   1,173.38 kB │ gzip: 313.94 kB
✓ built in 10.29s
```

```
$ cd promptfixer-sidekick && npm run build
> next build
✓ Compiled successfully
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

Both clean. The promptready-os JS bundle grew ~180 KB (lightweight-charts).

## 8. Files touched (`git diff --stat`)

```
 PRODUCT_REALITY_REPORT.md                                     | new
 WORKING_FEATURE_AUDIT.md                                      | new
 promptready-os/package.json                                   | +1
 promptready-os/package-lock.json                              | (lightweight-charts only)
 promptready-os/src/components/ConnectorDock.tsx               | new (330 lines)
 promptready-os/src/components/CommunicationsRuntimeCard.tsx   | +50
 promptready-os/src/components/EmailRuntimeCard.tsx            | +50
 promptready-os/src/components/market-lab/PriceChartLW.tsx     | new (235 lines)
 promptready-os/src/layouts/ShellLayout.tsx                    | +6
 promptready-os/src/modules/market-lab/MarketLabPage.tsx       | -10 / +2
 promptready-os/src/services/providers/coingecko.ts            | +68
```

Package add: `lightweight-charts: ^5.2.0` — required by the new chart.
This is the only dependency added.

## 9. What is intentionally not done

* No new routes. No new stores. No new fantasy UI.
* No fake candles, no fake OHLC, no fake order book, no fake trading button.
* No webcam, no MediaPipe, no native speech (stubbed planned).
* No Tauri child-window opener (existing `window.open` works on web + Tauri).
* No Atlas rewrite, no new Cinema component.
* No package.json edits beyond the single `lightweight-charts` dependency
  required by the new chart component.
