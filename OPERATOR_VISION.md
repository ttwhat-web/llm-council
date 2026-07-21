# PROMPTREADY OS · OPERATOR VISION

> 60 forward-looking ideas, captured per the brainstorm.
> Mapped into the locked pillars: **Foundation · Operator · Remote · Expansion · Release**.
> Each item graded for safety: `SHIPPED` · `READY-SLICE` · `SELLABLE-BETA` · `POST-LAUNCH` · `CATEGORY` · `PLATFORM`.
>
> **No removals, no migrations, no Atlas moves.** Items marked READY-SLICE
> are tightly scoped follow-ups that don't break the demo lock.
> Items marked SHIPPED already exist on this branch — note where.

Branch: `claude/promptfixer-sidekick-Q1zpg`

---

## Legend

| Grade | Meaning |
|---|---|
| **SHIPPED** | Already on this branch · point at the file/route. |
| **READY-SLICE** | One-evening build · uses existing stores, no risk. |
| **SELLABLE-BETA** | Next 1-3 days · light wiring, no redesign. |
| **POST-LAUNCH** | After public beta · features that sell expansion. |
| **CATEGORY** | Category-creating · 1-3 month build. |
| **PLATFORM** | Multi-product · 3-12 month bet. |

---

## 1 · Operator Replay 🎬
**SHIPPED** (partly). `LibraryPage` receipt expand already lists brief · mode · quality · stage · score · elapsed · memory matches · repo context · all deliverables · flight recorder. **READY-SLICE:** add a "Replay Mission" eyebrow + a one-tap "share this replay" download that bundles the receipt into a single `.replay.md`.

## 2 · Brain Evolution 📈
**SHIPPED.** `AtlasHud` already shows missions / receipts / sources / engines / snapshots. **READY-SLICE:** add "Brain age" + "Operator level" derived from counters (days since identity.createdAt + tiered counter buckets). Demo data already labelled.

## 3 · Session Resume
**SHIPPED.** `RecoveryBanner` at boot offers Resume · Safe mode · Discard. Reads `useAtlasStore.recovery` checkpoint. Same key persists across sessions.

## 4 · Brain Diff
**READY-SLICE.** Snapshots are in memory (`recentSnapshotPayloads`). A diff component computes `keysA − keysB` across brain identity, mission history, atlas store. ~150 lines.

## 5 · Runtime Shield 🛡️
**SELLABLE-BETA.** New Settings card with toggles: allow-remote-approve · allow-remote-pause · allow-workflow-execute · allow-repo-actions · allow-destructive. Writes to a new localStorage key. Wires into the existing command parser via a single guard function. Unlocks Telegram bot rollout without trusting raw `/run`.

## 6 · Operator Timeline
**SHIPPED.** `AuditLogCard` is the timeline · filter chips + Markdown export. **READY-SLICE:** add a horizontal hour-by-hour swimlane view on top of the existing list.

## 7 · Desktop Presence
**READY-SLICE.** `services/telegramBridge.ts > sendNotification` already queues outbound. Build a `presenceTick()` that periodically pushes desktop · ollama · agents · workflow · memory state through the bridge. Phone reads from the same queue.

## 8 · Founder Console 👑
**SHIPPED today** via `PresentationModeCard` (this commit). Silent · Ghost · Demo lock + Brain freeze + Restore freeze. **POST-LAUNCH:** add "Export deck report" (PDF of roadmap + metrics).

## 9 · Brain Score
**READY-SLICE.** `services/brainHealth.ts` already computes the inputs (storage, duplicates, stale repos, unused workflow nodes, orphan files, archived inbox). Add a `score` helper that returns 0-100 and a one-line "improve brain" recommendation. ~40 lines.

## 10 · Operator ID
**SHIPPED.** `BrainBootstrap` already collects name + mode + engines + sources on first launch. **READY-SLICE:** add an "Operator level" line at the bottom derived from `BrainScore` and a "Level: Founder" tag when the founder activation code matches.

## 11 · Brain Passport 🧠
**READY-SLICE.** `services/snapshot.ts > buildSnapshot` already covers brain + missions + atlas + theme. Rename the export filename to `.atlas-passport` for a presentation alias. The actual format is unchanged — same file, two friendly names.

## 12 · Operator Journal 📔
**READY-SLICE.** Settings card that filters `auditLog` to today's entries + recent receipts + recent imports. Pure read-only view over real data. ~120 lines.

## 13 · Mission Marketplace
**SHIPPED.** `/marketplace` ships 8 starter packs · install / export / import. **POST-LAUNCH:** allow operator-uploaded packs, rating, version migration.

## 14 · Runtime Heatmap 🔥
**READY-SLICE.** Compute usage rows from real counters (mission count, memory ops, repo attaches, workflow runs, delivery exports). ASCII / SVG bars. Mount on Atlas Operations view.

## 15 · Ghost Mode 👻
**SHIPPED today** as part of Presentation Mode. Redacts email-shaped strings (toggle persists). **READY-SLICE:** extend the regex to also redact `~/path` and `/Users/...` paths when the toggle is on.

