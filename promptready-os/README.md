# PromptReady OS

> The operating system for serious AI users.

Desktop-first AI workspace. Prompt optimisation, multi-AI orchestration,
session continuity, prompt memory and a floating workspace overlay — in one
calm, premium product.

This document is the **architecture spec + scaffold map**. The repo at this
commit contains the bones (tokens, schema, stores, layouts, routes, Tauri
shell). The MVP phase plan at the bottom covers what gets built into the
empty modules and in what order.

---

## 1 · Why this exists

People constantly lose:

- prompts they spent 20 minutes refining
- the model they were halfway through a conversation with
- the browser tab they had Cursor / Claude / ChatGPT / Gemini open in
- the output they meant to copy before the tab crashed

…across at least four AI tools and one local model.

**PromptReady OS solves this.** Not by being yet another wrapper, but by
being the layer above all of them — where prompts live, sessions persist,
and the user always has a way back to where they were.

The closest analogues, blended:

- Apple — calm, premium, opinionated defaults
- Linear — keyboard-first, dense without clutter
- Raycast — palette-driven, instant
- Arc — opinions about the workspace, not just the document
- Notion AI — durable surface for AI work

This is **not** another chatbot, another wrapper, or another generic AI app.
Every feature must support continuity, speed, clarity, reliability, and
workflow preservation.

---

## 2 · Stack

| Layer        | Choice                                | Why                                                 |
| ------------ | ------------------------------------- | --------------------------------------------------- |
| Shell        | **Tauri 1.6**                         | Native binary, ~5–20 MB, real OS keychain, tray, global shortcuts, transparent windows |
| UI runtime   | **React 18 + TypeScript + Vite**      | Fastest dev loop in the React ecosystem; Tauri's first-class pairing |
| Styling      | **Tailwind CSS** (tokens via CSS vars) | Centralised tokens in `tokens.css`; Tailwind utility names stay readable |
| Motion       | **Framer Motion**                     | Apple-grade easings (`pr-easing-snap`, `precise`, `decel`) |
| State        | **Zustand**                           | Tiny, no Provider hell, slice-per-domain; trivially testable |
| Data         | **SQLite** (via `tauri-plugin-sql`)   | Local-first, FTS5 for search, WAL mode, fast |
| Routing      | **React Router 6**                    | Browser-style routing inside the Tauri webview |
| Secrets      | **OS keychain** via Tauri stronghold   | Never plaintext on disk; BYOK |
| Build target | macOS, Windows, Linux                 | Tauri bundles for all three from one codebase |

**Explicit non-choices:**

- **No Next.js / SSR.** The product is local-first; an HTTP server adds
  attack surface without value. Cloud features (sync, share) come later
  as an *optional companion* the user opts into.
- **No Electron.** Binary size, perf, OS integration, and trust all favour
  Tauri.
- **No Redux / RTK.** Zustand slices are simpler and easier to keep modular.
- **No GraphQL.** SQLite + Zustand selectors do everything a frontend
  needs without the operational overhead.

---

## 3 · Folder tree

```
promptready-os/
├── README.md                           ← this file
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── src/
│   ├── main.tsx                        bootstrap
│   ├── App.tsx                         hydrate settings + mount router
│   ├── routes.tsx                      route registry + module placeholders
│   ├── design/
│   │   ├── tokens.css                  ← single source of truth for the visual system
│   │   └── tokens.ts                   ← TypeScript mirror for Framer / charts
│   ├── styles/
│   │   └── globals.css                 base + glass utilities
│   ├── database/
│   │   ├── schema.sql                  full SQLite schema (FTS5 + triggers)
│   │   ├── client.ts                   thin DB client + JSON helpers + uuid()
│   │   └── migrations/                 forward-only NNNN_*.sql files
│   ├── store/                          Zustand stores — one slice per domain
│   │   ├── index.ts                    barrel export + ownership map
│   │   ├── prompts.ts
│   │   ├── sessions.ts
│   │   └── settings.ts                 (fixer / launcher / overlay / dashboard land per phase)
│   ├── modules/                        product modules (each is a mini-app)
│   │   ├── prompt-fixer/               → README.md + later: route.tsx, components/
│   │   ├── multi-ai-launcher/
│   │   ├── session-continuity/
│   │   ├── prompt-vault/
│   │   ├── workspace-overlay/
│   │   └── workflow-dashboard/
│   ├── components/
│   │   └── primitives/
│   │       ├── Button.tsx              accent / ghost / outline / danger × sm / md
│   │       ├── Panel.tsx               subtle / glass / strong glass surfaces
│   │       └── KbdHint.tsx             ⌘ ⌃ ⇧ ⌥ ↵ chip
│   ├── layouts/
│   │   └── ShellLayout.tsx             left rail + drag-region header + <Outlet/>
│   ├── services/                       external integrations (one file per provider)
│   ├── hooks/                          shared hooks
│   ├── lib/                            pure utilities
│   ├── features/                       cross-module composite features
│   └── types/
│       └── index.ts                    type registry — single import surface
└── src-tauri/
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json                 main + overlay windows, tray, shortcuts
    └── src/
        └── main.rs                     tray, global shortcuts, window lifecycle
```

