# Module · AI Workflow Dashboard

**Owns:** the calm, glanceable home view — what you've been working on,
how the engine is doing, where to pick up.

## Responsibility

Single landing page. No fluff. Reads from `useSessionsStore` +
`usePromptsStore` + `usage_events`, renders five panels:

1. **Recent prompts** — last 8 sessions, click to reopen in PromptFixer.
2. **Active sessions** — anything `draft` or `recovered`. Empty state
   when zero (don't fake activity).
3. **Favourite workflows** — pinned `workflows` rows.
4. **Usage telemetry** — sparklines: prompts/day (30-day), provider mix,
   median supervisor latency.
5. **Productivity insight** (single line) — derived locally:
     "You shipped 14 prompts this week — 3× faster than last."

## State

Owns `useDashboardStore` — cached aggregates so the home view renders
instantly. Refresh strategy: lazy on focus + every 60 s while focused.

## Routes

- `/` — root, defaults to dashboard.

## Services

- `database/client.ts` — read-only here. Aggregations are cheap SQL queries
  against `usage_events` indexed on `(ts, module)`.

## Visual rules

- No charts heavier than a sparkline.
- No coloured radial gauges.
- One accent colour per panel maximum.
- Spacing > information density.

This is the **first** screen a new user sees. It must communicate
"calm, premium, useful" in under one second.