## 16 · Brain Freeze ❄️
**SHIPPED today** as part of Presentation Mode. Freeze creates an in-memory snapshot named `presentation-freeze`; Restore freeze reverts.

## 17 · Runtime Recorder 🎥
**SELLABLE-BETA.** Record every audit + mission event during a session window into a single `.recorder.jsonl` for replay. Reuses `auditLog` + `mission.events`.

## 18 · Operator Presence 🌐
**SELLABLE-BETA.** Same plumbing as #7. The data the phone shows = the data the Atlas HUD already computes.

## 19 · Brain Library 📚
**READY-SLICE.** Today, `services/marketplace.ts` already supports per-pack contents. Add a "Library" tab in Settings that lists installed packs grouped by domain (Build / Ops / Research / Creative).

## 20 · Brain DNA 🧬
**READY-SLICE.** Derive % mix from mission mode distribution: count `dev` / `business` / `claude` / etc. across history → percentage rings on the Brain page. Pure read.

## 21 · Atlas Ambient Mode
**POST-LAUNCH.** `BrainGraph` already lights only nodes with real state. Adding a subtle pulse on state-change events (not ambient) preserves the honesty rule.

## 22 · Brain Recovery USB
**SHIPPED.** `.brainpack` export already works · drop the file on any machine, restore from Settings. **READY-SLICE:** add a "Recovery card" that ships the snapshot + a one-liner restore script for non-technical operators.

## 23 · Local AI Benchmark
**READY-SLICE.** `services/missionRunner.ts > probeOllama` already lists models. Add a "Benchmark" button per model that dispatches a fixed brief and records latency · tokens · response length into a comparison table.

## 24 · Runtime Insurance
**SHIPPED partly.** `RecoveryBanner` covers crash insurance. **READY-SLICE:** wrap destructive actions (Reset workspace · Clear archive · Remove space) with a "Workspace risk detected · Create snapshot?" prompt that uses `downloadSnapshot`.

## 25 · Operator Dock (the "vay be")
**SELLABLE-BETA.** This is the phone-side payoff for everything in §1-24. Required: real Telegram networking (Foundation already there) OR PWA at `/m/<code>`. The dock surfaces only existing data; no new desktop work.

---

## 26 · Brain Twin 👥
**CATEGORY.** Two brains share scoped memory through an explicit grant.

## 27 · Operator War Room 🛰️
**READY-SLICE.** A new home mode `war-room` on Atlas that promotes Mission · Repo · Alerts · Agents · Health · Receipts to a single grid. Pure composition of existing panels.

## 28 · Mission Time Travel ⏳
**SELLABLE-BETA.** Each receipt already records `events`, `deliverables`, `repoContext`. "Replay from step 4" dispatches a new mission with the prior-step deliverables as seeded context.

## 29 · Brain Reputation ⭐
**READY-SLICE.** Same source as #9 but framed as Trust score. Single number from local metrics.

## 30 · Runtime Forecast 🔮
**READY-SLICE.** `brainHealth.ts` already detects stale repos, oversized memory, unused workflow nodes. Surface as a "Forecast" card with 3-5 honest predictions.

## 31 · Brain Museum 🏛️
**READY-SLICE.** Snapshots already accumulate. Rename the Snapshots card's history list as "Brain Museum"; each row is an old state with a one-tap restore.

## 32 · Mission Tree 🌳
**SELLABLE-BETA.** Receipts link by `repoContext` and dispatch order. A tree view groups follow-up missions under their parent receipt id (already present in agent ticks).

## 33 · Local Skill Forge ⚒️
**CATEGORY.** Distill a repo or memory subset into a named "Skill" (reusable prompt + context pack). Could share lineage with Marketplace packs.

## 34 · Operator Economy 💰
**PLATFORM.** Marketplace already exists. The economy layer adds creator accounts, payouts, ratings. Big lift.

## 35 · Brain Ring 💍
**CATEGORY.** Multi-brain visual · Atlas variant that shows linked spaces. Spaces already exist; this is the visualization.

## 36 · Silent Mode 🤫
**SHIPPED today** as part of Presentation Mode.

## 37 · AI Black Box ✈️
**SHIPPED.** Receipts already capture input · memory matches · repo context · model · deliverables · events. The "Why did it do that?" answer is the receipt expand view on `LibraryPage`. **READY-SLICE:** add a one-tap "Explain decision" that dispatches a follow-up brief asking the engine to summarize its own receipt.

## 38 · Runtime Pulse ❤️
**READY-SLICE.** `BrainGraph` already pulses the mission edge during in-flight. Extend the same animation pattern to repo glow / approval flash, gated on real state changes.

## 39 · Operator Console CLI
**SELLABLE-BETA.** `services/commandConsole.ts` is the CLI brain. Wrap it as a Tauri command that exposes `operator run/health/replay/restore/inbox/export` to the actual shell.

