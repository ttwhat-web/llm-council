# PromptFixer · AI Command Center

**Mission control for AI workflows.** A web-first console (with an optional
Tauri desktop shell) that routes, supervises and deploys execution-ready
prompts for Claude, ChatGPT, Cursor and agents. Three ways to run the AI
engine — pick the one that fits how you ship.

```
INPUT
  → cleaner.ts          (strip noise / smart-quotes / filler)
  → mode detection      (auto, or explicit)
  → engine.ts           (Role · Task · Context · Constraints · Output Format)
  → providers/index.ts  (route to cloud / ollama / deterministic)
  → controller.ts       (supervisor pass — JSON contract; deterministic skips it)
  → safety.ts           (terminal-mode danger screen)
OUTPUT
```

## AI execution modes

| Mode                | Who it's for                                  | Where the AI runs                       | Cost owner       |
| ------------------- | --------------------------------------------- | --------------------------------------- | ---------------- |
| **Free / Web**      | Default for web + iPhone users                | Cloud provider via server-side proxy    | App owner (you)  |
| **Pro / Cloud**     | Paying users — higher limits, flagship models | Cloud provider via server-side proxy    | App owner (you)  |
| **Local Ollama**    | Mac power users — *unlimited & private*       | The user's own Mac (`ollama serve`)     | The user         |

> The VPS hosts the Next.js app, API routes, auth/billing, and the cloud
> provider proxy. **It does not host heavy local models.** That keeps the
> server cheap and lets Mac users opt in to unlimited local inference on
> their own hardware.

### Routing rules

The engine selector in the UI (and `engine` field on `/api/fix`) drives this:

```
engine = "deterministic" → deterministic   (never calls out)
engine = "ollama"        → ollama → cloud → deterministic    (if ollama unconfigured)
engine = "cloud"         → cloud  → deterministic            (if cloud  unconfigured)
engine = "auto"          → cloud  → ollama → deterministic   (cloud preferred for web)
```

`AI_ENGINE` in `.env.local` pins the default when the request doesn't specify.

---

## 1. Default web setup

The fastest path: a free user on the web hits your VPS, the server calls a
cloud provider, the user gets an answer. Nothing installed locally.

```bash
cp .env.example .env.local
# Set at least one of:
#   ANTHROPIC_API_KEY=sk-ant-...
#   OPENAI_API_KEY=sk-...

npm install
npm run dev    # http://localhost:3030
```

That's it. Engine selector defaults to **Auto** → resolves to **Cloud AI**.

## 2. Cloud AI setup

Same path as above. Detail:

- Keys live **only** in `.env.local` / your VPS env. They are **never** sent
  to the browser. All cloud calls happen inside `app/api/fix/route.ts`.
- Anthropic is preferred when both keys are set. Override defaults:
  ```env
  CLOUD_MODEL_FREE=claude-haiku-4-5-20251001
  CLOUD_MODEL_PRO=claude-sonnet-4-6
  ```
- Free tier maps to the cheap/fast model; Pro tier maps to the flagship.
  Tier is currently `free` for everyone (no auth yet) — wire your billing
  layer into `app/api/fix/route.ts` to flip it.

## 3. Optional Ollama local setup (Mac)

Marketed as: **"Unlimited local mode — runs on your own Mac."**

PromptFixer maps the user's quality choice to a *named profile* on your
local Ollama. You don't pick a model name in the UI — you pick a quality.
The four profiles are independently configurable via env, so you can swap
in whatever fits your hardware.

| Profile | Used by quality            | Default model      | Notes                                  |
| ------- | -------------------------- | ------------------ | -------------------------------------- |
| Fast    | `fast`                     | `gemma2:2b`        | Low-resource fallback. Not the headline.|
| Smart   | `smart`, `expert`, `local` | `gemma4`           | Daily-driver supervisor.               |
| Code    | `code`                     | `qwen2.5-coder:7b` | Also used for Terminal & AS400 work.   |
| Agent   | (reserved)                 | `hermes3`          | Experimental agent-mode profile.       |

