# Module · PromptFixer Engine

**Owns:** the structured prompt rewriter — the original PromptFixer pipeline
lifted into PromptReady OS as a first-class module.

## Responsibility

Take messy paste → produce an execution-ready prompt that's clean, structured,
and tuned for a target tool.

Pipeline:

```
INPUT → cleaner → mode detection → engine (Role/Task/Context/Constraints/Output)
      → router (cloud / ollama / deterministic) → supervisor (JSON contract)
      → safety screen → score → insights → OUTPUT
```

## Modes

`general · coding · terminal · json-strict · business · social · creative · research`

Each mode pins tone, formatting, and guardrails. New modes are added by
appending to `lib/modes.ts` — no engine changes needed.

## State

Owns `useFixerStore` (transient — current input, mode, quality, last result).
Persistent state lands in `useSessionsStore` and `usePromptsStore`.

## Routes

- `/fixer` — primary surface (3-column Mission Control layout).
- `/fixer/floating` — borderless overlay (Tauri secondary window).

## Services consumed

- `services/cloud.ts` (Anthropic / OpenAI proxy via Tauri Rust command)
- `services/ollama.ts` (local model)
- `services/deterministic.ts` (rules-only fallback)

## Lift from PromptFixer Sidekick

This module is a near 1:1 lift of the existing `promptfixer-sidekick/lib/`
modules. Map:

| Sidekick file                    | OS location                                  |
| -------------------------------- | -------------------------------------------- |
| `lib/cleaner.ts`                 | `modules/prompt-fixer/cleaner.ts`            |
| `lib/engine.ts`                  | `modules/prompt-fixer/engine.ts`             |
| `lib/modes.ts`                   | `modules/prompt-fixer/modes.ts`              |
| `lib/safety.ts`                  | `modules/prompt-fixer/safety.ts`             |
| `lib/score.ts`                   | `modules/prompt-fixer/score.ts`              |
| `lib/insights.ts`                | `modules/prompt-fixer/insights.ts`           |
| `lib/quality.ts`                 | `modules/prompt-fixer/quality.ts`            |
| `lib/providers/*`                | `services/{cloud,ollama,deterministic}.ts`   |
| `lib/controller.ts`              | `modules/prompt-fixer/supervisor.ts`         |
| `app/api/fix/route.ts`           | Tauri command `pf_fix` in `src-tauri`        |

## Notes

- API key handling moves from server-side env vars to the Tauri keychain
  (BYOK desktop-first model). Read via `services/secrets.ts`.
- Metering is deferred to the cloud companion (Phase 4). Local desktop
  is unmetered.
