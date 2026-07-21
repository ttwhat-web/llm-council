# PromptFixer · AI Operating System

A working architecture document. **Honest about what's shipped vs.
planned**, so the surface area stays auditable as the substrate scales.

---

## 1 · System map

```
                                ┌──────────────────────────────────┐
                                │   Operations Dashboard (UI)      │
                                │   3-col Mission Control surface  │
                                └────────────────┬─────────────────┘
                                                 │
                                       commands ▼ ▲ events
                                                 │
   ┌──────────────────────────┬─────────────────┴──────────────────┐
   │                          │                                    │
   ▼                          ▼                                    ▼
┌────────┐               ┌────────┐                          ┌────────┐
│ Skill  │   ──invokes─▶ │ Tool   │   ──reads/writes──▶      │ Memory │
│ regis. │               │ regis. │                          │ backnd │
└───┬────┘               └────┬───┘                          └────────┘
    │                         │
    │ run(input, ctx)         │ run(input, ctx)
    ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│ Pipeline runner  │    │ MultiModelRouter │
│ (Stage<R>[])     │◀──▶│ (route + quality)│
└──────────────────┘    └──────────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │ Provider API │  cloud / ollama / deterministic
                      └──────────────┘

   ┌──────────────────────────┐
   │  Workflow runner          │  composes Skills + Tools sequentially
   └──────────────────────────┘
   ┌──────────────────────────┐
   │  Agent runtime  (planned) │  Skill + tools whitelist + memory ns
   └──────────────────────────┘
```

The arrows are real: every edge is implemented in `lib/`.

---

## 2 · Vocabulary

| Concept     | Lives in            | Definition                                                                     |
| ----------- | ------------------- | ------------------------------------------------------------------------------ |
| **Skill**   | `lib/skills`        | Typed `(input, ctx) → SkillResult` capability the system can invoke.          |
| **Tool**    | `lib/tools`         | External capability (clipboard, fetch, terminal, …) bound to a risk tier.      |
| **Memory**  | `lib/memory`        | Per-user namespaced KV. Vector layer plugs in here.                            |
| **Workflow**| `lib/workflows`     | Ordered chain of Skills/Tools with typed input bindings.                       |
| **Agent**   | `lib/agents`        | Skill + Tool whitelist + Memory namespace; runtime planned.                    |
| **Pipeline**| `lib/pipeline`      | Generic stage runner with typed events; powers the Mission Control HUD.        |
| **Router**  | `lib/router`        | Task-bias layer over `lib/providers` + `lib/quality`.                          |

---

## 3 · What's shipped *today*

| Component                | File                                       | Status     |
| ------------------------ | ------------------------------------------ | ---------- |
| Skill registry           | `lib/skills/registry.ts`                   | shipped    |
| Skill: Prompt Fixer      | `lib/skills/prompt-fixer.ts`               | **shipped** — wraps `lib/ai.ts → fixPrompt`             |
| Skill: Prompt Cleaner    | `lib/skills/prompt-cleaner.ts`             | **shipped** — wraps `lib/cleaner.ts → cleanInput`       |
| Skill: Architect         | `lib/skills/architect.ts`                  | **shipped** — wraps the new `lib/architect.ts` runtime  |
| Architect runtime        | `lib/architect.ts`                         | shipped — extracted from the route handler              |
| Tool registry            | `lib/tools/registry.ts`                    | shipped    |
| Tool: exports.format     | `lib/tools/registry.ts`                    | **shipped** — formatters lifted from `lib/exports.ts`   |
| Tool: alert-inbox.list   | `lib/tools/registry.ts`                    | **shipped** — read-only over `lib/alert-inbox.ts`       |
| Tool: telegram.send-alert| `lib/tools/registry.ts`                    | **shipped** — through existing dispatcher path          |
| Memory contract          | `lib/memory/types.ts`                      | shipped    |
| Memory: localStorage     | `lib/memory/local-store.ts`                | shipped (client-side; new writes only)                  |
| Workflow runner          | `lib/workflows/runner.ts`                  | shipped — sequential, typed, real input bindings        |
| Pipeline contract        | `lib/pipeline/types.ts` + `runPipeline`    | shipped — generic stage runner with typed events        |
| MultiModelRouter         | `lib/router/index.ts`                      | shipped — task-bias layer over existing quality logic   |
| `/api/skills`            | `app/api/skills/route.ts`                  | shipped — read-only catalogue                           |
| Existing routes          | `/api/{fix,clean,architect,preview,alerts/*,telegram/webhook,health}` | unchanged |
| Mission Control UI       | `components/PromptFixer.tsx` + 3-col grid  | unchanged                                                |

