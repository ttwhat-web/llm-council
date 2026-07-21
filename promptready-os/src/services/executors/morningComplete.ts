/**
 * Morning Complete · the emotional completion state, computed honestly.
 *
 * "Complete" means every action that ever required a founder decision
 * (prepared, shown, or mid-flight) has reached a terminal state.
 * Background detections that never became a real decision (status
 * still "detected") never count — this can't be faked by simply not
 * detecting anything. If anything failed, that's surfaced plainly
 * rather than folded into a false "all clear".
 */

import { getExecutor } from "./registry";
import type { Action } from "./types";

export interface MorningCompleteSummary {
  /** completed + cancelled + undone — every decision the founder made, resolved. */
  totalResolved: number;
  failedCount: number;
  byExecutor: Array<{ executor: string; label: string; completedCount: number }>;
}

/** Pure · null when there's nothing to report yet, or something is
 *  still pending a founder decision. */
export function computeMorningComplete(items: Record<string, Action>): MorningCompleteSummary | null {
  const relevant = Object.values(items).filter((a) => a.status !== "detected");
  if (relevant.length === 0) return null;

  const pending = relevant.filter(
    (a) => a.status === "prepared" || a.status === "waiting_approval" || a.status === "executing"
  );
  if (pending.length > 0) return null;

  const completed = relevant.filter((a) => a.status === "completed");
  const resolvedWithoutSend = relevant.filter((a) => a.status === "cancelled" || a.status === "undone");
  const failed = relevant.filter((a) => a.status === "failed");

  const byExecutorMap = new Map<string, { label: string; count: number }>();
  for (const a of completed) {
    const label = getExecutor(a.executor)?.label ?? a.executor;
    const entry = byExecutorMap.get(a.executor) ?? { label, count: 0 };
    entry.count++;
    byExecutorMap.set(a.executor, entry);
  }

  return {
    totalResolved: completed.length + resolvedWithoutSend.length,
    failedCount: failed.length,
    byExecutor: Array.from(byExecutorMap.entries()).map(([executor, v]) => ({
      executor,
      label: v.label,
      completedCount: v.count
    }))
  };
}
