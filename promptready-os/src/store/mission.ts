/**
 * Mission store · Phase 12.
 *
 * Owns the mission lifecycle. The eight typed stages mirror the
 * Operations Pipeline:
 *
 *   idle → briefing → routing → memory-scan → model-select →
 *   execution → validation → deliverable-ready
 *
 * The engine is not connected yet. So `dispatch()` does NOT advance
 * stages — it stamps the brief and flips the runtime to one of the
 * honest "stalled" states:
 *
 *   waiting-for-engine  · the desktop runtime isn't wired
 *   local-mode          · the user explicitly picked local but the
 *                          engine isn't reachable
 *   offline             · no engine reachable at all
 *
 * The timeline UI reads `state.stage` to decide which card is the
 * "current" cursor and never auto-advances. When the runtime ships, the
 * pipeline service calls `advance()` with real events.
 */

import { create } from "zustand";

export type MissionStage =
  | "idle"
  | "briefing"
  | "routing"
  | "memory-scan"
  | "model-select"
  | "execution"
  | "validation"
  | "deliverable-ready";

export type RuntimeStatus =
  | "ready"
  | "waiting-for-engine"
  | "local-mode"
  | "offline";

export interface MissionEvent {
  at: number;
  stage: MissionStage;
  kind: "info" | "ok" | "warn" | "err";
  tag: string;
  message: string;
}

export interface MissionReceipt {
  id: string;
  brief: string;
  mode: string;
  quality: string;
  startedAt: number;
  endedAt?: number;
  stage: MissionStage;
  runtime: RuntimeStatus;
  events: MissionEvent[];
}

interface MissionState {
  runtime: RuntimeStatus;
  current: MissionReceipt | null;
  history: MissionReceipt[];

  dispatch(brief: string, mode: string, quality: string): void;
  advance(stage: MissionStage, event?: Omit<MissionEvent, "at" | "stage">): void;
  cancel(): void;
  reset(): void;
}

export const STAGES: MissionStage[] = [
  "idle",
  "briefing",
  "routing",
  "memory-scan",
  "model-select",
  "execution",
  "validation",
  "deliverable-ready"
];

export const STAGE_META: Record<
  MissionStage,
  { code: string; label: string; blurb: string }
> = {
  idle: {
    code: "00",
    label: "Idle",
    blurb: "Brief not dispatched yet."
  },
  briefing: {
    code: "01",
    label: "Briefing",
    blurb: "Clean the brief · classify intent · tag mode."
  },
  routing: {
    code: "02",
    label: "Routing",
    blurb: "Decide engine path · local / cloud / hybrid."
  },
  "memory-scan": {
    code: "03",
    label: "Memory scan",
    blurb: "Pull relevant brain notes and connector context."
  },
  "model-select": {
    code: "04",
    label: "Model select",
    blurb: "Pick the model · resolve quality tier · log cost ceiling."
  },
  execution: {
    code: "05",
    label: "Execution",
    blurb: "Stream tokens · capture trace · respect safety screen."
  },
  validation: {
    code: "06",
    label: "Validation",
    blurb: "Score · constraint check · ranking before deliverables."
  },
  "deliverable-ready": {
    code: "07",
    label: "Deliverable ready",
    blurb: "Named outputs persisted to the Operations Archive."
  }
};

function newId() {
  return `m-${Math.random().toString(36).slice(2, 10)}`;
}

export const useMissionStore = create<MissionState>((set, get) => ({
  runtime: "waiting-for-engine",
  current: null,
  history: [],

  dispatch(brief, mode, quality) {
    if (!brief.trim()) return;
    const receipt: MissionReceipt = {
      id: newId(),
      brief: brief.trim(),
      mode,
      quality,
      startedAt: Date.now(),
      stage: "briefing",
      runtime: get().runtime,
      events: [
        {
          at: Date.now(),
          stage: "briefing",
          kind: "info",
          tag: "input",
          message: `Brief received (${brief.trim().length} chars)`
        },
        {
          at: Date.now(),
          stage: "briefing",
          kind: "warn",
          tag: "engine",
          message:
            get().runtime === "waiting-for-engine"
              ? "Engine not connected in this preview · pipeline halted at briefing"
              : "Engine offline · pipeline halted at briefing"
        }
      ]
    };
    set({ current: receipt });
  },

  advance(stage, event) {
    const cur = get().current;
    if (!cur) return;
    const evt: MissionEvent = {
      at: Date.now(),
      stage,
      kind: event?.kind ?? "info",
      tag: event?.tag ?? "stage",
      message: event?.message ?? `Advanced to ${stage}`
    };
    const next: MissionReceipt = {
      ...cur,
      stage,
      events: [...cur.events, evt],
      endedAt: stage === "deliverable-ready" ? Date.now() : cur.endedAt
    };
    set({
      current: next,
      history:
        stage === "deliverable-ready"
          ? [next, ...get().history].slice(0, 50)
          : get().history
    });
  },

  cancel() {
    const cur = get().current;
    if (!cur) return;
    const cancelled: MissionReceipt = {
      ...cur,
      stage: "idle",
      endedAt: Date.now(),
      events: [
        ...cur.events,
        {
          at: Date.now(),
          stage: "idle",
          kind: "warn",
          tag: "cancel",
          message: "Mission cancelled by operator"
        }
      ]
    };
    set({ current: null, history: [cancelled, ...get().history].slice(0, 50) });
  },

  reset() {
    set({ runtime: "waiting-for-engine", current: null, history: [] });
  }
}));