**Existing capabilities mapped into the new vocabulary** (no code change
needed — they already implement the contract):

- `lib/ai.ts → fixPrompt`        is the **Prompt Fixer Skill**'s runtime
- `lib/providers/{cloud,ollama,deterministic}.ts` are the model
  back-ends the **Router** delegates to
- `lib/safety.ts`                is the deterministic safety pass inside
  the prompt-fixer pipeline
- `lib/score.ts` + `lib/insights.ts` produce the score / "why it works"
  surface — already wired into the Telemetry column
- `lib/alert-dispatcher.ts` + `lib/telegram.ts` + `lib/alert-inbox.ts`
  are the **Tool: telegram.send-alert** + **Tool: alert-inbox.list**
  back-ends
- `lib/exports.ts`               powers **Tool: exports.format**
- `lib/history.ts` (Mission Archive) is the existing client-side memory
  surface; new writes can use the formal `MemoryBackend` interface

---

## 4 · What's *planned* (and why it isn't shipped)

> Each entry is in the registry today as `status: "planned"` with a
> runner that returns `error: "not_implemented"`. No fake outputs.

### 4.1 Skills

| Skill              | Blocker                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Code Debugger      | `files.read` tool — needs an allowlist + workspace concept                                        |
| AI Researcher      | `http.fetch` allowlist + an Agent runtime (multi-step planning)                                   |
| Crypto Analyst     | Same as Researcher; plus a market-data adapter                                                    |
| Screenshot Analyzer| Vision-capable model wiring through the cloud provider; image upload UI                           |
| Terminal Assistant | `terminal.exec` is dangerous — explicit consent UI + sandbox before any wiring                    |
| Deployment Asst.   | `deploy.trigger` (dangerous) + GitHub PR tool                                                     |
| Marketing Gen.     | Project-memory writes (covered by current LocalStorage backend); ship once the UI surface lands   |
| Outreach Agent     | Same as Marketing                                                                                 |
| Vision Analyzer    | Vision wiring                                                                                     |
| Workflow Builder   | Conversational composer needs a UI surface; runtime contract is ready                             |

### 4.2 Tools

The dangerous ones (`terminal.exec`, `deploy.trigger`, `files.write`,
`github.create-pr`, `webhook.send`) **never** ship without:

1. Per-call consent UI (preview the effect; explicit opt-in).
2. Server-side allowlist (paths, repos, environments).
3. Audit log persisted alongside the call.
4. Rate-limiting.

The tool catalogue exposes them so dependent skills compile and the
plan is honest, but `run()` returns `not_implemented`.

### 4.3 Subsystems

- **Agent Runtime** (`lib/agents/`) — contract is there, runtime isn't.
  Needs a planning loop (call → tool → reflect → call), provider tool-
  use API integration, and a consent gate per approval-tier tool.
- **Vector Memory** — interface is `MemoryBackend`; vector backend slots
  in beneath. Embedding pipeline + DB choice are deliberate (likely
  pgvector or sqlite-vss) and depend on whether we keep BYOK or bring
  hosted users.
- **Execution Layer** (terminal / browser / GitHub / deploy) — declared
  but not wired. Each one needs its own threat model.
- **Knowledge Ingestion** (screenshots → patterns → skills) — the
  Vision Analyzer blocker is real; once it lands, the screenshot →
  skill suggestion pipeline is one Workflow definition away.
- **Multi-tenant cloud companion** — the existing app is local-first
  with a Next.js server. Team / Enterprise tiers (PROMPTOS.md §9) need
  auth + multi-tenant memory; the in-process Maps in `lib/usage.ts`
  + `lib/alert-inbox.ts` swap for Redis / Postgres at that boundary.

