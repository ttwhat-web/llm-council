"use client";

/**
 * Morning Run state · idle → running → completed | failed.
 *
 * Thin wrapper around the orchestrator (services/morningRun). Owns
 * only the run lifecycle + the last result; the orchestrator owns the
 * actual pipeline. Never tied to cron, notifications, or desktop
 * startup — whoever calls run() (a Home mount effect today; a
 * scheduled backend, desktop launch, or mobile open later) gets the
 * exact same pipeline.
 */

import { create } from "zustand";
import { runMorningRun } from "@/services/morningRun/orchestrator";
import type { MorningRunSummary } from "@/services/morningRun/types";

export type MorningRunStatus = "idle" | "running" | "completed" | "failed";

interface MorningRunState {
  status: MorningRunStatus;
  /** The current real pipeline stage while status is "running" — null
   *  otherwise. Set from the orchestrator's own onStage callback, so
   *  it only ever names work that is actually happening right now. */
  stage: string | null;
  lastRun: MorningRunSummary | null;
  run(): Promise<MorningRunSummary | null>;
}

export const useMorningRunStore = create<MorningRunState>((set, get) => ({
  status: "idle",
  stage: null,
  lastRun: null,

  async run() {
    if (get().status === "running") return null; // one run at a time
    set({ status: "running", stage: "Good morning. Learning your day…" });
    try {
      // A summary with per-item errors is still a completed run — one
      // failed draft or a sync hiccup doesn't invalidate the rest of
      // the pipeline. "failed" is reserved for the orchestrator itself
      // throwing (the catch block below), matching how the rest of
      // Operator degrades gracefully instead of failing all-or-nothing.
      const summary = await runMorningRun((label) => set({ stage: label }));
      set({ status: "completed", stage: null, lastRun: summary });
      return summary;
    } catch (e) {
      const summary: MorningRunSummary = {
        startedAt: Date.now(),
        durationMs: 0,
        detectorsFired: [],
        draftsGenerated: 0,
        actionsPrepared: 0,
        archivedPrepared: 0,
        calendarConflictPrepared: false,
        executorCount: 0,
        aiTokens: 0,
        aiLatencyMs: 0,
        errors: [(e as Error).message],
        operatorRead: null
      };
      set({ status: "failed", stage: null, lastRun: summary });
      return summary;
    }
  }
}));
