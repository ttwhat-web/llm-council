# Broken Flow Audit - Operator.Center

Date: 2026-05-30
Branch: operator-next
Scope: promptready-os Market Lab, Server, shell nav, Connector Dock, Media Dock.

## Verification Notes

- Dev command requested: `npm run dev -- --host 127.0.0.1 -p 1420`
- Result: failed because this Vite CLI rejects `-p`.
- Working dev command: `npm run dev -- --host 127.0.0.1 --port 1420`
- Served routes checked over the dev server: `/`, `/market-lab`, `/server`, `/atlas`, `/settings` all returned HTTP 200.
- Browser automation was attempted with installed Chrome, Firefox, Safari WebDriver, and temporary Playwright Chromium/WebKit/Firefox. All browser engines abort inside the macOS sandbox before a page can be created. Chromium fails at Mach port registration: `bootstrap_check_in ... Permission denied (1100)`.
- No Safari/Tauri stale build was confirmed from this environment. Market Lab layout storage was moved to a new key so stale localStorage layouts reset to the dominant-chart default.

## Page Audit

| Page | Route loads | Visible errors | Buttons / controls | Blank or adapter panels | Data source used | Real today | Adapter-ready | UX severity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Atlas home | Yes | None found from route/source pass | Nav and Atlas controls remain mounted; old Atlas not rewritten | Existing Atlas fallback surfaces remain | Local stores, Atlas modules | Existing Atlas views | Runtime/live integrations | 2 |
| Market Lab | Yes | Provider failures now render inline; chart/order-flow panels already expose fetch errors inline | Symbol open, layout presets, watchlist, chart symbol menus, intervals, news chips, mission/save, Script Lab controls are wired or disabled with reason | Non-Binance symbols show no-source cells; non-live news categories show adapter-ready | CoinGecko, Binance public REST, news fetcher, localStorage scripts | Crypto quotes, Binance candles/order book/trades/depth snapshots, local script engine | Equities, FX, commodities, sentiment, correlation, model analysis | 3 before / 2 after |
| Server | Yes | Browser/Tauri bridge failures render inline after refresh/probe | Add profile works locally; refresh/probe/services/logs/restart route through the bridge and show desktop-required errors in browser; deploy is disabled as planned | Empty profile state, service inventory, logs, alerts are compact and honest | localStorage profiles/audit, Tauri server agent bridge | Profile storage, audit log, allowlist UI | SSH probe/services/logs/restart in browser; live server metrics require desktop app bridge | 3 before / 2 after |
| Settings | Yes | None found from route/source pass | Existing settings controls remain mounted | Adapter/runtime settings show existing readiness states | localStorage, runtime bridge where available | Workspace/default-home settings | Desktop-only runtime signals in browser | 2 |
| Connector Dock | Mounted globally | No provider errors hidden; providers are external openers | Open/close, provider tiles, custom URL, recent links and clear are wired; blank input disables open | No iframe embedding; footer states provider iframe block | Official external URLs, localStorage recents | External opening and recents | OAuth/API read adapters | 2 |
| Media Dock | Mounted globally | Embed failures degrade to external link path; no fake live stream | Open/close, source tabs, modes, search/load, presets, stop/clear are wired; empty input disables actions; PiP unavailable appears disabled | Empty player state is explicit; Market TV says label only | User-provided URLs, public embed URLs, localStorage | User-loaded embeds/audio/external opening | AI Radio narration | 2 |
| Nav/sidebar | Yes | None found | Route links work; active state visible; hidden-nav settings preserve routes | None | React Router, workspace localStorage | Navigation and active route | None | 2 |
| Startup page | Yes | Potential user-localStorage redirect by design | `/` defaults to Atlas unless `promptready-os.ui.workspace.defaultHome` is changed | None | workspace localStorage | Atlas default route | User-chosen default-home redirects | 1 |

## Focus Findings

### Market Lab

- Chart area was too easy to miss when old localStorage opened `1+4` or denser layouts. Fixed by resetting the layout storage key and defaulting to a single dominant chart.
- Mini charts are present as real 2x2 tiles in `1 + 4`; they are not single-line strips.
- Provider status was too compressed. Fixed with explicit Binance, CoinGecko, and News status chips plus an inline provider error strip.
- Depth/heatmap were not visible in the default right rail. Fixed by making the right rail pure order flow: order book, time & sales, cumulative depth, liquidity heatmap.
- Script Lab worked but read like a generic textarea. Tightened into a bottom workstation drawer with visible run/save/delete state and disabled reasons.
- AAPL and other unsupported symbols now remain honest no-source states through the main chart and order-flow rail.

### Server

- Browser refresh/probe flows correctly route through the Tauri bridge and report `agent not available - run in desktop app`.
- Profile creation is real localStorage state; no password field exists.
- Services/logs/restart remain bridge-dependent and cannot run in browser. They now surface the desktop requirement inline through the bridge result instead of relying on console output.
- Server bridge detection now uses the shared Tauri runtime bridge instead of a manual window probe.

### Docks

- Connector Dock is an external opener, not a fake embedded inbox.
- Media Dock is user-loaded only. Market TV is label-only; no stream is fabricated.
- Remaining adapter-ready items are visible as disabled or explanatory states.
