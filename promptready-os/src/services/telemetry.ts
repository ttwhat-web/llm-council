/**
 * Local telemetry · Phase 20.
 *
 * Counters computed from real local stores. Nothing ever leaves the
 * machine — the "send" toggle in Settings remains opt-in and only
 * controls a future outbound channel, which is not wired.
 *
 * The crash counter is the only piece that needs its own persistence:
 * it counts how many sessions ended with a stale recovery checkpoint
 * (i.e. the app shut down mid-mission).
 */

import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";

const CRASH_KEY = "promptready-os.crash-counter";

export interface TelemetrySnapshot {
  takenAt: number;
  missionCount: number;
  ollamaMissions: number;
  workflowRuns: number;
  receiptCount: number;
  importedDocs: number;
  inboxItems: number;
  snapshotCount: number;
  crashCount: number;
  brainBytes: number;
}

export function snapshot(): TelemetrySnapshot {
  const brain = useBrainStore.getState();
  const missions = useMissionStore.getState();
  const atlas = useAtlasStore.getState();
  return {
    takenAt: Date.now(),
    missionCount: brain.missionCount,
    ollamaMissions: missions.history.filter((m) => m.engine === "ollama").length,
    workflowRuns: atlas.workflowRuns.length,
    receiptCount: missions.history.length,
    importedDocs: atlas.memoryDocs.length,
    inboxItems: atlas.inbox.length,
    snapshotCount: atlas.snapshots.length,
    crashCount: readCrashCount(),
    brainBytes: approxLocalStorageBytes()
  };
}

export function bumpCrashCounter(): number {
  if (typeof window === "undefined") return 0;
  try {
    const cur = Number(window.localStorage.getItem(CRASH_KEY) ?? "0");
    const next = Number.isFinite(cur) ? cur + 1 : 1;
    window.localStorage.setItem(CRASH_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function readCrashCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(window.localStorage.getItem(CRASH_KEY) ?? "0");
  } catch {
    return 0;
  }
}

export function resetCrashCounter() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CRASH_KEY, "0");
  } catch {
    // ignore
  }
}

/** 7-day trend buckets. Returns 7 daily mission counts, oldest first. */
export function recentMissionTrend(): number[] {
  const buckets = new Array(7).fill(0);
  const now = Date.now();
  const start = now - 6 * 86_400_000;
  const history = useMissionStore.getState().history;
  for (const m of history) {
    if (m.startedAt < start) continue;
    const offset = Math.floor((m.startedAt - start) / 86_400_000);
    if (offset >= 0 && offset < 7) buckets[offset]++;
  }
  return buckets;
}

function approxLocalStorageBytes(): number {
  if (typeof window === "undefined") return 0;
  try {
    let bytes = 0;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      bytes += k.length + (window.localStorage.getItem(k) ?? "").length;
    }
    return bytes;
  } catch {
    return 0;
  }
}
