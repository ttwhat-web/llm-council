# UX Polish Audit · operator-next

Source-level inspection of the rendered DOM (CSS class trees) across:

```
modules/server/ServerPage.tsx
modules/market-lab/MarketLabPage.tsx
components/market-lab/panels/{TerminalPanel,EmptyAdapterPanel,ChartSlot,
                              PanelTabs,ProviderStateBadge}.tsx
components/market-lab/{OrderBookPanel,TimeAndSalesPanel,DepthPanel,
                       FlowImbalancePanel,LiquidityHeatmapPanel,
                       NewsTape,MacroStrip,Watchlist,AIAnalystPanel}.tsx
components/market-lab/chart-engine/ChartCanvas.tsx
```

## Top 20 visual / UX problems

| #  | Where                                  | Problem                                                                                       | Patch class    |
|----|----------------------------------------|-----------------------------------------------------------------------------------------------|----------------|
| 1  | TerminalPanel header                   | `gap-2` between title and status pill; sub-label sits on same baseline → cluttered            | spacing        |
| 2  | TerminalPanel borders                  | Three border tones in use across panels (`white/8 · white/10 · white/12`) · no rhythm         | normalization  |
| 3  | TerminalPanel body padding             | Mixed: `p-1.5`, `p-2`, `p-1 min-h-0` across consumers · no consistent gutter                  | normalization  |
| 4  | EmptyAdapterPanel                      | `p-3` + giant centered text · too much real estate for "no data yet"                          | density        |
| 5  | EmptyAdapterPanel inside profile rail  | `flex flex-1` stretches to fill the rail · 40% of viewport just for an empty hint             | layout         |
| 6  | Server stat tiles                      | Label `text-[8.5px]` then value `text-[15px]` · jumps too much · no minor scale tick          | hierarchy      |
| 7  | Audit log rows                         | `grid-cols-[68px_82px_1fr_60px]` · action column truncates long names · result column floats  | table          |
| 8  | Audit log monospacing                  | `font-mono text-[10px]` set on `<ul>` but not on each cell; column alignment drifts           | table          |
| 9  | OrderBookPanel rows                    | Bid / ask price column is left-aligned · spread row not visually centered between halves     | alignment      |
| 10 | Time & Sales rows                      | All rows the same background · hard to scan 16 prints quickly                                 | readability    |
| 11 | Watchlist row separators               | Inactive rows: `border border-transparent` · no visible row rhythm                            | separators     |
| 12 | ChartSlot title                        | Renders "main chart · custom engine" + "main / compact" on the same line · redundant          | hierarchy      |
| 13 | ChartCanvas header                     | Symbol pill + price pill + overlay pill all share `gap-2` · no scale tick · noisy              | hierarchy      |
| 14 | Server command bar                     | `text-white/15` bullets stack visually as "··· ···" · creates noise                            | dividers       |
| 15 | Market Lab CommandBar                  | Same bullet noise + symbol form crowds layout pill                                            | dividers       |
| 16 | Layout preset pill (active state)      | Active = `bg-accent/[0.18] text-accent` only · no obvious "selected" affordance               | active state   |
| 17 | Restart button                         | `border-amber-400/30 bg-amber-500/[0.06]` · amber on every row reads as a warning             | tone           |
| 18 | InlineError                            | `mt-1.5 px-2 py-1.5` and `gap-1.5` · taller than needed inside dense panels                   | density        |
| 19 | RestartHintRow                         | Same vertical padding as panel rows · jumbles the service list when many hints are visible    | density        |
| 20 | ChartCanvas tooltip badge              | `text-[10px]` flat list of OHLCV · no minor/major hierarchy                                   | hierarchy      |

## Polish patch list (in this sprint)

| # | Change                                                                | Files                                                  |
|---|-----------------------------------------------------------------------|--------------------------------------------------------|
| A | Normalize all panel borders to `white/10` and gutter to `px-2 py-1.5` | `panels/TerminalPanel.tsx`                             |
| B | Slim `EmptyAdapterPanel` (smaller text, less padding, inline-friendly)| `panels/EmptyAdapterPanel.tsx`                         |
| C | Server stat tiles · stronger value hierarchy + tone-aware label color | `modules/server/ServerPage.tsx`                        |
| D | Audit log · true monospace grid with proper column widths             | `modules/server/ServerPage.tsx`                        |
| E | Order book · right-align price column, center the spread row          | `components/market-lab/OrderBookPanel.tsx`             |
| F | Time & Sales · subtle zebra striping for scan-readability             | `components/market-lab/TimeAndSalesPanel.tsx`          |
| G | Watchlist · 1-px row separators on hover; tighter row padding         | `components/market-lab/Watchlist.tsx`                  |
| H | ChartSlot · drop the redundant "main / compact" subtitle              | `components/market-lab/panels/ChartSlot.tsx`           |
| I | ChartCanvas header · group symbol/price; promote price size           | `components/market-lab/chart-engine/ChartCanvas.tsx`   |
| J | CommandBars (both) · replace `·` bullet text with vertical divider     | `modules/server/ServerPage.tsx` · `MarketLabPage.tsx`  |
| K | Layout preset pill · add 2-px accent underline on active              | `modules/market-lab/MarketLabPage.tsx`                 |
| L | Restart button · neutral surface, amber reserved for hint row only    | `modules/server/ServerPage.tsx`                        |
| M | InlineError + RestartHint · tighter padding, smaller leading          | `modules/server/ServerPage.tsx`                        |
| N | ChartCanvas tooltip · two-line layout · time on top, OHLCV below      | `components/market-lab/chart-engine/ChartCanvas.tsx`   |

No behavior changes. No new providers. No Rust changes. No new features.