## 40 · Operator Cloud Exchange 🚀
**PLATFORM.** Long bet · sharing brain templates / workflow packs / mission templates / repo maps / skills while keeping runtime local.

---

## 41 · Brain Weather 🌦️
**READY-SLICE.** Three-bucket compute from existing counters (mission load + approval backlog + alert backlog). Color the HUD ring.

## 42 · Brain Mood 🎭
**READY-SLICE.** Same as #20 (Brain DNA) but as the active accent color in the theme store. Pick the dominant mode → set theme accent.

## 43 · Operator Morning Brief ☕
**SHIPPED partly** via the Notifications bell. **READY-SLICE:** new Settings card that renders the morning brief on demand from the audit log + receipts. Same data, presentation-friendly layout.

## 44 · Brain Memories Timeline 📼
**READY-SLICE.** Walk `audit log` + receipts + spaces creation dates → "first repo" / "first receipt" / "first workflow" / "first export" milestones. Read-only.

## 45 · Operator Streak 🔥
**READY-SLICE.** Count consecutive days with at least one mission. Single number from receipt history.

## 46 · Brain Funeral ⚰️
**POST-LAUNCH.** Spaces already have `archiveSpace`. Add an "Operator retired" mode that locks the space read-only with a memorial banner.

## 47 · Atlas Night Mode 🌙
**READY-SLICE.** A new theme palette + scheduled trigger (after 9pm local time) that reduces glow intensity. Theme store already supports palettes.

## 48 · Brain Seed 🌱
**SHIPPED partly.** Mission templates exist; bundle a "Travel Seed" / "Founder Seed" pack that includes identity + sources + workflow in one install. ~30 lines per seed.

## 49 · Mission Insurance 🛟
**SHIPPED today** as part of Presentation Mode (Brain freeze). **READY-SLICE:** also offer auto-snapshot every N missions.

## 50 · Operator Scoreboard 🏆
**READY-SLICE.** Same data as #9, gamified. Single number + delta vs last 7 days.

## 51 · Brain Companion Animal 🐺
**POST-LAUNCH.** Cute · ships only after the core sells.

## 52 · Runtime Hologram 🧊
**POST-LAUNCH.** A premium variant of `BrainGraph` with 3D depth + halo. Same data, different shader.

## 53 · Brain Vault Lock 🔐
**SELLABLE-BETA.** Passphrase-wrap the snapshot file on export · decrypt on import. Native crypto in the Tauri runtime; web preview shows the prompt as planned.

## 54 · Operator Radar 📡
**READY-SLICE.** `AtlasViews > RadarPanel` already exists. Promote it to a dedicated home mode.

## 55 · Brain Economy Exchange 💸
**PLATFORM.** Marketplace + creator economy.

## 56 · Brain Language 🌍
**POST-LAUNCH.** i18n + operator-specific vocabulary (Mission, Receipt, Brief stay as English nouns).

## 57 · AI Memory Camera 📸
**SELLABLE-BETA.** Phone takes photo → uploads to inbox via the bridge. Inbox already supports `image` kind. Same network as Operator Dock.

## 58 · Operator Deck Export 🎤
**READY-SLICE.** Compose existing diagnostics + roadmap + receipts into a single Markdown deck. Use the existing download patterns.

## 59 · Runtime Ghost 👻
**SELLABLE-BETA.** Soft-delete pattern · everything moves to `useAtlasStore.ghost` for N days before disappearing. Pairs cleanly with the safety rules in this audit.

## 60 · Operator Universe
**PLATFORM.** End state: every brain composable, every space linkable, marketplace economy live, mobile remote everywhere. This is the 3-year picture.

---

## Top 6 missing pieces for "sellable beta"
(extracted from the brainstorm's own conclusion)

| # | Item | Status | Slice |
|---|---|---|---|
| A | Telegram real networking | adapter ready | wire `BOT_TOKEN` long-poll in Tauri runtime |
| B | Mobile remote | adapter ready | PWA at `/m/<code>?act=...` reusing command parser |
| C | Installer signed | CI ready | acquire Apple Dev ID + Windows EV cert |
| D | Operator Replay | data ready | Library expand → "Replay Mission" framed UI |
| E | Presence system | bridge ready | scheduled `presenceTick()` over bridge |
| F | Founder mode | shipped today | Presentation Mode card (this commit) |

---

## What shipped today (this commit)

- `components/PresentationModeCard.tsx` · Silent · Ghost · Demo lock · Brain freeze · Restore freeze
- `AtlasHud > PresentationPill` · "stage" pill appears when any flag is active
- `OPERATOR_VISION.md` (this file)

Atlas untouched. Settings ordering preserved. Stores untouched. Routes untouched.

---

## Operator Universe · the 60-second pitch

> PromptReady OS is the local-first AI operator console. Atlas is the
> home screen of your second brain · missions ship deliverables · the
> phone is the remote, never the brain. Founder lifetime for the first
> 100 operators.