### Recommended setup

```bash
# 1. Install Ollama
brew install ollama   # or curl -fsSL https://ollama.com/install.sh | sh
ollama serve          # leave running

# 2. Pull the recommended local model set
ollama pull gemma4              # smart supervisor (default for Local quality)
ollama pull qwen2.5-coder:7b    # code / terminal / AS400
ollama pull hermes3             # experimental agent
ollama pull gemma2:2b           # fast fallback / low-resource

# 3. Point the app at it (Mac-only — do NOT do this on the VPS)
echo 'OLLAMA_BASE_URL=http://127.0.0.1:11434' >> .env.local

# 4. Restart `npm run dev` and pick the "Local" quality.
```

You don't need every model — pull whatever you'll use. PromptFixer falls
back through `OLLAMA_FALLBACKS`, then to the deterministic engine. **It
will not silently call cloud** when an Ollama profile is missing unless
`Allow cloud fallback` is explicitly toggled on.

### Override profile models

```env
OLLAMA_FAST_MODEL=gemma2:2b
OLLAMA_SMART_MODEL=gemma4
OLLAMA_CODER_MODEL=qwen2.5-coder:7b
OLLAMA_AGENT_MODEL=hermes3
# OLLAMA_FALLBACKS=gemma4,qwen2.5-coder:7b,gemma2:2b
```

The bundled Tauri desktop app (`npm run tauri:dev`) is the canonical way
to ship this to Mac users — same UI, runs locally, talks to the user's
own Ollama daemon.

> **Note on `gemma4`**: the public Ollama registry is moving fast — if
> `gemma4` isn't yet a valid tag on your machine, point `OLLAMA_SMART_MODEL`
> at whatever Gemma generation is current (e.g. `gemma3` / `gemma2:9b`).
> The product positions `gemma2:2b` purely as the *fast fallback* — it is
> no longer the headline model.

## 4. Why the VPS does not run heavy models

- **Cost.** A Mistral-7B / Gemma-7B / Llama-3-8B on a CPU VPS is unusable;
  on a GPU VPS it costs $200–800 / month idling.
- **Latency.** A small VPS hitting a 7B model gives ~10–30 s/response. Cloud
  APIs return in 1–3 s with no infra to babysit.
- **Concurrency.** A single Ollama process blocks per request. Two users at
  once degrade to serial. Cloud providers parallelise across their fleet.
- **Footprint.** The Next.js app + API routes fits comfortably on a $5
  VPS. Adding a model server requires a different machine class.
- **Privacy story.** Mac users who genuinely want privacy run the model
  *on their own machine* — not on yours. That is a stronger guarantee than
  "we promise we won't log it."

If you ever do want a server-hosted model, set up a separate GPU box and
point a *non-localhost* `OLLAMA_BASE_URL` at it; production refuses
non-localhost Ollama unless you explicitly set `OLLAMA_ALLOW_REMOTE=1`.

## 5. Usage limit model

In-process, daily, per-IP — replace with Redis/KV when you go multi-instance.

| Tier | Default     | Env var              | Counts what?              |
| ---- | ----------- | -------------------- | ------------------------- |
| free | 10 / day    | `FREE_DAILY_LIMIT`   | Cloud calls only          |
| pro  | 1000 / day  | `PRO_DAILY_LIMIT`    | Cloud calls only          |

Local Ollama and deterministic runs are **never** metered (they cost you
nothing). Limits live in `lib/usage.ts`. The route returns a `429` with a
`usage` snapshot when the bucket is exhausted, plus standard
`X-RateLimit-*` headers.

## 6. Future billing plan

The seams are already cut so you can drop billing in without touching the UI:

1. **Auth** — add NextAuth (or Clerk) at `/api/auth/*`.
2. **Tier resolver** — replace the hard-coded `tier = "free"` in
   `app/api/fix/route.ts` with a lookup against the session/JWT.
3. **Stripe** — checkout → webhook → flip the user's tier in your DB.
4. **Storage** — swap the in-memory `Map` in `lib/usage.ts` for Redis or
   Vercel KV. Keys are already namespaced as `tier:client:day`.
