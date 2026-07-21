# PROMPTREADY OS · PRODUCT AUDIT

> Authoritative reframe. Phase 1–30 language is retired.
> Everything below is mapped into the new pillars:
> **Foundation · Operator · Remote · Expansion · Release**.
>
> Status grades: `REAL` · `PARTIAL` · `PLANNED` · `LEGACY` · `REMOVE-CANDIDATE`.
> Nothing in this document deletes anything — `LEGACY` and
> `REMOVE-CANDIDATE` are flags only. Removals require explicit approval
> per the safety rules.

Branch: `claude/promptfixer-sidekick-Q1zpg` · HEAD `cd29175`
Builds: ✅ desktop · ✅ website
Target: **Sellable Beta** · Desktop = BRAIN · Phone = REMOTE · Atlas = HOME.

---

## 0 · Identity (anchor)

| Concept | Reality on this branch |
|---|---|
| Desktop = brain | Tauri/Vite shell at `promptready-os/` · Atlas at `/` index |
| Phone = remote | Pairing code + adapter seam · no native shell yet |
| Atlas = home | `AtlasPage` is the index route · 9 cells · blueprint / operations / live modes |
| Local-first | Every store persists to `localStorage` only · Ollama is the only optional outbound call |
| BYOK | Provider key fields in Settings · adapters not wired (cloud routing planned) |

---

## 1 · FOUNDATION

### F1 · Memory
| Surface | Status | Notes |
|---|---|---|
| `store/brain.ts` (identity · sources · engines · counters) | REAL | persisted to `localStorage` |
| `modules/memory/MemoryPage.tsx` (Brain Notes typing inbox) | PARTIAL | notes live in component state · no persistence editor yet |
| `modules/atlas/panels/MemoryVault.tsx` (Inbox · Repos · Files · Receipts · Pins tabs) | REAL | file picker / drop / search live |
| `store/atlas.ts > memoryDocs` (imported .md/.txt/.json) | REAL | persisted · keyword-searchable |
| `store/atlas.ts > files` (binary file metadata) | REAL | metadata-only by design |
| `store/atlas.ts > inbox` (text · url · file · repo · voice · image) | REAL | voice kind disabled (planned) |

### F2 · Missions
| Surface | Status | Notes |
|---|---|---|
| `services/missionRunner.ts` deterministic engine | REAL | 8 named deliverables · always offline |
| `services/missionRunner.ts` Ollama path | REAL | `/api/tags` probe + `/api/generate` call · adds Model Response deliverable |
| `store/mission.ts` (receipts · history · runtime states) | REAL | persisted · dedupe + setHistory |
| `modules/mission-control/MissionControlPage.tsx` | REAL | 3-zone HUD · execution graph · flight recorder |
| `modules/atlas/panels/DispatchPanel.tsx` (inline dispatch) | REAL | template picker + engine toggle |
| `services/missionTemplates.ts` (8 built-in templates) | REAL | extendable via marketplace install |
| `components/RecoveryBanner.tsx` (boot-time resume) | REAL | resume · safe mode · discard |

### F3 · Atlas
| Surface | Status | Notes |
|---|---|---|
| `modules/atlas/AtlasPage.tsx` (9-cell blueprint canvas) | REAL | brain-core · mission · memory · repo · workflow · intelligence · delivery · mobile · team |
| `modules/atlas/AtlasHud.tsx` (top HUD + bell + space switcher) | REAL | live counters · health ring |
| `modules/atlas/AtlasViews.tsx` (operations + live modes) | REAL | 3 modes via `useAtlasStore.homeMode` |
| `components/BrainGraph.tsx` (SVG orbit · compact + full) | REAL | edges only to nodes with real state |
| Atlas blueprint export (Markdown) | REAL | bundles all real state |

### F4 · Workflow
| Surface | Status | Notes |
|---|---|---|
| `modules/atlas/panels/WorkflowCanvas.tsx` (drag · connect · rename · save) | REAL | persisted to atlas store |
| `services/workflowRunner.ts` (walker + approval resume) | REAL | `runWorkflow` + `resumeWorkflowRun` · honest blocked states |
| `modules/workflows/WorkflowsPage.tsx` (legacy blueprints page) | PARTIAL | static blueprint catalog; canvas is the real surface |

