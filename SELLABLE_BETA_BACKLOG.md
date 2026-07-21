# PROMPTREADY OS · SELLABLE BETA BACKLOG

> Authoritative backlog for moving from "demoable beta" to "sellable
> operator runtime". Retires Phase 1–30 framing. Items grouped into
> seven streams; each item carries a status and a one-line slice.
>
> Hard rules (carry over):
> - Atlas, Mission System, Memory Layer, Delivery Center, Runtime Bus
>   and Presentation Mode are **never moved**.
> - No new pages unless critical · prefer Atlas panels + Settings cards.
> - No fake telemetry, no fake cloud, no fake mobile.
> - Legacy = keep · hide · document. Removals need explicit approval.

Branch: `claude/promptfixer-sidekick-Q1zpg` · last build clean.

---

## POST-DEMO EXECUTION TIER (locked priority)

> Your own tier list, pinned at the top so post-stage there's no
> argument about what gets built first.

### 🔴 Tier A · the six pieces that flip demo → sellable beta

1. **Replay Mission** — receipt → step-by-step replay → "AI ne yaptı?" answer in one screen. *(S2.7 · data already there)*
2. **Presence System** — desktop / Ollama / approval / workflow signals readable from the phone. *(S4.16 + S5.20 · bridge ready)*
3. **Telegram real bridge** — `BOT_TOKEN` + `/getUpdates` + `/sendMessage` + receipt push + approval push. *(S5.17 · adapter ready)*
4. **Operator Dock (phone)** — six verbs only: approve · reject · pause · resume · receipt · alert. No chat. *(S5.18-20)*

### 🟠 Tier B · premium operator feel

5. **Operator Timeline** — chronological event swimlane (09:21 repo · 09:24 mission · 09:25 receipt · 09:27 snapshot). *(S4.15 · audit log already feeds it)*
6. **Brain Passport** — `.atlas-passport.brain` export (operator · brain · health · repos · workflows · imports). *(matches `.brainpack` shape)*
7. **Brain Diff** — A vs B snapshot diff (+12 receipts · +2 repos · −4 duplicates). *(snapshots already in memory)*

### 🟢 Tier C · investor wow

8. **Mission Tree** — Mission → Approval → Receipt → Export → Follow-up lineage graph. *(S2.8)*
9. **Runtime Heatmap** — Mission ████ · Repo ███ · Memory ████ · Workflow ██. *(S4 stream)*
10. **Operator Morning Brief** — yesterday + pending + suggested action card. *(S4.13)*

### 🔵 Tier D · later · category-creating

- Brain Twin · Brain Museum · Skill Forge · Operator Economy · Operator Universe.

### Honest current state

> 65–70% of "sellable beta" is on this branch. The six items in Tier A
> are the exact conversion gap. Everything else is polish on top of a
> system that already dispatches, persists, audits, and exports.

---

## Stream legend

Status keys used in the seven streams below:

| Grade | Meaning |
|---|---|
| **REAL** | Already on this branch · file/route pointer in notes. |
| **PARTIAL** | Data exists; one slice converts it into the surface described. |
| **PLANNED** | Spec'd · not built · awaiting unlock. |

The seven streams:

---

## S1 · SAFETY / TRUST

| # | Item | Status | Slice |
|---|---|---|---|
| S1.1 | **Operator Safe Mode** (one-tap pause agents · workflows · remote · freeze) | **REAL today** — new `OperatorSafeModeCard` in Settings · composes existing cancel + freeze + flags. | — |
| S1.2 | Runtime Shield · per-action remote toggles | PARTIAL · `ComplianceCard` has 6 policy toggles · split into "remote actions" subset next slice. |
| S1.3 | Brain Lockbox · private memory items | PLANNED · add `visibility: "private"` to inbox/memory docs; missions skip private items unless allowed. |
| S1.4 | Runtime Insurance · "create snapshot before risky action?" | PARTIAL · presentation Brain freeze covers the manual case; wrap reset / clear / remove flows next slice. |

## S2 · EXPLAINABILITY

| # | Item | Status | Slice |
|---|---|---|---|
| S2.5 | Mission Confidence on receipt | PARTIAL · `MissionReceipt.score` already 0-100; reformat as "confidence" with input breakdown. |
| S2.6 | AI Witness · Input / Memory / Repo / Workflow / Output explainer | PARTIAL · receipt events already capture this; render as a single explain panel in Library expand. |
| S2.7 | Replay Mission view | PARTIAL · Library receipt expand already shows brief + memory + repo + timeline + deliverables; add `Replay Mission` eyebrow + share-as-`.replay.md` download. |
| S2.8 | Mission Tree · lineage graph | PLANNED · receipts already link via repoContext + agent ticks; add a tree view in Library. |

## S3 · HEALTH

