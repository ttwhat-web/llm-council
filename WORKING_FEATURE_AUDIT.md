# Working Feature Audit · operator-next · hardening sprint

Method: read each surface, classify against project taxonomy, capture
the exact issue and the minimal fix needed.

## Server Command Center

### Profile rail

| Action / button       | File · line                          | Current behavior                                                  | Class           | Fix needed |
|-----------------------|--------------------------------------|-------------------------------------------------------------------|-----------------|------------|
| `add`                 | `ServerPage.tsx:382` (rail header)   | Opens add-profile dialog                                          | WORKS           | none       |
| profile click         | `ServerPage.tsx:411`                 | Sets active, audits `profile-activate`, auto-fires probe          | WORKS           | none       |
| hover trash           | `ServerPage.tsx:432`                 | Removes profile, clears active if needed, audits `profile-delete` | WORKS           | none       |
| Add Profile · save    | `ServerPage.tsx::AddProfileDialog`   | Validates name/host/user/port, normalizes allowlists, upserts     | WORKS           | none       |
| Add Profile · ssh key path | same                            | Stored as `sshKeyPath?` on profile                                | WORKS (local)   | none       |
| Add Profile · allowlist inputs | same                        | csv parsed + per-character validated `^[A-Za-z0-9._-]+$`          | WORKS           | none       |

### Status / services / logs / restart

| Action / button       | File · line                          | Current behavior                                                  | Class                | Fix needed |
|-----------------------|--------------------------------------|-------------------------------------------------------------------|----------------------|------------|
| status `refresh`      | `ServerPage.tsx::StatusCards`         | Calls `bridgeProbeStatus`; only the tiny header pill shows the error | BROKEN (silent error) | **show explicit inline error banner inside the panel** |
| services `refresh`    | `ServerPage.tsx::ServicesPanel`       | Calls `bridgeListPm2/Docker/Systemd` in parallel; aggregated error only in header pill | BROKEN (silent error) | **show explicit inline error banner with each adapter's error broken out** |
| logs `refresh`        | `ServerPage.tsx::LogsViewer`          | Picks first allowlisted name, fetches; error only in header pill  | BROKEN (silent error) | **inline error banner with the actual command line / error** |
| services `restart`    | `ServerPage.tsx::ServiceRow`          | Opens confirm modal, on confirm calls `bridgeRestart`; result audited only | BROKEN (silent result) | **show inline result line (success or actual error) on the row after the call** |
| services `deploy`     | `ServerPage.tsx::ServicesPanel`       | Permanently disabled; click logs `deploy-blocked`                 | DISABLED · planned   | none       |
| `clear` audit         | `ServerPage.tsx::AuditLogPanel`       | Clears audit; the clear itself is audited                         | WORKS                | none       |
| Confirm modal         | `ServerPage.tsx::ConfirmModal`        | ESC closes, click outside cancels, confirm fires action           | WORKS                | none       |

### Agent bridge

| Item                  | File · line                          | Current behavior                                                  | Class | Fix |
|-----------------------|--------------------------------------|-------------------------------------------------------------------|-------|-----|
| `isBridgeAvailable`   | `serverAgentBridge.ts`                | `window.__TAURI_IPC__` or `window.__TAURI__.invoke` present       | WORKS | none |
| `audited()` wrapper   | `serverAgentBridge.ts`                | Two audit rows per call (`before` and `after`); after always uses `result: blocked` on failure | BROKEN (semantic) | **use `error` for SSH / transport failures, `blocked` only for allowlist / agent-not-available** |
| `bridgeProbeStatus`   | `serverAgentBridge.ts`                | Calls Rust `server_probe_status`                                  | WORKS (depends on agent) | none |
| `bridgeListPm2/Docker/Systemd` | same                         | Calls Rust list endpoints                                         | WORKS (depends on agent) | none |
| `bridgeFetchLogs`     | same                                  | Sends `{ kind, name, tail }`                                      | WORKS (depends on agent) | none |
| `bridgeRestart`       | same                                  | Sends `{ kind, name }`                                            | WORKS (depends on agent) | none |

### Rust agent

| Item                  | File · line                          | Current behavior                                                  | Class | Fix |
|-----------------------|--------------------------------------|-------------------------------------------------------------------|-------|-----|
| `validate_profile`    | `src-tauri/src/server.rs`             | Rejects bad host/user/port                                        | WORKS | none |
| `valid_name`          | same                                  | `^[A-Za-z0-9._-]{1,64}$`                                          | WORKS | none |
| SSH flags             | same                                  | `BatchMode=yes · PasswordAuthentication=no · KbdInteractiveAuthentication=no · StrictHostKeyChecking=accept-new · ConnectTimeout=8` | WORKS | none |
| Per-kind allowlists   | same                                  | Checked before `logs` / `restart` (returns "not in allowlist")    | WORKS | none |
| Allowlist enforcement on `list-systemd` | same                | Iterates only `profile.allowed_systemd_services`                  | WORKS | none |

## Market Lab Pro

### Layout & header