### F5 · Delivery
| Surface | Status | Notes |
|---|---|---|
| `modules/atlas/panels/DeliveryCenter.tsx` (copy · download · pin · iterate) | REAL | filter by format · pinning persists |
| `modules/library/LibraryPage.tsx` (Operations Archive) | REAL | search · expand · per-deliverable download |
| `services/snapshot.ts` (.brainpack export + restore) | REAL | in-app restore from kept payloads |

---

## 2 · OPERATOR

### O1 · Agents
| Surface | Status | Notes |
|---|---|---|
| `services/agentRuntime.ts` (5 named agents · operator-tick) | REAL | research · builder · memory · repo · marketing |
| `modules/atlas/AtlasViews.tsx > AgentQueuePanel` (per-row tick) | REAL | dispatches real follow-up mission |
| `modules/agents/AgentsPage.tsx` (catalog) | REAL | copy updated post-audit; points at Atlas Operations |

### O2 · Marketplace
| Surface | Status | Notes |
|---|---|---|
| `services/marketplace.ts` (8 starter packs · install · export · import) | REAL | every install mutates real stores |
| `modules/marketplace/MarketplacePage.tsx` at `/marketplace` | REAL | sidebar nav entry · search · category filter |
| `.pack.json` import/export | REAL | local-only · no server |

### O3 · Runtime Bus
| Surface | Status | Notes |
|---|---|---|
| `components/RuntimeBus.tsx` (9 modules with live state) | REAL | Settings card · live probe of Ollama |
| `components/OperatorModeCard.tsx` (Solo · Team · Agency · Enterprise) | REAL | persisted label; runtime gates planned |

### O4 · Team Spaces
| Surface | Status | Notes |
|---|---|---|
| `store/spaces.ts` (pack/unpack workspaces) | REAL | switch packs live state in/out |
| `components/SpaceSwitcher.tsx` (HUD chip) | REAL | create · switch · clone · archive · remove |
| Atlas Team Layer cell (Atlas row 3 col 3) | REAL | reads spaces · displays member counts |
| Role enforcement | PLANNED | labels only today |

### O5 · Audit + Compliance
| Surface | Status | Notes |
|---|---|---|
| `services/auditLog.ts` (local ledger) | REAL | hooked: mission.dispatch · snapshot.export/restore · pack.install · repo.attach · policy.toggle |
| `components/AuditLogCard.tsx` (filter · export · clear) | REAL | Settings |
| `components/ComplianceCard.tsx` (6 policy toggles) | REAL | declarations only · runtime enforcement planned |
| `services/diagnostics.ts` (Markdown report download) | REAL | runtime + storage + brain + recent receipts + workflow runs |
| `services/brainHealth.ts` + Settings card (Optimize Brain) | REAL | drops duplicates · old receipts · unused workflow nodes · orphan files · archived inbox |

---

## 3 · REMOTE

> **Vision:** desktop owns the brain; phone is a controller. Capabilities
> spec'd in §6 below. Mapping the surface today:

### R1 · Telegram bridge
| Surface | Status | Notes |
|---|---|---|
| `services/telegramBridge.ts` (adapter seam) | REAL | `sendNotification`, `receiveInbound`, queue persisted in atlas store |
| `services/commandConsole.ts` (12 verbs) | REAL | `/status /brain /missions /receipt /run /pause /resume /approve /reject /workflows /ollama /help` |
| Settings → Telegram Companion (link code · commands · BridgeSimulator) | REAL | code generation + simulator that exercises real handlers |
| Real Telegram bot networking | PLANNED | adapter ready · needs `BOT_TOKEN` + long-poll wiring in Tauri runtime |
| `app/api/telegram/webhook/route.ts` (legacy webhook from earlier PromptFixer work) | LEGACY | server-side route from earlier project life; harmless · do not delete |

### R2 · Mobile Companion
| Surface | Status | Notes |
|---|---|---|
| `store/atlas.ts > pairingCode` (8-char generator + revoke) | REAL | persisted · operator can regenerate |
| Settings → Mobile Companion card (QR placeholder + capability spec) | PARTIAL | spec visible; native phone shell not built |
| Phone-side native app | PLANNED | see §6 spec |
| Capacitor / SwiftUI wrapper | PLANNED | not started |

### R3 · Notifications
| Surface | Status | Notes |
|---|---|---|
| `components/NotificationsBell.tsx` (HUD bell · live signals · `notificationsViewedAt`) | REAL | workflows awaiting approval · receipts ready · imports · inbox · Ollama up/down |
| Notification push to phone | PLANNED | adapter via Telegram bridge `sendNotification` |