---

## 4 · Module map

Every module is a mini-app with a tight contract:

> A module owns one Zustand store, exposes one or more routes, talks to
> the outside world only through `services/`, and never imports another
> module's components directly.

| Module                | Owns store           | Routes                          | Phase |
| --------------------- | -------------------- | ------------------------------- | ----- |
| **PromptFixer**       | `useFixerStore`      | `/fixer`, `/fixer/floating`     | 1     |
| **Multi AI Launcher** | `useLauncherStore`   | `/launcher` + embedded chip     | 2     |
| **Session Continuity**| `useSessionsStore`   | `/sessions` + recovery banner    | 3     |
| **Prompt Vault**      | `usePromptsStore`    | `/vault`, `/vault/:id`          | 4     |
| **Workspace Overlay** | `useOverlayStore`    | `/overlay` (separate window)    | 5     |
| **Workflow Dashboard**| `useDashboardStore`  | `/` (root)                      | 6     |

Per-module README files live in `src/modules/<name>/README.md`. Each one
documents its responsibility, services consumed, state owned, routes
exposed, and (where relevant) the lift map from the existing PromptFixer
Sidekick code.

---

## 5 · State architecture

Zustand, slice-per-domain. Reads are free across slices; writes go
through actions on the owning slice.

```
useSettingsStore     → AppSettings (theme, providers, shortcuts, autosave window, telemetry consent)
usePromptsStore      → prompts, folders, tags, filter, selected, FTS-backed `visible()`
useSessionsStore     → sessions, drafts, snapshots, recoverable, autosave wiring
useFixerStore        → transient (current input, mode, quality, last result)
useLauncherStore     → enabled providers, recent targets, success counts
useOverlayStore      → overlay visibility, position, mode
useDashboardStore    → cached aggregates from usage_events
```

**Hydration order** (in `App.tsx`):

1. `useSettingsStore.hydrate()` — synchronous-ish, blocks first paint
2. The owning module's first effect calls `load()` for everything else
3. `useSessionsStore.load()` populates `recoverable`; the shell's
   recovery banner picks it up

This avoids a global `<Provider>` while still keeping startup ordered.

---

## 6 · Database schema

Single SQLite file, WAL mode. Full DDL lives in
[`src/database/schema.sql`](src/database/schema.sql). High-level shape:

```
folders ─────┐
             ├── prompts ─── prompt_tags ─── tags
             │       │
             │       └── prompts_fts (FTS5, trigger-synced)
             │
sessions ────┼── snapshots
             │
drafts ──────┘

workflows ─── workflows_fts
usage_events                  (analytics, append-only)
settings                      (key-value, JSON values)
secret_refs                   (handles to OS keychain entries — no plaintext)
```

Highlights:

- **WAL + FK on + synchronous=NORMAL.** Durability without grinding writes.
- **FTS5 with `tokenize='unicode61 remove_diacritics 2'`** so search
  matches across accents and casing.
- **Triggers** keep `prompts_fts` in sync with `prompts` on insert /
  update / delete — the store layer never touches FTS directly.
