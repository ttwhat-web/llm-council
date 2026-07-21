# Broken Button Audit

Scope: `/market-lab`, `/server`, App Dock / `/apps`, Shell nav, ConnectorDock, and Settings workspace/integration controls.

| page | button | before | after | status |
| --- | --- | --- | --- | --- |
| Shell | Market Lab nav | Buried inside grouped Brain rail; active state competed with many legacy routes. | Primary rail item opens `/market-lab`; active state is clear. | works |
| Shell | Server nav | Buried inside grouped Operator rail. | Primary rail item opens `/server`; active state is clear. | works |
| Shell | Apps nav | No `/apps` route. | Primary rail item opens `/apps`. | works |
| Shell | Atlas nav | Home existed but direct `/atlas` was not primary. | Primary rail item opens `/atlas`; `/` still starts at Atlas unless user default overrides it. | works |
| Shell | Settings nav | Existed in grouped System rail. | Primary rail item opens `/settings`. | works |
| Shell | Floating media button | Opened a TV/radio/music-style media player with embed paths and gimmick modes. | Opens App Dock launcher. | works |
| ConnectorDock | Floating connect button | Duplicated Gmail/WhatsApp/Telegram launchers while MediaDock also floated. | Removed from shell; App Dock supersedes it. Component file kept for old-system compatibility. | intentionally hidden |
| App Dock | Open Gmail | Previously split across ConnectorDock and MediaDock concepts. | Opens `https://mail.google.com` in an external tab/window and records recent app. | works |
| App Dock | Open WhatsApp Web | Previously split across ConnectorDock and MediaDock concepts. | Opens `https://web.whatsapp.com` externally and records recent app. | works |
| App Dock | Open Telegram Web | Previously split across ConnectorDock and MediaDock concepts. | Opens `https://web.telegram.org` externally and records recent app. | works |
| App Dock | Open YouTube | Previously part of tiny media-player surface. | Opens `https://www.youtube.com` externally; no embedded player. | works |
| App Dock | Open TradingView | Not available as a clear app launcher. | Opens `https://www.tradingview.com/chart/` externally. | works |
| App Dock | Add custom web app URL | Custom media URL tried to load/embed media. | Normalizes http/https URL, opens externally, and records recent app. Empty input disabled with reason. | works / disabled when empty |
| App Dock | Clear recent apps | Not part of MediaDock; ConnectorDock had separate recents. | Clears App Dock recents. Disabled with reason when there are no recents. | works / disabled when empty |
| `/apps` | Web app launchers | Route did not exist. | Route hosts the same App Dock launcher UI with integration posture notes. | works |
| `/market-lab` | Open symbol | Worked, but non-source states were easy to miss. | Opens typed symbol; non-Binance assets show no-source/provider status instead of broken flow. | works |
| `/market-lab` | Layout presets | Several panels could make the page feel cramped. | Default is one dominant chart; layout presets are explicit and persist. | works |
| `/market-lab` | Chart interval buttons | Present inside chart engine. | Each interval switches Binance candles and reports fetch errors inline. | works |
| `/market-lab` | Chart symbol dropdown | Present inside chart slot. | Opens symbol menu; unsupported symbols are labeled adapter/no-source. | works |
| `/market-lab` | Watchlist BTC/ETH/SOL | Worked but chart was visually crowded. | Selecting crypto updates chart, order book, trades, depth, and script candle source. | works |
| `/market-lab` | Watchlist AAPL/stocks | Could imply missing data was broken. | Selects symbol and shows no Binance pair/no-source state honestly. | works with no-source state |
| `/market-lab` | News category chips | Adapter-ready categories could look like live filters. | Live categories load news; adapter categories are labeled adapter-ready. | works / honest adapter |
| `/market-lab` | Create mission | Could be clicked while mission already running. | Disabled by `NewsAction` when busy with inline disabled reason in title/aria. | works / disabled when busy |
| `/market-lab` | Save to brain | Saves headline to local Atlas memory. | Still works; no fake external sync. | works |
| `/market-lab` | Script Lab collapse/expand | Editor could dominate screen. | Collapsible bottom drawer persists open state. | works |
| `/market-lab` | Script Lab save/new/delete | Built-in delete could look possible. | Save/new work; built-in delete is disabled with reason. | works / disabled for built-ins |
| `/market-lab` | Script Lab run | Could fail unclearly without candles. | Runs on Binance candle data; disabled with reason for no-candle/no-source symbols. | works / disabled without candles |
| `/server` | Add profile | Worked for local profile creation. | Still works; dialog states no password storage and SSH key-only posture. | works |
| `/server` | Edit profile | Missing. | Visible edit button opens prefilled dialog and saves over existing profile. | works |
| `/server` | Delete profile | Hidden until hover and easy to miss. | Visible delete button removes local profile and records audit. | works |
| `/server` | Activate profile | Worked. | Still works and records audit. | works |
| `/server` | Refresh status | In browser, could call bridge and feel broken. | Disabled unless Tauri SSH bridge is ready; inline desktop-required explanation shown. | intentionally disabled in browser |
| `/server` | Refresh services | In browser, could call bridge and feel broken. | Disabled unless Tauri SSH bridge is ready; inline desktop-required explanation shown. | intentionally disabled in browser |
| `/server` | Refresh logs | In browser, could call bridge and feel broken. | Disabled unless Tauri SSH bridge is ready; inline desktop-required explanation shown. | intentionally disabled in browser |
| `/server` | Restart service | Could appear executable without bridge clarity. | Disabled unless service data exists and Tauri SSH bridge is ready; confirm modal remains allowlist-only. | intentionally disabled in browser |
| `/server` | Deploy | Disabled but copy said audited despite disabled click not firing. | Remains disabled with honest "deployment is not implemented" reason. | intentionally disabled |
| `/server` | Clear audit log | Worked. | Still works; audit table remains readable. | works |
| Settings | Workspace nav visibility | Listed many legacy rail items that no longer matched requested primary nav. | Lists only Market Lab, Server, Apps, Atlas, Settings. | works |
| Settings | Default home picker | Offered old primary surfaces like Voice/Terminal. | Offers primary surfaces: Atlas, Market Lab, Server, Apps, Settings; stale stored values are sanitized. | works |
| Settings | Theme/appearance controls | Existing controls worked. | No behavior change; kept as existing working settings surface. | works |
| Settings | Provider key show/hide | Existing session-only key field toggles worked. | No behavior change; still session-only and no persistence promise. | works |

Notes:
- Gmail, WhatsApp Web, Telegram Web, YouTube, and TradingView intentionally open externally. They are not iframed because providers block embedded login surfaces and this app must not proxy credentials.
- Browser mode cannot run SSH. Server status, services, logs, and restart are intentionally disabled until the desktop/Tauri bridge is available.