---

## 4 · EXPANSION

### E1 · Repo Index
| Surface | Status | Notes |
|---|---|---|
| `services/repoIntelligence.ts` (8 templated mission actions) | REAL | Audit · Analyze · Roadmap · Security · Deploy · Refactor · Dead code · Architecture |
| `modules/atlas/panels/RepoWorkspace.tsx` (attach · detach · per-repo action buttons) | REAL | uses imported repo docs as context (no fetch) |
| `components/RepoContextCard.tsx` (mission-control attach) | REAL | adds to brain memory sources |
| Real GitHub clone + indexer | PLANNED | needs Tauri file-system + Git binding |

### E2 · Connector Hub
| Surface | Status | Notes |
|---|---|---|
| `components/PlannedSurfacesCard.tsx > ConnectorHubCard` (capability matrix) | REAL (the card itself) | rows are honest: GitHub `local-only` · Local folder `ready` · Gmail / Drive / Notion / Slack `planned` |
| Local folder import | REAL | MemoryVault drop / pick |
| Obsidian / Drive / Gmail / Notion / Slack adapters | PLANNED | none implemented |

### E3 · Cloud Sync
| Surface | Status | Notes |
|---|---|---|
| `CloudSyncCard` (architecture panel) | REAL (panel) | implementation: PLANNED |
| Encrypted brainpack at rest | PLANNED | passphrase wrapping not implemented |
| Multi-device sync protocol | PLANNED | adapter-only sketch |

---

## 5 · RELEASE

### L1 · Installers
| Surface | Status | Notes |
|---|---|---|
| `.github/workflows/release.yml` (tag-push CI for mac/win/linux) | REAL | publishes draft Release with sha256 checksums |
| Source build (`npm run tauri:build`) | REAL | produces native binary per platform |
| Public signed downloads | PLANNED | needs CI secrets |

### L2 · Signing
| Surface | Status | Notes |
|---|---|---|
| CI workflow accepts `APPLE_*` / `WINDOWS_*` / `TAURI_*` secrets | REAL | wired in jobs · skips when missing |
| macOS Developer ID + notarization | PLANNED | cert not provisioned |
| Windows EV / OV certificate | PLANNED | cert not acquired |
| Tauri updater signing keys | PLANNED | release feed not built |

### L3 · Payments
| Surface | Status | Notes |
|---|---|---|
| `app/founders/page.tsx` (local waitlist + activation codes) | REAL | localStorage + CSV admin export |
| `app/pricing/page.tsx` (Free · Pro · Operator tiers teaser) | REAL | static page |
| Stripe / Lemonsqueezy real billing | LEGACY (existing API routes from earlier project life) | not part of PromptReady OS desktop · do not delete |

### L4 · Public Beta
| Surface | Status | Notes |
|---|---|---|
| `/download` page (platform cards · quickstart · build-from-source · limitations · security) | REAL | honest status pills |
| `/roadmap` page (Phases 20-30 retired → replaced by this audit) | PARTIAL | accurate today · refresh to new pillars next slice |
| `/docs/demo-script` (9-beat 90-second walkthrough) | REAL | matches DEMO_CHECKLIST |
| `DEMO_CHECKLIST.md` (12-beat path · fallback table) | REAL | repo root |

---

## 6 · OPERATOR REMOTE · ADDITIONAL AUDIT

Vision: phone owns no brain state. Phone sends actions. Desktop is source of truth.

| Capability | Status | How it maps |
|---|---|---|
| See active mission | REAL | `/missions` and `/status` already return current receipt id + stage |
| Approve | REAL | `/approve <id>` → `resumeWorkflowRun` walks downstream nodes |
| Reject | REAL | `/reject <id>` marks the run blocked + audit-logged |
| Pause | REAL | `/pause` cancels current mission via existing `mission.cancel()` |
| Resume | REAL | covered by `/approve <id>` for workflow runs |
| Receive receipts | PARTIAL | `/receipt <id>` returns it on demand; **push** to phone PLANNED |
| Receive alerts | PARTIAL | local notification bell ready; push channel PLANNED |
| Capture text / image / url | PARTIAL | inbox already supports these kinds via MemoryVault; phone-side capture PLANNED |
| Send to inbox | PARTIAL | inbox API exists; phone-side dispatch PLANNED |
| Trigger workflow | REAL | command surface area covers this (`/approve` for paused; workflow run from desktop today) |
| Trigger repo analysis | PARTIAL | repo actions exist in RepoWorkspace; phone-trigger PLANNED |
| Emergency stop | REAL | `/pause` cancels current mission |
| View runtime health | PARTIAL | `/status` returns engine + brain summary; HUD-style view PLANNED on phone |
| View Ollama status | REAL | `/ollama` probes localhost · returns reachability + model list |
| View active agents | PARTIAL | data exists in atlas store; remote `/agents` verb PLANNED |
| Notifications | PARTIAL | bell is real; push channel PLANNED |

