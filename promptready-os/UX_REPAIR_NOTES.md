# UX_REPAIR_NOTES — Operator Core design system

The in-app design rules. Goal: a dense operator terminal, not a SaaS
landing page. Apply these to every surface (Atlas, Terminal, Market Lab,
Voice, Settings). Premium, calm, dark, information-dense.

## Spacing scale
- Page container: `mx-auto w-full max-w-[1700px]` with `px-3/px-4`, `py-3/py-4`. NOT `md:px-7 py-7`.
- Section gap: `gap-3` (dense areas `gap-2`). NOT `gap-5/gap-6`.
- Panel padding: `p-2` / `p-2.5` for data panels; `p-3` only for top-level cards. NEVER `p-6`.
- No hero spacing inside the app. No centered max-w-prose blocks. No big empty cards.

## Terminal density
- Prefer CSS grid frames (`grid-cols-[220px_1fr_300px]`) over stacked cards.
- Tabular rows: thin separators `divide-y divide-white/6`, row height ~`py-1`/`py-1.5`.
- Tables/tickers: `font-mono`, `tabular-nums`, `text-[10px]`/`text-[11px]`.
- Fill the frame: left rail + center wall + right rail + bottom tape. No dead space.

## Typography
- Labels/counters: `font-mono uppercase tracking-[0.18em]–[0.24em]`, `text-[9px]`/`text-[10px]`, `text-white/40`.
- Values: `font-mono tabular-nums text-white/85` (mono for numbers always).
- Titles: `text-[13px] font-semibold text-white`. Body: `text-[11px] text-white/55`.
- Never below `text-[9px]`. Keep contrast readable on dark glass.

## Panel rules
- Glass shell: `rounded-2xl border border-white/10 bg-white/[0.02]` (inner tiles `rounded-xl border-white/8 bg-white/[0.012]`).
- Every panel needs a header (icon + mono eyebrow + status pill) and real content or an explicit empty/disabled state.
- No panel taller than its content — no giant empty boxes.

## Disabled / adapter-ready style
- Adapter-ready (no live source) must read as **intentionally disabled**, not unfinished:
  - reduced opacity (~0.5), muted text `text-white/40`, optional subtle diagonal hatch.
  - a clear pill: `adapter-ready` / `offline` (muted: `border-white/10 bg-white/[0.03] text-white/55`).
  - compact — a small row/tile, never a large blank panel.
- Never show fabricated numbers; show "—" or the adapter pill.

## Status pill tones
- ok/connected: emerald · adapter-ready: accent · error: rose · offline/muted: white/55 · warn: amber.

## Chart style
- SVG/CSS only (no chart lib). Area + line, accent/emerald/rose by direction.
- Big current value + 24h chip; minimal axes; sample count visible.
- Empty state premium: "collecting live samples" + last real value, never fake points.

## Motion rules
- Calm micro-motion only. Opt-in utilities: `op-breathe-border`, `op-rise`, `op-hover-depth`, `op-glass-reflect`.
- Animated backgrounds + breathing are gated by `prefers-reduced-motion`.
- A pulse/animation may only run when a state is real (e.g. a feed is live, mic is capturing). No idle fake motion. No flashy crypto effects.

## Honesty (non-negotiable)
- Real = CoinGecko crypto, HN/NewsAPI news, local stores. Everything else = adapter-ready.
- No fake data, no fake "connected"/"live", no hidden mic capture, no auto execution.

## Anti-patterns (do not do)
- SaaS marketing spacing inside the app · giant empty cards · centered prose ·
  soft pastel gradients · oversized icons/headings · low-information panels ·
  fabricated tickers/odds/headlines · Bloomberg branding or amber-on-black 1:1.
