/**
 * Operator Core — Type registry. (Internal · legacy "PromptReady OS" name
 * retained in folder paths only · product-facing UI says Operator.Center.)
 *
 * One file, intentionally. These types are shared across modules and the
 * store layer; keeping them co-located avoids accidental coupling.
 */

// ---------- Primitives ------------------------------------------------------

export type ID = string;
export type EpochMs = number;

// ---------- Prompt vault ----------------------------------------------------

export type PromptMode =
  | "general"
  | "coding"
  | "terminal"
  | "json-strict"
  | "business"
  | "social"
  | "creative"
  | "research";

export type PromptOrigin = "manual" | "fixer" | "imported" | "shared";

export interface Folder {
  id: ID;
  name: string;
  parent_id: ID | null;
  color?: string;
  created_at: EpochMs;
  updated_at: EpochMs;
}

export interface Tag {
  id: ID;
  name: string;
  color?: string;
  created_at: EpochMs;
}

export interface Prompt {
  id: ID;
  title: string;
  body: string;
  raw_input?: string;
  mode?: PromptMode;
  folder_id: ID | null;
  tag_ids: ID[];
  pinned: boolean;
  favorite: boolean;
  origin: PromptOrigin;
  created_at: EpochMs;
  updated_at: EpochMs;
}

// ---------- Sessions · continuity -------------------------------------------

export type Provider =
  | "claude"
  | "chatgpt"
  | "gemini"
  | "perplexity"
  | "openrouter"
  | "ollama"
  | "deterministic";

export type SessionStatus =
  | "draft"
  | "sent"
  | "completed"
  | "failed"
  | "recovered";

export interface Session {
  id: ID;
  prompt_id: ID | null;
  raw_input: string;
  optimized?: string;
  output?: string;
  model?: string;
  provider?: Provider;
  status: SessionStatus;
  reason?: string;
  duration_ms?: number;
  tokens_in?: number;
  tokens_out?: number;
  metadata?: SessionMeta;
  created_at: EpochMs;
  updated_at: EpochMs;
}

export interface SessionMeta {
  score?: { clarity: number; specificity: number; safety: number; modelFit: number };
  safety?: { findings: number; blocked: boolean };
  supervisor?: { used: boolean; notes?: string };
}

export interface Draft {
  id: ID;
  body: string;
  context?: Record<string, unknown>;
  scope: "global" | `session:${ID}` | "overlay";
  updated_at: EpochMs;
}

export type SnapshotKind = "input" | "optimised" | "sent" | "output" | "error";

export interface Snapshot {
  id: ID;
  session_id: ID;
  kind: SnapshotKind;
  data: string;
  created_at: EpochMs;
}

// ---------- Workflows -------------------------------------------------------

export interface WorkflowStep {
  prompt_id: ID;
  model?: string;
  provider?: Provider;
  role?: string;
}

export interface Workflow {
  id: ID;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  pinned: boolean;
  created_at: EpochMs;
  updated_at: EpochMs;
}

// ---------- Analytics -------------------------------------------------------

export type UsageKind =
  | "prompt-optimised"
  | "launched"
  | "session-resumed"
  | "draft-saved"
  | "draft-recovered"
  | "vault-saved"
  | "workflow-run"
  | "overlay-opened";

export type Module =
  | "fixer"
  | "launcher"
  | "continuity"
  | "vault"
  | "overlay"
  | "dashboard";

export interface UsageEvent {
  id: ID;
  ts: EpochMs;
  kind: UsageKind;
  module: Module;
  provider?: Provider;
  model?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}

// ---------- Settings --------------------------------------------------------

export interface AppSettings {
  theme: "graphite" | "auto";
  defaultMode: PromptMode;
  defaultProvider: Provider | "auto";
  enabledProviders: Provider[];
  overlayShortcut: string; // e.g. "CmdOrCtrl+Shift+O"
  cmdkShortcut: string;    // e.g. "CmdOrCtrl+K"
  autosaveMs: number;       // debounce window for drafts
  telemetryConsent: boolean;
}

// ---------- Service responses ----------------------------------------------

export interface ProviderLaunchTarget {
  provider: Provider;
  url?: string;            // browser URL to open with the prompt copied
  desktopApp?: string;     // optional: open native app via Tauri shell
  inject?: boolean;        // when true, also paste via accessibility APIs (Phase 4)
}
