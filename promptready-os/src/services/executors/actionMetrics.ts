/**
 * Action Queue · pure timing + aggregate metrics.
 *
 * Split out of actionQueue.ts (the stateful store) so the store stays
 * under the repo's file-size limit. No store, no clock reads except
 * the optional `now` param — this is "is the execution plumbing
 * healthy?" math, a separate concern from store/metrics.ts's "are the
 * drafts good?" KPI.
 */

import type { Action, ActionStatus, ActionTiming, QueueMetrics } from "./types";

/** Whole seconds left in a grace window; 0 when there isn't one. */
export function undoSecondsLeft(item: Action, now: number = Date.now()): number {
  if (item.undoUntil == null) return 0;
  if (item.status !== "waiting_approval" && item.status !== "completed") return 0;
  return Math.max(0, Math.ceil((item.undoUntil - now) / 1000));
}

export function computeActionTiming(action: Action): ActionTiming {
  const timeToApproveMs =
    action.approvedAt != null && action.completedAt != null && action.completedAt >= action.approvedAt
      ? action.completedAt - action.approvedAt
      : null;
  const executionMs =
    action.executedAt != null && action.completedAt != null && action.completedAt >= action.executedAt
      ? action.completedAt - action.executedAt
      : null;
  const totalMs =
    action.completedAt != null && action.completedAt >= action.createdAt ? action.completedAt - action.createdAt : null;
  return { timeToApproveMs, executionMs, totalMs };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor((sorted.length - 1) / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid] + sorted[mid + 1]) / 2);
}

const ALL_STATUSES: ActionStatus[] = [
  "detected",
  "prepared",
  "waiting_approval",
  "executing",
  "completed",
  "failed",
  "cancelled",
  "undone"
];

export function computeQueueMetrics(actions: Action[]): QueueMetrics {
  const byStatus = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<ActionStatus, number>;
  const byExecutor: Record<string, number> = {};
  let completed = 0;
  let failed = 0;
  let totalRetries = 0;
  const executionDurations: number[] = [];
  const approveDurations: number[] = [];

  for (const a of actions) {
    byStatus[a.status]++;
    byExecutor[a.executor] = (byExecutor[a.executor] ?? 0) + 1;
    if (a.status === "completed") completed++;
    if (a.status === "failed") failed++;
    totalRetries += a.retryCount ?? 0;
    const timing = computeActionTiming(a);
    if (timing.executionMs != null) executionDurations.push(timing.executionMs);
    if (timing.timeToApproveMs != null) approveDurations.push(timing.timeToApproveMs);
  }

  return {
    total: actions.length,
    byStatus,
    byExecutor,
    successRate: completed + failed === 0 ? null : completed / (completed + failed),
    medianExecutionMs: median(executionDurations),
    medianTimeToApproveMs: median(approveDurations),
    totalRetries
  };
}
