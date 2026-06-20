/**
 * Briefing types.
 *
 * The deterministic engine produces a list of BriefingItems from a
 * WorkspaceSnapshot. Each item carries the three blocks Home renders
 * (fact / why / recommendation), the focus area it should zoom into,
 * a numeric priority for sorting and capping at five, and the raw
 * references back into the workspace data so the UI can render the
 * receipts and verify the claim is not invented.
 */

export type FocusKey = "customers" | "revenue" | "tasks" | "calendar";

export type Priority = "high" | "medium" | "low";

export type DetectorId =
  | "stale-customer-thread"
  | "unanswered-email"
  | "commitment-detector"
  | "payment-keyword"
  | "calendar-conflict"
  | "unprepared-meeting";

export interface BriefingItem {
  id: string;
  detector: DetectorId;
  focus: FocusKey;
  priority: Priority;
  /** 0–100. Items below the engine's confidence floor are dropped. */
  confidence: number;
  /** What is happening, one sentence. Plain facts only. */
  fact: string;
  /** Why it matters, one or two sentences. Backed by `evidence`. */
  why: string;
  /** What to do today. One concrete verb-led sentence. */
  recommendation: string;
  /** Single-verb label shown beside the item (e.g. "Müşterileri aç"). */
  verb: string;
  /**
   * References back into the snapshot. The UI uses these to render
   * the receipts in the focus column. Each entry's `kind` tells the
   * column whether to render it as a thread row, an event row, etc.
   */
  evidence: EvidenceRef[];
}

export type EvidenceRef =
  | { kind: "thread"; threadId: string }
  | { kind: "message"; messageId: string }
  | { kind: "event"; eventId: string };
