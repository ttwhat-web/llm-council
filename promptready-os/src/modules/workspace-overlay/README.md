# Module · AI Workspace Overlay

**Owns:** the floating, always-on-top mini-window that follows the user
across every other app.

## Responsibility

A 320×420 frosted-glass panel summoned with a global shortcut (default
`Cmd/Ctrl + Shift + O`) that sits on top of any application and offers:

- Quick prompt enhance (one-line input → one-line optimised paste)
- Rewrite the current selection (uses macOS Accessibility / Win32 to
  read the focused text field; optional, opt-in)
- Save to vault (one click)
- Send to a model (uses Multi-AI Launcher)
- Summarise the current clipboard
- Export

## Surface

A separate Tauri window. Borderless, transparent, draggable from the
header strip. Hides on blur unless pinned. Re-summon: shortcut or tray.

## State

Owns `useOverlayStore` — visibility, position, mode (`compose` /
`enhance` / `vault-quick-pick`).

## Routes

- `/overlay` — only loaded inside the secondary Tauri window.

## Services

- `services/accessibility.ts` (Phase 5) — read selected text + paste back.
- `services/clipboard.ts` — fallback when accessibility isn't permitted.
- `services/shortcuts.ts` — registers the global hotkey via
  `tauri-plugin-global-shortcut`.

## Why a separate window

Performance + focus. The overlay must summon in <80 ms with no layout
thrash, even if the main window is buried. A dedicated Tauri window
keeps it a single React tree wired only to the small slice of state it
needs (overlay + clipboard + active provider).
