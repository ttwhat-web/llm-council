# Module · Prompt Memory Vault

**Owns:** the user's growing library of prompts, workflows, and reusable
systems. Local-first, fast, searchable.

## Responsibility

A first-class library where every prompt — whether saved manually, born
from PromptFixer, or imported — lives forever, organised the way the
user wants.

## Surface

- **Sidebar tree** of folders.
- **Tag chips** as a horizontal filter row.
- **Search** at the top with FTS5 (`prompts_fts`). Live, debounced 80 ms.
- **List**: pinned → recent → all.
- **Detail pane**: title, body, tags, folder, raw input, source mode,
  provenance (manual / fixer / imported / shared).

## Capabilities

- Pin / unpin (`pinned`)
- Favourite (`favorite`)
- Drag between folders
- Bulk tag add/remove
- Duplicate
- Export single or selection (uses `lib/exports.ts` from PromptFixer Sidekick)
- Workflow chain: bundle N prompts into a `workflows` row

## State

Owns `usePromptsStore` (prompts, folders, tags, filter, selection).

## Routes

- `/vault` — main library.
- `/vault/:id` — detail view.
- `/vault/folder/:folderId` — folder-scoped view.

## Services

- `database/client.ts` — only consumer.
- `services/exports.ts` — formatters lifted from PromptFixer Sidekick.
- `services/share.ts` (Phase 4) — share via signed URL.

## Search contract

The store exposes `visible()` which returns the in-memory filtered list
for the current `Filter`. For libraries above ~5 000 prompts the store
delegates to FTS5 via `prompts_fts` and paginates.