- **No secrets in SQL.** `secret_refs` holds opaque handles into the OS
  keychain; the actual API keys live in macOS Keychain / Windows
  Credential Manager / libsecret via `tauri-plugin-stronghold`.

---

## 7 · Routing system

React Router 6. The shell owns the chrome (left rail + drag-region
header); modules own everything inside `<Outlet />`.

```
/                  Dashboard                (workflow-dashboard)
/fixer             PromptFixer Mission Ctrl (prompt-fixer)
/fixer/floating    PromptFixer compact      (prompt-fixer, secondary surface)
/launcher          Multi AI Launcher        (multi-ai-launcher)
/vault             Prompt Vault library     (prompt-vault)
/vault/:id         Prompt detail            (prompt-vault)
/sessions          Continuity timeline      (session-continuity)
/settings          Preferences              (settings module)

/overlay           Floating overlay         (workspace-overlay) — separate Tauri window
```

The overlay is a **separate Tauri window** (declared in `tauri.conf.json`)
but shares the same React build via the `/overlay` route. It loads only
the overlay module's slice of state, so it summons in <80 ms.

---

## 8 · Design system

### Tokens — `src/design/tokens.css`

CSS custom properties are the single source. Tailwind reads them via
`var(--pr-*)` indirection so utility names stay readable while the values
stay centralised. Mirrored in `tokens.ts` for use in Framer Motion
variants and SVG charts.

Tracks:

- **Color**: 11-step graphite scale + accent (`#7c9bff`) + semantic
  (emerald / amber / rose) + glow tints
- **Surface**: 3-step glass scale, 3-step border scale, 3-step blur scale
- **Spacing**: 4-pt grid (`space-1` … `space-16`)
- **Radius**: `xs sm md lg xl 2xl pill`
- **Type**: 8-step scale (`text-2xs` … `text-3xl`) + tracking presets
- **Motion**: 5 durations (`instant fast base slow cinematic`) × 3
  easings (`snap precise decel`)
- **Shadows**: `glass`, `glow`, `pop`

### Primitives — `src/components/primitives/`

The minimum set needed to compose every module without bespoke styling:

- `Button` — accent / ghost / outline / danger × sm / md
- `Panel` — `subtle / glass / strong` glass surfaces, optional label + tag header
- `KbdHint` — uniform `⌘ ⌃ ⇧ ⌥ ↵` chip

Pattern primitives that land per phase: `Dialog`, `Toast`, `Tabs`,
`Tooltip`, `Combobox`, `Toolbar`. All consume tokens, not raw values.

### Visual rules

- Matte graphite background (radial gradient with one warm accent + one
  emerald hint, both ≤6% opacity)
- Frosted translucent panels — never solid
- Thin borders only (`var(--pr-border-1)` / `border-2` / `border-3`)
- Subtle bloom only — no neon, no rainbow gradients, no gamer chrome
- Motion is short (140–200 ms) and uses `pr-easing-snap`
- Spacing > information density
- One accent colour per panel

---

## 9 · MVP implementation plan

> Phases ordered for fastest credible product. Each phase ships a usable
> surface; later phases add depth, not just features.

### Phase 1 · PromptFixer foundation (≈ 1 week)

- Lift `lib/{cleaner,engine,modes,safety,score,insights,quality,actions,
  templates}.ts` from `promptfixer-sidekick/` into
  `src/modules/prompt-fixer/`.
- Lift cloud / ollama / deterministic providers into
  `src/services/{cloud,ollama,deterministic}.ts`. Replace the Next.js
  API routes with Tauri commands so keys stay in Rust.
- Wire `useFixerStore`. Wire SQLite reads/writes for sessions + drafts.
- Recreate the 3-column Mission Control surface inside `modules/prompt-fixer/`.
- BYOK settings panel: paste API keys into the keychain via
  `tauri-plugin-stronghold`.

**Definition of done:** identical PromptFixer experience to the existing
Sidekick, but native, with sessions persisting in SQLite and BYOK keys.

### Phase 2 · Multi AI Launcher (≈ 3–4 days)

- `services/{claude,chatgpt,gemini,perplexity,openrouter,cursor}.ts`:
  build the URL, copy the prompt, open the browser.