### R1–R6 audit answers
- **R1 · Does code already support remote control?** YES, at the handler level. `services/commandConsole.ts` ships 12 verbs that hit real stores. Phone-side is the missing piece.
- **R2 · What exists?** Pairing code (mobile + telegram, 8 chars). Command parser. Bridge adapter (`sendNotification`, `receiveInbound`). Local queue of bridge messages. Honest "not connected" badges.
- **R3 · What is missing?** Real network transport for both Telegram (long-poll on `/getUpdates`) and the mobile companion (native phone shell + WebSocket/QR pair handshake).
- **R4 · Can Telegram bridge become the first remote layer?** YES. The fastest path. Wire `BOT_TOKEN` in the Tauri runtime → swap `receiveInbound` for a polling loop. Same handlers run.
- **R5 · Can Mobile Companion become the secure controller?** YES. Reuses the same command grammar. Needs: native shell (Capacitor or SwiftUI/Compose), QR-based pair handshake using the existing `pairingCode`, scoped session tokens, destructive-action confirmation screens.
- **R6 · Security model targets:** phone approval gate on every destructive command · runtime lock (deny `/run` until phone confirms) · `pairingCode` revocable from desktop · session expiry after N minutes of inactivity · device revoke list in Settings.

### R7 · Remote Control roadmap mapping

| Item | Status | Handler today |
|---|---|---|
| RC1 · Receipt push | PARTIAL | `sendNotification()` already queues; needs Telegram/WebSocket transport |
| RC2 · Alerts | PARTIAL | Bell + bridge queue ready |
| RC3 · Inbox capture | REAL (desktop side) · PLANNED (phone side) | `useAtlasStore.addInbox` |
| RC4 · Mission control | REAL | `/missions` `/receipt` `/run` `/pause` |
| RC5 · Agent control | PARTIAL | atlas store + `tickAgent` exist; remote verbs PLANNED |
| RC6 · Runtime health | REAL | `/status` `/ollama` |
| RC7 · Safe remote actions | PARTIAL | command parser today; per-action approval gate PLANNED |
| RC8 · Preview mode | PLANNED | desktop screenshot endpoint not built |

---

## 7 · LEGACY (do not delete · move-only candidates)

> Per safety rules these are flagged, never removed.

| Path | Why flagged | Recommended bucket |
|---|---|---|
| `promptready-os/src/modules/multi-ai-launcher/` (README only) | empty scaffold from PromptFixer era · zero importers | LEGACY |
| `promptready-os/src/modules/prompt-fixer/` (README only) | empty scaffold · zero importers | LEGACY |
| `promptready-os/src/modules/prompt-vault/` (README only) | empty scaffold · zero importers | LEGACY |
| `promptready-os/src/modules/session-continuity/` (README only) | empty scaffold · zero importers | LEGACY |
| `promptready-os/src/modules/workflow-dashboard/` (README only) | empty scaffold · zero importers (NOT `modules/workflows` which is alive) | LEGACY |
| `promptready-os/src/modules/workspace-overlay/` (README only) | empty scaffold · zero importers | LEGACY |
| `promptready-os/src/store/prompts.ts` | Zustand store from PromptFixer; not imported anywhere current | LEGACY |
| `promptready-os/src/store/sessions.ts` | Same · earlier session model | LEGACY |
| `promptfixer-sidekick/app/api/telegram/webhook/route.ts` | Earlier project life · used by old PromptFixer alerts | LEGACY |
| `promptfixer-sidekick/app/api/*` (Stripe / payments / fix / clean / etc.) | Earlier project APIs · do not affect desktop build | LEGACY |
| `promptfixer-sidekick/app/(operator)` route group | Earlier project surfaces · not part of PromptReady OS demo | LEGACY |
| `promptfixer-sidekick/app/launch`, `app/floating`, `app/m`, `app/admin` | Earlier project routes · not on the demo path | LEGACY |
| `promptready-os/src/components/PlannedSurfacesCard.tsx > Phase IDs` (P26-P29 prose) | Talks in "Phase" language; should reframe to FOUNDATION/OPERATOR/REMOTE/EXPANSION/RELEASE | REMOVE-CANDIDATE (rewrite, not delete) |
| `promptready-os/src/components/RoadmapPanel.tsx` + `promptfixer-sidekick/app/roadmap/page.tsx` | Uses "Phase 20-30" framing | REMOVE-CANDIDATE (rewrite to new pillars · keep route) |

