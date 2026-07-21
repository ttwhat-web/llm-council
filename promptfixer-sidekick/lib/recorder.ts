/**
 * Workflow Recorder MVP — the in-product macro recorder.
 *
 * While `enabled` is true, the UI calls `recordStep` for each user
 * action (fix, clean, architect, run-skill, run-workflow, copy). The
 * recorder keeps the live session in localStorage so the user's tape
 * survives a refresh and can be saved as a draft for later editing.
 *
 * Replay is intentionally NOT wired in this commit. The saved drafts
 * are inert — the drafts panel surfaces them, but the existing workflow
 * runner only executes server-defined `WorkflowDefinition`s today, and
 * recorder drafts don't yet satisfy that schema. We keep them listed +
 * deletable so the recording loop is real, the storage is real, and a
 * later commit can ship "Promote draft → workflow" without throwing
 * away anything users captured in the meantime.
 */

"use client";

import type { Mode, ModelQuality } from "./types";

export type RecordedStepKind =
  | "fix"
  | "clean"
  | "architect"
  | "run-skill"
  | "run-workflow"
  | "copy";

export interface RecordedStep {
  id: string;
  kind: RecordedStepKind;
  /** Wall time at capture. */
  ts: number;
  /** Human-readable label rendered in the recorder strip. */
  label: string;
  /** Optional structured payload that lets a future replay reconstruct intent. */
  payload?: {
    skillId?: string;
    workflowId?: string;
    mode?: Mode;
    modelQuality?: ModelQuality;
    inputPreview?: string;
  };
}

export interface RecordingState {
  enabled: boolean;
  startedAt?: number;
  steps: RecordedStep[];
}

export interface RecordingDraft {
  id: string;
  name: string;
  steps: RecordedStep[];
  createdAt: number;
}

const KEY_STATE = "pf.recorder.v1.state";
const KEY_DRAFTS = "pf.recorder.v1.drafts";
const MAX_STEPS = 60;
const MAX_DRAFTS = 25;

export function loadState(): RecordingState {
  if (typeof window === "undefined") return { enabled: false, steps: [] };
  try {
    const raw = window.localStorage.getItem(KEY_STATE);
    if (!raw) return { enabled: false, steps: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { enabled: false, steps: [] };
    return {
      enabled: Boolean(parsed.enabled),
      startedAt: typeof parsed.startedAt === "number" ? parsed.startedAt : undefined,
      steps: Array.isArray(parsed.steps) ? parsed.steps.slice(0, MAX_STEPS) : []
    };
  } catch {
    return { enabled: false, steps: [] };
  }
}

export function persistState(state: RecordingState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_STATE, JSON.stringify(state));
  } catch {
    /* quota — ignore */
  }
}

export function loadDrafts(): RecordingDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_DRAFTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecordingDraft[]).slice(0, MAX_DRAFTS) : [];
  } catch {
    return [];
  }
}

export function saveDraft(name: string, steps: RecordedStep[]): RecordingDraft[] {
  const draft: RecordingDraft = {
    id: newId(),
    name: name.trim() || `Recording · ${new Date().toLocaleString()}`,
    steps: steps.slice(0, MAX_STEPS),
    createdAt: Date.now()
  };
  const list = [draft, ...loadDrafts()].slice(0, MAX_DRAFTS);
  persistDrafts(list);
  return list;
}

export function deleteDraft(id: string): RecordingDraft[] {
  const list = loadDrafts().filter((d) => d.id !== id);
  persistDrafts(list);
  return list;
}

function persistDrafts(list: RecordingDraft[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_DRAFTS, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `r_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function makeStep(
  kind: RecordedStepKind,
  label: string,
  payload?: RecordedStep["payload"]
): RecordedStep {
  return { id: newId(), kind, ts: Date.now(), label, payload };
}
