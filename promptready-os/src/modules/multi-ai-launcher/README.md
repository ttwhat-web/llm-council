# Module · Multi AI Launcher

**Owns:** routing a prompt to the right external AI tool with one click.

## Responsibility

Send the optimised prompt — currently held in `useFixerStore` or selected
from `usePromptsStore` — to:

- Claude (Anthropic web app)
- ChatGPT (OpenAI web app)
- Gemini (Google)
- Perplexity
- Cursor (deep link to the local app where supported)
- OpenRouter providers (configured via settings)
- Local models (Ollama, LM Studio)

## Behaviour

1. Copy the prompt to the OS clipboard via `tauri-plugin-clipboard-manager`.
2. Open the target's web URL in the user's default browser via
   `tauri-plugin-opener`. For desktop-app targets (Cursor) attempt the
   deep link first, fall back to web.
3. Log a `launched` event in `usage_events` for the dashboard.

## Smart routing recommendations

Pure local heuristic — no AI inference needed:

- **coding / refactor / debug** → Claude Sonnet (or Cursor if installed)
- **research / multi-source** → Gemini or Perplexity
- **fast / chat** → ChatGPT
- **uncensored / private** → Ollama
- **bulk / cheap** → OpenRouter

The recommendation surfaces as a non-blocking pill in the launcher
strip; the user can always override.

## State

Owns `useLauncherStore` — last targets, per-provider success counts,
quick-access ordering.

## Services consumed

- `services/clipboard.ts`
- `services/opener.ts`
- (Phase 5) `services/accessibility.ts` — actually paste into the focused
  text field via macOS Accessibility API. Opt-in, requires permission.

## Routes

- `/launcher` — primary picker view.
- Embedded in: `/fixer` (one-click "Send to") and the workspace overlay.
