# PREMIUM_SURFACES — Operator Core tiers

What belongs to which tier. Tiers are informational badges only —
**no payments wired, no lockout for early users** (`getCurrentPlan()`
defaults to ELITE so existing users stay fully unlocked).

Tier definitions live in `services/plan.ts` and are surfaced by
`<PlanBadge tier="…">` + the **Plans card** (Settings → System).

## CORE — $29 / mo · $249 / yr
**Builders · AI users · power users · curious market users.** Default
operator entitlements:
- Atlas (home, HUD, presence)
- Voice · Jarvis Console (text mode + browser speech where available)
- Telegram Runtime (simulator + live via desktop bridge)
- Ollama Runtime (Model Lab probe + dispatch)
- Intelligence Terminal (Terminal / Live Wall / Second Screen modes; command bar quick-find)
- Basic Market Lab (crypto + news; chart wall; provider health)
- CoinGecko crypto feeds (live, keyless)
- Hacker News news feed (live, keyless)
- Bot Runtime (Telegram-driven command parser)
- Search Runtime (browser-open fallback; provider adapters)
- Mission System (dispatch · receipts · replay v1)
- Paste Intelligence (Smart Paste autopilot)
- Replay basics (copy, export `.md`)
- Market summary widgets (Live Wall · Theater tiles)
- Small watchlists (terminal pins · Market Lab basic watchlists)
- Media Dock (user-selected media only)

## DESK — $169 / mo · $1499 / yr (launch)
**Serious users · founders · traders · operators.** Adds:
- Terminal Pro (dense Market Lab cockpit · `220px / 1fr / 300px` frame + bottom news tape)
- Market Intelligence Center · full (heatmap / multi-chart matrix / news room / signal tower / ticker tape)
- TV Market Mode (12-panel projection layout)
- Multi-Chart Matrix (1 / 2 / 4 / 6 stack)
- Heatmaps (crypto live; sector / vol / correlation / breadth adapter-ready)
- Macro Board (clocks + provider health + risk regime from real 24h%)
- Signal Wall (mover · velocity · provider errors · approvals)
- AI Analyst Stack (Atlas Market / Claude / GPT / Gemini / Local — honest states)
- Advanced Watchlists (Market Lab watch tables)
- Market Memory (samples + chart history; replay-intelligence lineage)
- Replay Intelligence (v2 · used memory · repos · chain · follow-ups)
- Projection Mode (Second Screen Broadcast Wall · `b` key)
- News Room Advanced (categorized chips + featured queue + create-mission / save-to-brain / open source)
- Polymarket Research (adapter-ready; structured prediction wall)
- Atlas Market Layer (Atlas Mode selector · market scene driving the orb)
- Priority local model orchestration (Model Lab + Cost Runtime + Ollama Setup)

Visible **DESK** badge on the Market Lab header.

## ELITE — $399 / mo · $2999 / yr · Contact Sales
**Companies · agencies · funds · operations teams.** Everything in DESK +:
- Teams
- Shared Brain
- Company Memory
- Private Ollama
- Connector Packs
- Approval Flows
- Automation Layer
- Multi-Operator Runtime
- Shared Watchlists
- Role access
- Future deployment options (custom)

Visible **ELITE** badges on the four foldables in Settings → Operator:
**Operator Mode** · **Connector Hub** · **Cloud Sync** · **Enterprise Server**. ELITE is explicitly "contact sales · custom deployment" — no seat pricing in the app.

## Always-on regardless of tier
Atlas grid · Brain Passport · Snapshots · Audit log · Compliance · Demo
Workspace · Operator Safe Mode · Presentation Mode · Field Test Mode.
These are operator safety / portability surfaces, not premium gates.

## Rules
- **No lockout** today. The Plans card "view as TIER" switcher changes
  which badges show; it never disables features.
- New premium surfaces must add a `<PlanBadge tier="desk" />` (or `elite`)
  in their header — see `UX_REPAIR_NOTES.md`.
- ELITE never displays seat pricing or a Stripe button in-app. Always
  "Contact Sales · custom deployment".