| Item                  | File · line                          | Current behavior                                                  | Class | Fix |
|-----------------------|--------------------------------------|-------------------------------------------------------------------|-------|-----|
| CommandBar            | `MarketLabPage.tsx::CommandBar`       | symbol input · layout preset pill · cg/binance health             | WORKS | none |
| Layout preset switcher| same                                  | `1 · 1+4 · orderflow · macro · wall` · persisted v2               | WORKS | none |
| Watchlist             | `Watchlist.tsx`                       | 10 symbols · real CG quotes for crypto · `—` for the rest         | WORKS | none |
| News tape             | `NewsTape.tsx`                        | real `fetchNewsBest`                                              | WORKS | none |
| Macro strip           | `MacroStrip.tsx`                      | BTC/ETH 24h % real; BTC.D real (CoinGecko global); rest adapter   | WORKS / adapter-ready | none |

### Main chart (custom canvas engine)

| Item                  | File · line                          | Current behavior                                                  | Class | Fix |
|-----------------------|--------------------------------------|-------------------------------------------------------------------|-------|-----|
| Candles, volume       | `ChartCanvas.tsx`                     | Real Binance klines, redrawn on viewport/data change              | WORKS | none |
| Wheel zoom / drag pan | `useChartInteraction.ts`              | Wheel anchored at cursor; pointer drag; double-click resets       | WORKS | none |
| Keyboard +/- arrows R | same                                  | Only when chart is focused (tabIndex=0)                           | WORKS | none |
| Hover tooltip         | `ChartCanvas.tsx::TooltipBadge`       | OHLCV + time on hover                                             | WORKS | none |
| Interval pills        | `ChartCanvas.tsx`                     | 1m..1D                                                            | WORKS | none |
| Crosshair             | same                                  | Drawn on hover, with price label on right axis                    | WORKS | none |
| Error display         | same                                  | Error string sits in a small top-right corner only                | BROKEN (small) | **bigger inline error message inside the chart container when Binance fails** |
| Drawing tools         | n/a                                   | **Not implemented** anywhere                                       | not present (correct) | none — keep absent until real |

### Mini charts (1+4 preset)

| Item                  | File · line                          | Current behavior                                                  | Class | Fix |
|-----------------------|--------------------------------------|-------------------------------------------------------------------|-------|-----|
| MiniGrid              | `MarketLabPage.tsx:687`               | `grid-cols-2 lg:grid-cols-4` · single row on lg+ → **long strips** | BROKEN | **switch to `grid-cols-2 grid-rows-2` so each mini is a square tile** |
| Per-mini ChartSlot    | `ChartSlot.tsx`                       | Renders ChartCanvas with `compact={true}`, height 220             | WORKS | none |
| Symbol selector       | `ChartSlot.tsx`                       | Dropdown of `WATCHLIST_SYMBOLS`                                   | WORKS | none |

### Order flow panels

| Item                  | File · line                          | Current behavior                                                  | Class | Fix |
|-----------------------|--------------------------------------|-------------------------------------------------------------------|-------|-----|
| OrderBookPanel        | `OrderBookPanel.tsx`                  | Real Binance `/api/v3/depth`; spread bar; status pill in header   | WORKS | none |
| Time & Sales          | `TimeAndSalesPanel.tsx`               | Real `/api/v3/trades`; aggressor-colored                          | WORKS | none |
| Depth (cum. SVG)      | `DepthPanel.tsx`                      | Real `/api/v3/depth` limit 100                                    | WORKS | none |
| Flow imbalance        | `FlowImbalancePanel.tsx`              | Derived from depth + trades                                       | WORKS | none |
| Bookmap heatmap       | `LiquidityHeatmapPanel.tsx`           | Honest snapshot heatmap with pinned "adapter-ready" banner        | WORKS (banner is honest) | none |

### Script Lab

| Item                  | File · line                          | Current behavior                                                  | Class | Fix |
|-----------------------|--------------------------------------|-------------------------------------------------------------------|-------|-----|
| Editor                | `ScriptLabEditor.tsx`                 | Save/new/delete, Cmd/Ctrl+Enter to run                            | WORKS | none |
| Engine                | `services/scripts/engine.ts`          | Custom tokenizer + Pratt parser + tree-walking evaluator. NO eval | WORKS | none |
| Indicators            | `services/scripts/indicators.ts`      | SMA · EMA · Wilder RSI · Bollinger Bands                          | WORKS | none |
| Overlays sync         | `ChartCanvas.tsx`                     | Overlays are part of the canvas redraw cycle (same deps)          | WORKS | none |
| RSI lower pane        | `ChartCanvas.tsx`                     | Second canvas, lifecycle gated on `rsi != null`                   | WORKS | none |
| Error display         | `ScriptLabEditor.tsx::ResultLine`     | Inline error with line number                                     | WORKS | none |
| Buy/sell markers      | n/a                                   | Not emitted by engine (engine has no signal primitive)            | not present (correct) | keep absent |

## Fix list for this sprint

| # | Item                                                         | Files                                                     |
|---|--------------------------------------------------------------|-----------------------------------------------------------|
| 1 | Visible inline error banners on Server status/services/logs  | `modules/server/ServerPage.tsx`                           |
| 2 | Distinguish `error` vs `blocked` in audit `after` rows       | `services/serverAgentBridge.ts`                           |
| 3 | Mini chart strip → 2×2 tile grid                             | `modules/market-lab/MarketLabPage.tsx`                    |
| 4 | Show last restart result line on each service row            | `modules/server/ServerPage.tsx`                           |
| 5 | Show explicit "binance error" banner in main chart on failure| `components/market-lab/chart-engine/ChartCanvas.tsx`      |

Builds: both pass before / after the changes below.
