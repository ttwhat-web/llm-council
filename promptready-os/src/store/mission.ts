/**
 * Mission store · Phase 13.
 *
 * Drives the deterministic mission runner. Persists receipts to
 * localStorage so the Library and Brain stat strip can read them.
 *
 * Eight typed stages:
 *   idle → briefing → routing → memory-scan → model-select →
 *   execution → validation → deliverable-ready
 *
 * Runtime is honest:
 *   ready              · engine reachable
 *   waiting-for-engine · unknown, awaiting first dispatch / probe
 *   local-mode         · deterministic-only, no Ollama/cloud
 *   offline            · no engine path resolved
 *
 * The deterministic runner always works locally, so after the first
 * dispatch the runtime flips to `local-mode` (honest: nothing else is
 * configured).
 */

import { create } from "zustand";
import { runMission, type Deliverable } from "@/services/missionRunner";
import { useBrainStore } from "@/store/brain";

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
  deliverables: Deliverable[];
  score?: number;
  elapsedMs?: number;
  memoryMatches?: number;
  repoContext?: string | null;
}

interface MissionState {
  runtime: RuntimeStatus;
  current: MissionReceipt | null;
  history: MissionReceipt[];

  dispatch(brief: string, mode: string, quality: string, repoContext?: string | null): Promise<void>;
  cancel(): void;
  clearHistory(): void;
  hydrate(): void;
  setRuntime(s: RuntimeStatus): void;
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
  idle: { code: "00", label: "Idle", blurb: "Brief not dispatched yet." },
  briefing: { code: "01", label: "Briefing", blurb: "Clean the brief · classify intent · tag mode." },
  routing: { code: "02", label: "Routing", blurb: "Decide engine path · local / cloud / hybrid." },
  "memory-scan": { code: "03", label: "Memory scan", blurb: "Pull relevant brain notes and connector context." },
  "model-select": { code: "04", label: "Model select", blurb: "Pick the model · resolve quality tier · log cost ceiling." },
  execution: { code: "05", label: "Execution", blurb: "Run the engine · capture trace · respect safety screen." },
  validation: { code: "06", label: "Validation", blurb: "Score · constraint check · ranking before deliverables." },
  "deliverable-ready": { code: "07", label: "Deliverable ready", blurb: "Named outputs persisted to the Operations Archive." }
};

const STORAGE_KEY = "promptready-os.mission";

function newId() {
  return `m-${Math.random().toString(36).slice(2, 10)}`;
}

function loadHistory(): MissionReceipt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { history?: MissionReceipt[] };
    return Array.isArray(parsed.history) ? parsed.history : [];
  } catch {
    return [];
  }
}

function saveHistory(history: MissionReceipt[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ history }));
  } catch {
    // ignore
  }
}

export const useMissionStore = create<MissionState>((set, get) => ({
  runtime: "waiting-for-engine",
  current: null,
  history: [],

  async dispatch(brief, mode, quality, repoContext = null) {
    const trimmed = brief.trim();
    if (!trimmed) return;
    if (get().current) return; // do not double-dispatch

    const brainSources = useBrainStore.getState().memorySources;

    const receipt: MissionReceipt = {
      id: newId(),
      brief: trimmed,
      mode,
      quality,
      startedAt: Date.now(),
      stage: "briefing",
      runtime: "local-mode",
      events: [],
      deliverables: [],
      repoContext
    };
    set({ current: receipt, runtime: "local-mode" });

    let working = receipt;
    const pushEvent = (e: Omit<MissionEvent, "at">) => {
      working = {
        ...working,
        events: [...working.events, { ...e, at: Date.now() }]
      };
      set({ current: working });
    };
    const advance = (stage: MissionStage) => {
      working = { ...working, stage };
      set({ current: working });
    };

    try {
      const result = await runMission({
        brief: trimmed,
        mode,
        quality,
        sources: brainSources,
        repoContext,
        onEvent: pushEvent,
        onAdvance: advance
      });

      const finalReceipt: MissionReceipt = {
        ...working,
        stage: "deliverable-ready",
        endedAt: Date.now(),
        deliverables: result.deliverables,
        score: result.score,
        elapsedMs: result.elapsedMs,
        memoryMatches: result.memoryMatches
      };

      const history = [finalReceipt, ...get().history].slice(0, 100);
      set({ current: finalReceipt, history });
      saveHistory(history);
      useBrainStore.getState().bumpMission();
    } catch (err) {
      const errReceipt: MissionReceipt = {
        ...working,
        stage: "idle",
        endedAt: Date.now(),
        events: [
          ...working.events,
          {
            at: Date.now(),
            stage: working.stage,
            kind: "err",
            tag: "runner",
            message: `Runner error · ${err instanceof Error ? err.message : "unknown"}`
          }
        ]
      };
      set({ current: errReceipt });
    }
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
    const history = [cancelled, ...get().history].slice(0, 100);
    set({ current: null, history });
    saveHistory(history);
  },

  clearHistory() {
    set({ history: [] });
    saveHistory([]);
  },

  hydrate() {
    const history = loadHistory();
    set({ history });
  },

  setRuntime(s) {
    set({ runtime: s });
  }
}));
