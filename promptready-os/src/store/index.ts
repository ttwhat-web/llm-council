/**
 * Store registry. Each store owns one slice of state and exposes a small,
 * typed surface. Cross-store reads are fine; cross-store writes go through
 * actions on the owning store (no shared mutation).
 *
 *   usePromptsStore   — Prompt Vault: prompts, folders, tags, search, FTS.
 *   useSessionsStore  — Session Continuity: sessions, drafts, snapshots,
 *                        autosave, recovery.
 *   useFixerStore     — Mission Formatter (legacy "PromptFixer") transient state (current input, mode,
 *                        quality, last result). Persisted only via sessions.
 *   useLauncherStore  — Multi-AI Launcher: enabled providers, last targets.
 *   useOverlayStore   — Workspace Overlay: visibility, position, mode.
 *   useDashboardStore — Workflow Dashboard: cached aggregates from
 *                        usage_events. Refreshes lazily.
 *   useSettingsStore  — User preferences. The only store that bootstraps
 *                        from disk synchronously (via Tauri's settings file).
 */

export { usePromptsStore } from "./prompts";
export { useSessionsStore } from "./sessions";
export { useSettingsStore } from "./settings";
export { useBrainStore } from "./brain";
export { useMissionStore } from "./mission";
export { useThemeStore, THEMES, type ThemeId } from "./theme";
export { useAtlasStore, WORKFLOW_NODE_META } from "./atlas";

// Phase-2+ stores (declared, implementation lands with their module):
// export { useFixerStore } from "./fixer";
// export { useLauncherStore } from "./launcher";
// export { useOverlayStore } from "./overlay";
// export { useDashboardStore } from "./dashboard";