### REMOVE-CANDIDATE impact analysis (before any removal)

For each item above, here is the dependency / blast radius. **No action taken** without explicit approval.

| Item | Impact | Dependencies | Routes affected | Stores affected | Demo risk | Presentation risk |
|---|---|---|---|---|---|---|
| 6 empty module dirs | none · zero imports | none | none | none | none | none — safe to archive when ready |
| `store/prompts.ts` · `store/sessions.ts` | low · exported by `store/index.ts` but not consumed | re-exported (drop export too) | none | none | none | none — safe to archive |
| Old PromptFixer API routes | medium · still build into the Next bundle | webhook URLs in env / Stripe accounts | `/api/*` paths | none | low (not in demo path) | check live deploys before removal |
| Old PromptFixer route groups (`(operator)`, `/launch`, `/floating`, `/m`, `/admin`) | medium · still prerender | inbound links if any | those paths | none | low (not in demo path) | check analytics / live links |
| Reframe RoadmapPanel + `/roadmap` page from Phases to pillars | content-only · no API/store change | self-contained | `/settings`, `/roadmap` | none | low — Settings card stays present | low — content swap is safe |

---

## 8 · WHAT TO BUILD NEXT (Sellable Beta priorities only)

### Locked in for sellable beta (REAL)
- Atlas at `/` · 9 cells · 3 home modes · blueprint export
- Mission engine (deterministic + Ollama) · receipts · timeline · replay
- Workflow execution + approval resume
- Marketplace at `/marketplace` · 8 starter packs · install/export/import
- Brain spaces + switcher · Team Layer cell
- Agent runtime (operator-tick)
- Audit log + Compliance toggles
- Snapshots + Time Machine
- Setup wizard + Demo workspace + Telemetry dashboard + Release center
- CI release workflow

### Next slice for the "phone in the audience's pocket" moment
1. **Telegram bridge networking** (real `BOT_TOKEN` + long-poll). Single Tauri-side patch · unlocks RC1, RC2, RC4, RC6 in one shot.
2. **Phone-side approval screen** (web PWA at `/m/<code>?act=...`) — narrow surface, no native shell yet. Reuses the existing pairing code.
3. **Receipt push** (sendNotification on every `mission.dispatch` completion).
4. **Rewrite RoadmapPanel + `/roadmap`** in the new pillar language (FOUNDATION / OPERATOR / REMOTE / EXPANSION / RELEASE). No phase numbers.

### Explicit non-goals (TeamViewer trap)
- No full desktop duplication on phone
- No remote shell · no screen mirroring · no unrestricted control
- No chat app · no agent that runs without a tick

---

## 9 · DEMO IMPACT SUMMARY · presentation safety

- **Atlas intact.** All 9 cells live, blueprint export works, home mode toggle works.
- **Settings intact.** Order preserved: RoadmapPanel · SetupWizard · DemoWorkspace · RuntimeBus · OperatorMode · Release · Telemetry · AutoConfigure · Theme · BYOK · Local engine · Safety · Telemetry toggle · Mobile · Telegram · Compliance · Audit · BrainHealth · Snapshots · DesktopTrust · Packaging · Diagnostics · ConnectorHub · CloudSync · MobileRoadmap · EnterpriseServer · CommandConsole · BridgeSimulator.
- **Marketplace intact.** `/marketplace` works · 8 packs install for real.
- **Recovery banner intact.** Resume / Safe mode / Discard wired.
- **No file deleted in this audit pass.**
- **No store touched in this audit pass.**

This document is the new product status. Phase 1–30 framing is retired in copy-only follow-ups; no functional surface changes until you approve them.