5. **Pricing page** — surface what each tier gets (limit, model, support).

No changes required to providers, controller, or engine logic.

---

## API surface

### `POST /api/fix`

Request:
```json
{
  "input": "fix this code its broken node express error",
  "mode": "dev",            // optional; auto-detected when autoMode = true
  "engine": "auto",         // auto | cloud | ollama | deterministic
  "autoMode": true
}
```

Response (`200`):
```json
{
  "ok": true,
  "mode": "dev",
  "detectedMode": "dev",
  "cleaned": "...",
  "prompt": "# Role ...",
  "sections": { "role": "...", "task": "...", "context": "...", "constraints": [...], "outputFormat": "..." },
  "safety":   { "blocked": false, "requiresConfirmation": false, "findings": [] },
  "supervisor": {
    "used": true,
    "engine": "cloud",
    "requestedEngine": "auto",
    "resolved": "cloud-anthropic",
    "fallbackUsed": false,
    "model": "claude-haiku-4-5-20251001",
    "latencyMs": 612,
    "notes": "tightened output_format; removed redundant tone constraint"
  },
  "usage": { "tier": "free", "used": 3, "limit": 10, "remaining": 7, "resetAt": "..." },
  "elapsedMs": 743
}
```

Returns `429` with the same `usage` snapshot when the daily cap is hit.

### `POST /api/clean`

Pure deterministic cleaner. No AI call. No quota.

### `GET /api/health`

```json
{
  "ok": true,
  "version": "1.1.0",
  "defaultEngine": "auto",
  "cloud":  { "id": "cloud",  "configured": true,  "reachable": true,  "vendor": "anthropic", "model": "claude-haiku-4-5-20251001" },
  "ollama": { "id": "ollama", "configured": false, "reachable": false, "error": "OLLAMA_BASE_URL not set." },
  "deterministicAvailable": true,
  "limits": { "free": 10, "pro": 1000 }
}
```

The UI status panel polls this on mount and on the **Refresh** button.

---

## File map

```
promptfixer-sidekick/
├── app/
│   ├── api/
│   │   ├── clean/route.ts        deterministic cleaner only
│   │   ├── fix/route.ts          full pipeline + tier limits
│   │   └── health/route.ts       cloud + ollama + default engine
│   ├── floating/page.tsx         borderless overlay (Tauri target)
│   ├── layout.tsx
│   └── page.tsx                  web companion
├── components/
│   ├── PromptFixer.tsx           main interactive surface (web + floating)
│   ├── ModeSelect.tsx            prompt mode dropdown
│   ├── EngineSelect.tsx          engine dropdown (Auto / Cloud / Ollama / Rules)
│   ├── EngineStatus.tsx          live status panel (cloud + ollama + active)
│   ├── SafetyBadge.tsx           terminal-mode safety findings
│   ├── Toggle.tsx
│   └── CopyButton.tsx
├── lib/
│   ├── ai.ts                     orchestrator
│   ├── cleaner.ts                noise stripper
│   ├── controller.ts             supervisor JSON contract
│   ├── engine.ts                 mode detection + prompt builder
│   ├── modes.ts                  7 mode profiles incl. AS400
│   ├── safety.ts                 destructive-command rules
│   ├── usage.ts                  daily per-IP limiter
│   ├── providers/
│   │   ├── index.ts              router (auto/cloud/ollama/deterministic)
│   │   ├── cloud.ts              Anthropic + OpenAI (server-side only)
│   │   ├── ollama.ts             local-only by default
│   │   ├── deterministic.ts      no-op sentinel
│   │   └── types.ts              Provider interface
│   └── types.ts
└── desktop/
    └── src-tauri/                Tauri shell: tray, Cmd+Shift+P, transparent window
```

## Run the floating desktop window

```bash
npm run tauri:dev   # Cmd/Ctrl + Shift + P toggles
npm run tauri:build # release binary
```

See `desktop/README.md` for prerequisites.