- "Send to" pill on every PromptFixer result.
- `/launcher` page: 6-card grid + recent targets + smart-routing pills.
- `usage_events` writes per launch; the dashboard picks up the data.

### Phase 3 · Session Continuity (≈ 4–5 days)

- Autosave drafts on a `useSettings.autosaveMs` debounce.
- Recovery banner on app open.
- `/sessions` timeline: left rail = days, right pane = session detail
  with snapshot diff.
- "Resend" affordance for failed-cloud sessions once the key is back.

### Phase 4 · Prompt Memory Vault (≈ 1 week)

- Folders + tags CRUD UI.
- FTS5-backed search (debounced 80 ms).
- Pinned / recent / favourites views.
- Workflow chains (compose ordered prompts).
- Export menu (lift `lib/exports.ts` from PromptFixer Sidekick).

### Phase 5 · Workspace Overlay (≈ 4 days)

- Separate Tauri window, transparent, always-on-top, 360×480.
- Global shortcut (`Cmd/Ctrl + Shift + O`) — already wired in
  `src-tauri/src/main.rs`.
- Quick prompt enhance, save to vault, send to model.
- (Stretch) macOS Accessibility integration: read selection / paste back.

### Phase 6 · Workflow Dashboard (≈ 3 days)

- 5-panel home view (recent / active / favourites / telemetry / insight).
- Aggregations are SQL `GROUP BY` over `usage_events` indexed on
  `(ts, module)`.
- Sparklines only — no chart library.

### Phase 7 · Cloud companion (optional, post-MVP)

- Optional sync. The desktop is canonical; the cloud is a mirror.
- End-to-end encrypted (libsodium), keys held by the user.
- Powers Phase 8: shared workflows, teams.

---

## 10 · Scalable module strategy

How we add modules without each one increasing the cognitive cost of
the others:

1. **A module is a directory under `src/modules/<name>/`** containing at
   minimum a `README.md`. When it ships UI, it adds `route.tsx`, a
   `components/` folder, and (if it owns state) a slice in
   `src/store/<name>.ts`.
2. **Modules talk via stores, not imports.** A module never imports
   another module's components, hooks or services. If two modules need
   to share something, lift it to `src/components/primitives/`,
   `src/lib/`, or `src/services/`.
3. **Services are the only IO boundary.** Every external call (Tauri
   command, HTTP, OS clipboard, opener) lives in `src/services/`. Modules
   import services, never raw `fetch` / `invoke`.
4. **Routes are added in `src/routes.tsx`.** No magic discovery. The
   route registry stays small enough to scan in 30 seconds.
5. **Settings always defaults safe.** New module config goes in
   `useSettingsStore` with a sensible default; users opt into riskier
   behaviour explicitly.
6. **Each module's `README.md` is the spec.** Anyone (human or LLM)
   should be able to read the README and understand the module's surface
   before opening any TSX.

---

## 11 · Migration map · PromptFixer Sidekick → PromptReady OS

The existing `promptfixer-sidekick/` carries most of Phase 1 already.
Lift, don't rewrite.

