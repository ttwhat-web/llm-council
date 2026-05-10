# Module · Session Continuity

**Owns:** the promise that nothing the user typed is ever lost.

## Responsibility

Capture every meaningful state of the user's AI work and let them get back
to it after a crash, restart, browser tab close, or model failure.

Three layers:

1. **Drafts** — autosaved every `settings.autosaveMs` (default 1500 ms).
   Scope can be `global`, `session:<id>`, or `overlay`.
2. **Sessions** — append-only history of completed runs (input → optimised
   → sent → output → status).
3. **Snapshots** — per-session timeline so you can step through what
   happened inside one run.

## Behaviour

- **On app open**: scan drafts whose `updated_at` is older than
  `2 × autosaveMs` → surface in `useSessionsStore.recoverable`. The UI
  shows a calm "Restore previous draft" banner — never modal.
- **On send-to-model**: snapshot `sent`. If the user pastes the model's
  reply back, snapshot `output`. If a Cloud call fails, snapshot `error`
  with the reason.
- **On reconnect** (cloud key flipped, network restored): re-fire any
  draft tagged "needs-resend" with a single click.

## State

Owns `useSessionsStore`.

## Routes

- `/sessions` — timeline view (left rail = days, right pane = session detail).
- Embedded everywhere as a "history dot" in the header strip.

## Services

- `services/clock.ts` — single time source (mockable in tests).
- `database/client.ts` — durable writes inside a single transaction so
  partial drafts never corrupt sessions.

## Why this matters

The market for AI tools is full of "send and pray" UX. PromptReady's pitch
hinges on the opposite: **your work is always safe**. Every user-visible
decision in this module should reinforce that promise — no destructive
defaults, no "are you sure?" walls, just durable autosave + obvious
restore paths.