---

## 5 · Pipeline migration plan

The Prompt Fixer skill currently delegates to `fixPrompt()` — a single
function. The Pipeline contract (`lib/pipeline/types.ts`) lets us
re-express the same flow as a sequence of typed `Stage<R>`s:

```
input → cleaner → mode-detect → context-expansion → structuring
      → constraints → router → supervisor → safety → score → output
```

Each stage emits a `StageEvent` the existing `PipelineViz` already knows
how to render. Migration steps:

1. Extract `cleaner` + `mode-detect` + `engine` (already in lib) as
   pure stages in `lib/pipeline/prompt-fixer-stages.ts`.
2. Express `route` + `supervisor` + `safety` + `score` similarly.
3. Replace `fixPrompt` with `runPipeline(stages, run)` — same outputs,
   identical behaviour, **per-stage events** flowing to the UI.

Net win: the Mission Control HUD goes from "best-effort reconstructed
events" to "real per-stage events from the runtime", and any future
skill builds on the same primitive.

This refactor is deliberately **deferred** to its own commit. It is a
zero-feature change with non-trivial regression surface; it gets a
careful pass after a few skills are in flight to validate the Stage<R>
shape.

---

## 6 · Monetization map (from the brief)

| Tier        | What's enforced today                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| Free        | 10 cloud fixes/day (`lib/usage.ts`), Fast model only — already enforced server-side                    |
| Pro         | Mission Alerts (`NEXT_PUBLIC_MISSION_ALERTS_ENABLED`), Inbox, Architect, Compare, Diff, Templates     |
| Team        | **planned** — needs auth + multi-tenant memory + workflow sharing                                      |
| Enterprise  | **planned** — needs self-hosting story, audit log persistence, custom-agent registration               |

The Pricing card in `components/Pricing.tsx` reflects today's truth.
Every Pro feature listed is shipped; Team / Enterprise lines are
deliberately absent until enforcement exists.

---

## 7 · API surface added by this commit

```
GET  /api/skills      → { ok, skills: SkillCatalogueRow[], tools: ToolMeta[], version: 1 }
```

Existing routes are unchanged in surface:

- `POST /api/fix`, `POST /api/clean`, `POST /api/architect`, `POST /api/preview`
- `POST /api/alerts/telegram` and friends (link-code, status, unlink, webhook)
- `GET /api/alerts/inbox`, `POST /api/alerts/inbox/{read,delete}`
- `GET /api/health`

The architect route was *internally* refactored to delegate to
`lib/architect.ts → runArchitect`; request + response shapes are
identical (round-trip behaviour preserved).

---

## 8 · Next deliberate steps

1. **Pipeline migration** — recompose `fixPrompt` over `runPipeline`
   so the Telemetry column gets real per-stage events.
2. **Workflow Builder UI** — the runner is real; the composer is the
   blocker. Ship a small library of saved Workflows the user can run
   one-click (e.g. "Fix → Architect → Export to Cursor").
3. **One Approval-tier tool** — `github.create-issue` is the cheapest
   credible win. Forces the consent UI we'll need for everything else.
4. **Vector memory** — choose embedding model + DB; implement the
   `MemoryBackend` shape against it.
5. **Operations Dashboard route** — a server-rendered overview built
   on `/api/skills` + `/api/health` + `lib/alert-inbox`. Same page can
   show running Workflows once a few are wired.

Each lands as its own commit. Each preserves backward compatibility
with the existing UI + API surfaces.

---

## 9 · Honest non-goals for this commit

- No UI redesign. The 3-column Mission Control surface is unchanged.
- No execution-layer wiring. Terminal, browser, GitHub, deploy are
  declared but their runners return `not_implemented`.
- No agent runtime. `runAgent` returns `not_implemented`.
- No vector memory. Only the interface + the localStorage backend.
- No Pipeline migration of `fixPrompt`. The contract is there; the
  switch lands separately.
- No new model providers. The Router is a thin task-bias wrapper over
  the existing cloud / ollama / deterministic stack.

The brief listed ten phases. This commit is **Phase 1 done** — the
typed substrate every later phase plugs into. Each subsequent phase
extends one corner of the same diagram.
