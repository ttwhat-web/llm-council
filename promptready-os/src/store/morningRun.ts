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
  lastRun: MorningRunSummary | null;
  run(): Promise<MorningRunSummary | null>;
}

export const useMorningRunStore = create<MorningRunState>((set, get) => ({
  status: "idle",
  lastRun: null,

  async run() {
    if (get().status === "running") return null; // one run at a time
    set({ status: "running" });
    try {
      // A summary with per-item errors is still a completed run — one
      // failed draft or a sync hiccup doesn't invalidate the rest of
      // the pipeline. "failed" is reserved for the orchestrator itself
      // throwing (the catch block below), matching how the rest of
      // Operator degrades gracefully instead of failing all-or-nothing.
      const summary = await runMorningRun();
      set({ status: "completed", lastRun: summary });
      return summary;
    } catch (e) {
      const summary: MorningRunSummary = {
        startedAt: Date.now(),
        durationMs: 0,
        detectorsFired: [],
        draftsGenerated: 0,
        actionsPrepared: 0,
        executorCount: 0,
        aiTokens: 0,
        aiLatencyMs: 0,
        errors: [(e as Error).message],
        operatorRead: null
      };
      set({ status: "failed", lastRun: summary });
      return summary;
    }
  }
}));
