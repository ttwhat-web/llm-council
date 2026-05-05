# PromptFixer Sidekick

A floating, always-on-top prompt optimiser with a matching Next.js web UI.
Local-first: a deterministic engine builds your prompt; a local Gemma model
(via Ollama) acts as a **supervisor** — auditing, tightening, and validating —
not as the writer.

```
INPUT
  → cleaner.ts          (strip noise / smart-quotes / filler)
  → mode detection      (auto, or explicit)
  → engine.ts           (Role / Task / Context / Constraints / Output Format)
  → safety.ts           (terminal-mode danger screen)
  → controller.ts       (Gemma supervisor pass — optional)
OUTPUT
```

## Modes

| Mode        | Use when…                                                  |
| ----------- | ---------------------------------------------------------- |
| Claude      | Targeting Anthropic Claude (XML-tagged sections)           |
| ChatGPT     | Targeting OpenAI ChatGPT (markdown, action-first)          |
| Dev         | Engineering: code review, refactor, debugging              |
| Terminal    | Shell automation — runs a destructive-command safety pass  |
| Business    | Memos, briefs, executive comms                             |
| General     | Balanced default                                           |
| AS400       | IBM i / RPG / COBOL / DB2 for i — audit-friendly tone      |

## Quick start

### 1. Install Ollama

```bash
# macOS
brew install ollama
# Linux
curl -fsSL https://ollama.com/install.sh | sh
# Windows
winget install Ollama.Ollama
```

Start the daemon:

```bash
ollama serve
```

### 2. Pull the supervisor model

```bash
ollama pull gemma2:2b
# fallbacks
ollama pull llama3:8b
ollama pull mistral:7b
```

> The brief calls for `gemma4:e4b`. Until that public alias exists in the
> Ollama registry, the closest small Gemma in the same family is `gemma2:2b`
> (~1.6 GB, runs on CPU). Override with `OLLAMA_MODEL` in `.env.local`.

### 3. Run the web app

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3030.

### 4. Run the floating desktop window (Tauri)

You need the Rust toolchain (`rustup`) and the system webview deps. See
[Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites).

```bash
npm run tauri:dev
```

Toggle with **`Cmd/Ctrl + Shift + P`** or the system tray icon.

To build a signed release binary:

```bash
npm run tauri:build
```

## Configuration

`.env.local` (copy from `.env.example`):

| Variable            | Default                       | Purpose                                |
| ------------------- | ----------------------------- | -------------------------------------- |
| `OLLAMA_HOST`       | `http://127.0.0.1:11434`      | Ollama HTTP endpoint                   |
| `OLLAMA_MODEL`      | `gemma2:2b`                   | Supervisor model                       |
| `OLLAMA_FALLBACKS`  | `llama3:8b,mistral:7b`        | Comma-separated fallback chain         |
| `OLLAMA_TIMEOUT_MS` | `12000`                       | Hard cap on a supervisor call          |

In the UI:

- **Auto** — detect mode from the input.
- **Use Local AI (Ollama)** — when off, ships the deterministic prompt
  immediately. When on, runs the Gemma supervisor pass and falls back to the
  deterministic prompt if Ollama is unreachable.

## Architecture

```
promptfixer-sidekick/
├── app/
│   ├── api/
│   │   ├── clean/route.ts    POST  - deterministic cleaner only
│   │   ├── fix/route.ts      POST  - full pipeline
│   │   └── health/route.ts   GET   - reports Ollama reachability + model list
│   ├── floating/page.tsx           - borderless overlay (loaded by Tauri)
│   ├── layout.tsx                  - dark-mode root layout
│   └── page.tsx                    - web companion
├── components/
│   ├── PromptFixer.tsx             - main interactive surface (web + floating)
│   ├── ModeSelect.tsx              - mode dropdown
│   ├── SafetyBadge.tsx             - terminal-mode safety findings
│   ├── Toggle.tsx
│   └── CopyButton.tsx
├── lib/
│   ├── ai.ts                       - pipeline orchestrator
│   ├── cleaner.ts                  - deterministic noise stripper
│   ├── controller.ts               - Gemma supervisor (JSON contract)
│   ├── engine.ts                   - mode detection + prompt builder
│   ├── modes.ts                    - mode profiles
│   ├── ollama.ts                   - HTTP client w/ fallback chain + timeout
│   ├── safety.ts                   - destructive-command rules
│   └── types.ts
└── desktop/
    └── src-tauri/                  - Rust shell: tray, global shortcut, transparent window
```

### Pipeline contract

`lib/ai.ts → fixPrompt(req)` returns:

```ts
{
  ok: true,
  mode: "as400",
  detectedMode?: "as400",
  cleaned: "...",
  prompt: "...",                     // ready-to-paste optimised prompt
  sections: { role, task, context, constraints[], outputFormat },
  safety: { blocked, requiresConfirmation, findings[], rewritten? },
  supervisor: {
    used: true,
    model: "gemma2:2b",
    latencyMs: 612,
    notes: "tightened output_format; removed redundant tone constraint",
    improved?: { ... }
  },
  elapsedMs: 743
}
```

Every output prompt is guaranteed to contain **Role · Task · Context ·
Constraints · Output Format**. The supervisor can edit each section but cannot
remove any.

### Safety screen (Terminal Mode)

`lib/safety.ts` matches against an explicit ruleset (`rm -rf`, `dd`, `mkfs`,
`DROP TABLE`, force-push, fork bombs, `chmod 777`, `curl | sh`, …) before the
prompt is returned. Findings are surfaced in the UI; `critical` findings flip
`safety.blocked = true` so the consumer can refuse to ship the prompt.

## Why "supervisor", not "writer"

Small local models hallucinate when asked to author from scratch. They are
genuinely good at:

- spotting redundant or vague constraints,
- normalising structure,
- failing fast when the input is incoherent.

So PromptFixer pins Gemma to that role with a strict JSON contract. If the
model returns garbage, the deterministic prompt ships unchanged. This keeps
the pipeline reliable on a $0 stack.

## Roadmap

- **v1.5** — clipboard auto-detect, selection capture (Tauri + accessibility APIs)
- **v2** — multi-model routing (route Dev → Claude, Business → GPT), JSON-file
  prompt history, cloud sync (opt-in).
