/**
 * Operator Timeline · work already performed, never planned work.
 *
 * Every entry comes straight from the Action Queue's own append-only
 * log — real timestamps, real action ids, never a synthetic or
 * cosmetic event. This is the seed of a broader company timeline;
 * other real event sources (a saved memory, a founder feedback
 * submission) are natural future feeds into the same shape, but this
 * first slice covers exactly what's real today: what Operator
 * detected, prepared, and executed through the queue.
 */

import type { Action, ActionLogEntry } from "./types";

export interface TimelineEntry {
  at: number;
  actionId: string;
  executor: string;
  event: ActionLogEntry["event"];
  /** Founder-facing label, e.g. "Completed: Reply to Hans Müller". */
  label: string;
  /** The receipt, error, or other real detail behind this event — the
   *  evidence a founder can check the claim against. */
  evidence?: string;
}

const EVENT_VERB: Record<ActionLogEntry["event"], string> = {
  detected: "Found",
  prepared: "Prepared",
  waiting_approval: "Reviewed",
  approved: "Approved",
  executing: "Started",
  completed: "Completed",
  failed: "Failed",
  retried: "Retried",
  cancelled: "Cancelled",
  undone: "Undone",
  recovered: "Interrupted"
};

/** Pure · newest-first, one real entry per queue log line. */
export function buildTimeline(log: ActionLogEntry[], items: Record<string, Action>): TimelineEntry[] {
  return log
    .map((entry): TimelineEntry => {
      const action = items[entry.actionId];
      const title = action?.title ?? entry.actionId;
      const verb = EVENT_VERB[entry.event];
      const evidence =
        entry.event === "completed"
          ? action?.receipt ?? entry.detail
          : entry.event === "failed"
            ? action?.error ?? entry.detail
            : entry.detail;
      return {
        at: entry.at,
        actionId: entry.actionId,
        executor: entry.executor,
        event: entry.event,
        label: `${verb}: ${title}`,
        evidence
      };
    })
    .sort((a, b) => b.at - a.at);
}
