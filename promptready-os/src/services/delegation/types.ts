/**
 * Delegation Engine · shared types.
 *
 * A DelegationPlan is the typed, inspectable artifact between "the
 * founder said a sentence" and "the Action Queue has real prepared
 * records" — natural language never executes directly (rule 1). Every
 * PlannedAction maps 1:1 to a real Action Queue id; the founder never
 * sees executor ids, only the summary/fact/why below.
 */

export type DelegationIssueKind =
  | "unsupported-request"
  | "missing-permission"
  | "missing-source"
  | "ambiguous-person"
  | "ambiguous-meeting"
  | "person-not-found"
  | "meeting-not-found"
  | "executor-failure";

export interface DelegationIssue {
  kind: DelegationIssueKind;
  /** Plain, founder-facing text — no jargon, no executor/model names. */
  message: string;
}

export type PlannedActionKind = "reply" | "calendarMove" | "archive";

export interface PlannedAction {
  /** The real Action Queue id — approve()/reject()/undo() all key off this. */
  queueId: string;
  kind: PlannedActionKind;
  /** One-line founder-facing summary, e.g. "Reply to Hans Müller". */
  summary: string;
  /** What source caused this — the evidence a founder can check. */
  fact: string;
  /** Why it matters. */
  why: string;
  /** 0-100, only ever present when grounded in real evidence (e.g. the
   *  archive confidence score) — never invented for actions that don't
   *  have one. */
  confidence?: number;
}

export interface DelegationPlan {
  requestText: string;
  actions: PlannedAction[];
  issues: DelegationIssue[];
}

/** Everything buildPlan needs, gathered once from the real stores by
 *  the caller — kept explicit (not read from stores internally) so the
 *  planner is trivially testable without mocking half the app. */
export interface DelegationContext {
  snapshot: import("@/services/google/types").WorkspaceSnapshot | null;
  memory: import("@/services/operator/memorySeed").FounderMemory;
  anthropicKey: string | null;
  calendarWriteGranted: boolean;
  gmailModifyGranted: boolean;
}
