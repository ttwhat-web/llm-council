"use client";

/**
 * Metrics · product intelligence, not AI intelligence.
 *
 * An append-only event log for the lifecycle of every prepared action.
 * Local-first (localStorage). No backend, no telemetry leaving the
 * device. The point is a single truth: are founders approving drafts
 * WITHOUT editing them? If yes, Operator is good enough. If they edit
 * constantly, draft quality — not memory — is the bottleneck.
 *
 * The KPI is approvalWithoutEditRate. Everything else is supporting
 * detail so we act on numbers, not guesses.
 *
 * Events per action (each recorded at most once):
 *   generated  · Operator produced a draft
 *   shown      · the draft was rendered to the founder
 *   edited     · the founder changed the draft body
 *   approved   · the founder approved it
 *   undone     · the founder cancelled during the undo window
 *   sent       · it actually left via the executor
 *   failed     · the executor errored
 */

import { create } from "zustand";

export type MetricType =
  | "generated"
  | "shown"
  | "edited"
  | "approved"
  | "undone"
  | "sent"
  | "failed";

export interface MetricEvent {
  actionId: string;
  type: MetricType;
  at: number;
}

export interface MetricsAggregates {
  generated: number;
  shown: number;
  edited: number;
  approved: number;
  undone: number;
  sent: number;
  failed: number;
  /** approved actions that were never edited. */
  approvalWithoutEdit: number;
  /** approvalWithoutEdit / approved, 0..1. null when no approvals yet. */
  approvalWithoutEditRate: number | null;
  /** median (generated → sent) in ms. null when no sends yet. */
  medianCompletionMs: number | null;
}

const STORAGE_KEY = "operator.metrics.v0";
const MAX_EVENTS = 2000;

function readEvents(): MetricEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MetricEvent[]) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: MetricEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* quota */
  }
}

/** Pure · derive the aggregates (incl. the KPI) from an event log. */
export function computeAggregates(events: MetricEvent[]): MetricsAggregates {
  const ids = (type: MetricType) => new Set(events.filter((e) => e.type === type).map((e) => e.actionId));
  const generated = ids("generated");
  const shown = ids("shown");
  const edited = ids("edited");
  const approved = ids("approved");
  const undone = ids("undone");
  const sent = ids("sent");
  const failed = ids("failed");

  let approvalWithoutEdit = 0;
  for (const id of approved) if (!edited.has(id)) approvalWithoutEdit++;
  const approvalWithoutEditRate = approved.size === 0 ? null : approvalWithoutEdit / approved.size;

  // completion times: first generated → first sent, per action.
  const firstAt = (type: MetricType, id: string): number | undefined =>
    events.find((e) => e.type === type && e.actionId === id)?.at;
  const durations: number[] = [];
  for (const id of sent) {
    const g = firstAt("generated", id);
    const s = firstAt("sent", id);
    if (g != null && s != null && s >= g) durations.push(s - g);
  }
  durations.sort((a, b) => a - b);
  const medianCompletionMs =
    durations.length === 0
      ? null
      : durations.length % 2 === 1
        ? durations[(durations.length - 1) / 2]
        : Math.round((durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2);

  return {
    generated: generated.size,
    shown: shown.size,
    edited: edited.size,
    approved: approved.size,
    undone: undone.size,
    sent: sent.size,
    failed: failed.size,
    approvalWithoutEdit,
    approvalWithoutEditRate,
    medianCompletionMs
  };
}

interface MetricsState {
  events: MetricEvent[];
  /** Record an event once per (actionId, type). Idempotent. */
  record(actionId: string, type: MetricType, at?: number): void;
  aggregates(): MetricsAggregates;
  exportJson(): string;
  reset(): void;
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  events: readEvents(),

  record(actionId, type, at) {
    const events = get().events;
    // idempotent: at most one event per (actionId, type)
    if (events.some((e) => e.actionId === actionId && e.type === type)) return;
    const next = [...events, { actionId, type, at: at ?? Date.now() }].slice(-MAX_EVENTS);
    writeEvents(next);
    set({ events: next });
  },

  aggregates() {
    return computeAggregates(get().events);
  },

  exportJson() {
    return JSON.stringify(get().events, null, 2);
  },

  reset() {
    writeEvents([]);
    set({ events: [] });
  }
}));

/** Non-React accessor for services. */
export function recordMetric(actionId: string, type: MetricType): void {
  useMetricsStore.getState().record(actionId, type);
}