| # | Item | Status | Slice |
|---|---|---|---|
| S3.9 | Brain Capacity (memory · receipts · repos · imports · snapshots · health %) | PARTIAL · TelemetryDashboard + DesktopTrust cards cover this; unify into a single "Capacity" row in Brain Score. |
| S3.10 | **Brain Score** 0–100 + Improve Brain action | **REAL today** — new `BrainScoreCard` in Settings · composes `brainHealth.ts` outputs. |
| S3.11 | Brain Burnout · calm / busy / overloaded / critical | PARTIAL · Cost Board + NotificationsBell already have the inputs; surface as a single state pill next slice. |
| S3.12 | Repo Drift · "brain context stale" when README/package/migration changed | PLANNED · needs Tauri file watcher; today the imported docs are static snapshots. |

## S4 · OPERATOR FEEL

| # | Item | Status | Slice |
|---|---|---|---|
| S4.13 | Operator Morning Brief | PARTIAL · audit log + receipts + memory imports already track this; new Settings card composes "yesterday / pending / health / suggested action". |
| S4.14 | Focus Mode (only mission + repo + timeline visible) | PARTIAL · Atlas home modes already have `live`; add a `focus` mode that promotes those three panels. |
| S4.15 | Operator Timeline · chronological event view | REAL · `AuditLogCard` is the timeline. Swimlane view next slice. |
| S4.16 | Presence Layer · desktop online + ollama + workflow + memory + agents | PARTIAL · `RuntimeBus` shows this on the desktop; phone-facing variant is S5.18. |

## S5 · REMOTE

| # | Item | Status | Slice |
|---|---|---|---|
| S5.17 | **Telegram Live** · real `BOT_TOKEN` + `/getUpdates` + `/sendMessage` | PARTIAL · adapter + simulator already real (`telegramBridge.ts` + `commandConsole.ts`); needs one Tauri-side patch with the token. |
| S5.18 | Operator Dock · phone view of desktop · approve directly | PLANNED · uses the same command parser via the bridge; needs PWA at `/m/<code>`. |
| S5.19 | Mobile Companion · capture · receipt · approve · alerts · inbox | PLANNED · pairing code real; native shell missing. |
| S5.20 | Presence Remote · last mission · health · pending approvals | PLANNED · same plumbing as S5.18. |

## S6 · INSTALL / RELEASE

| # | Item | Status | Slice |
|---|---|---|---|
| S6.21 | Installer prep (mac · win · linux) | REAL · `.github/workflows/release.yml` builds on tag push. |
| S6.22 | Signing (Apple · Windows) | PLANNED · CI accepts secrets · certs not provisioned. |
| S6.23 | Runtime Cost · CPU / RAM / Ollama / latency | PARTIAL · `TelemetryDashboard` has latency + token estimates; system CPU/RAM needs Tauri sysinfo binding. |
| S6.24 | Demo Export · PDF (health + roadmap + metrics + receipts) | PARTIAL · `diagnostics.md` covers data; PDF is a separate render. |
| S6.25 | Founder Console (seed · reset · investor mode · freeze · ghost · deck export) | REAL · `PresentationModeCard` + `DemoWorkspaceCard` cover this today; deck export is the open subset. |

## S7 · FUTURE (ROADMAP ONLY · do not build today)

These exist as labels only · do not implement until the previous six streams are done.

- Brain Twin (linked spaces)
- Brain Merge (combine two brains)
- Brain Museum (versioned brain history viewer)
- Skill Forge (distill memory subset → reusable skill)
- Cloud Exchange (encrypted optional sync · BYOK bucket)
- Operator Universe (composable brains · linked spaces · economy)
- Operator Economy (creator / payout / rating layer)

---

## SHIPPED-TODAY DELTA

Two new cards from this commit honor the demo lock — both are tight,
read-only-on-top-of-existing-stores, no migrations:

1. **`BrainScoreCard`** — single 0–100 number computed from
   `brainHealth.measure()` outputs. Shows the inputs, an "Improve
   brain" call-to-action that fires the existing `optimizeBrain()`.
2. **`OperatorSafeModeCard`** — one-tap entry into Safe Mode: cancels
   current mission, sets Presentation Mode flags (silent + demoLock),
   triggers a Brain freeze snapshot, persists a `safe-mode` flag.
   Same tap toggles back.

Both mount in Settings between Presentation Mode and Setup Wizard.
Atlas, stores, routes, mission runner untouched.

---

## TIER PRIORITY (your own conclusion, locked)

1. Telegram live (S5.17)
2. Mobile remote (S5.18, S5.19, S5.20)
3. Replay (S2.7) — slice ready
4. Presence (S4.16 + S5.20)
5. Installer (S6.21 done · S6.22 next)
6. Trust / Shield (S1 stream)
7. Health (S3 stream — Brain Score shipped today)