| Sidekick path                                           | OS path                                                       | Notes |
| ------------------------------------------------------- | ------------------------------------------------------------- | ----- |
| `lib/cleaner.ts`                                        | `src/modules/prompt-fixer/cleaner.ts`                         | Pure, drop-in |
| `lib/engine.ts`                                         | `src/modules/prompt-fixer/engine.ts`                          | Pure, drop-in |
| `lib/modes.ts`                                          | `src/modules/prompt-fixer/modes.ts`                           | Pure, drop-in |
| `lib/safety.ts`                                         | `src/modules/prompt-fixer/safety.ts`                          | Pure, drop-in |
| `lib/score.ts`                                          | `src/modules/prompt-fixer/score.ts`                           | Pure, drop-in |
| `lib/insights.ts`                                       | `src/modules/prompt-fixer/insights.ts`                        | Pure, drop-in |
| `lib/quality.ts`                                        | `src/modules/prompt-fixer/quality.ts`                         | Read API keys via `services/secrets.ts` instead of `process.env` |
| `lib/actions.ts`                                        | `src/modules/prompt-fixer/actions.ts`                         | Pure, drop-in |
| `lib/templates.ts`                                      | `src/modules/prompt-fixer/templates.ts`                       | Pure, drop-in |
| `lib/exports.ts`                                        | `src/services/exports.ts`                                     | Used by Vault too |
| `lib/diff.ts`                                           | `src/lib/diff.ts`                                             | Pure |
| `lib/missionLog.ts`                                     | `src/modules/prompt-fixer/missionLog.ts`                      | Pure, drop-in |
| `lib/agentActions.ts`                                   | `src/modules/prompt-fixer/agentActions.ts`                    | Pure, drop-in |
| `lib/providers/{cloud,ollama,deterministic}.ts`         | `src/services/{cloud,ollama,deterministic}.ts`                | Replace `fetch` with `tauri.invoke('pf_*')` for key-bearing calls |
| `lib/controller.ts`                                     | `src/modules/prompt-fixer/supervisor.ts`                      | Pure, drop-in |
| `lib/ai.ts`                                             | `src/modules/prompt-fixer/pipeline.ts`                        | Now writes sessions + snapshots via `useSessionsStore` |
| `lib/usage.ts`                                          | `src/services/usage.ts`                                       | Local-only by default; cloud companion (Phase 7) hosts the rate limiter |
| `lib/history.ts`                                        | DELETE — replaced by `useSessionsStore` + SQLite               | |
| `lib/clientContext.ts`                                  | `src/lib/clientContext.ts`                                     | Now always `desktop` since this is a Tauri app |
| `app/api/{fix,clean,health,preview,architect}/route.ts` | Tauri commands `pf_{fix,clean,health,preview,architect}`        | Cloud-key handling moves into Rust |
| `components/` (all of them)                              | Decompose into `src/components/primitives/` + module-owned UI   | The 3-column Mission Control surface lifts whole into `modules/prompt-fixer/` |

The migration is concrete — but it's a deliberate Phase 1 task, not
something to fold into this scaffold commit.

---

## 12 · What ships in *this* commit

Real, runnable scaffold:

- `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`,
  `postcss.config.js`, `index.html`, `.gitignore`
- `src/design/tokens.{css,ts}`
- `src/styles/globals.css` (glass utilities)
- `src/database/schema.sql` (full DDL incl. FTS5)
- `src/database/client.ts` (interface + stub + helpers)
- `src/store/{index,prompts,sessions,settings}.ts` (Zustand slices, typed,
  with `// TODO(phase-1)` markers where wiring lands)
- `src/types/index.ts` (full type registry)
- `src/components/primitives/{Button,Panel,KbdHint}.tsx`
- `src/layouts/ShellLayout.tsx`
- `src/{App,main,routes}.tsx`
- `src/modules/<each>/README.md` — six per-module specs
- `src-tauri/{Cargo.toml,build.rs,tauri.conf.json,src/main.rs}` —
  main + overlay window, system tray, ⌘K + ⌘⇧O global shortcuts wired

What it gives you, immediately:

- `npm install && npm run dev` boots a calm, dark, branded shell with
  navigable placeholder pages for every future module.
- `npm run tauri:dev` (after `cargo install tauri-cli`) runs it inside
  the native shell with the tray icon and shortcuts active.
- The architecture is auditable as code, not just prose.

What it deliberately does **not** ship in this commit:

- Module implementations (those are Phase 1+ per the plan above).
- A migration of PromptFixer Sidekick code (Phase 1 task, deliberate).
- Auth, billing, cloud sync, accounts (Phase 7+).

---

## 13 · Run it

```bash
cd promptready-os
npm install

# web preview (no Tauri shell)
npm run dev                       # http://localhost:1420

# native desktop shell
cargo install tauri-cli           # one time
npm run tauri:dev
```

Build a release binary:

```bash
npm run tauri:build
# artifacts: src-tauri/target/release/bundle/{dmg,msi,deb,…}
```

---

## 14 · Philosophy

This is **not** a hackathon demo, a chatbot, or a wrapper.

It is a workflow operating system for power AI users.

Every feature we ship must support continuity, speed, clarity,
reliability, and workflow preservation. If a feature can't justify
itself against those five words, it doesn't ship.
