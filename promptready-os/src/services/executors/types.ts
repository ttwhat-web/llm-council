/**
 * Executor architecture · the permanent spine of Operator.
 *
 * Operator is ONE orchestrator coordinating many executors. Gmail is
 * executor #1, Calendar #2. WhatsApp, Slack, Stripe, Browser,
 * Computer Use, ERP, CRM, Voice, Desktop — every future capability is
 * one more registration, never a queue change and never a bespoke
 * approval screen. The founder never sees an executor name; Operator
 * only ever says "I prepared work."
 *
 * Architectural rule (permanent): API-first but not API-limited.
 * Every executor declares its execution mode. The action queue and
 * the approval UI are mode-agnostic and executor-agnostic — a founder
 * approving "move my 10:30" cannot tell whether it went through the
 * Calendar API or a headless browser driving a legacy portal.
 */

export type ExecutionMode =
  /** A real provider API (Gmail, Stripe, Google Calendar, Slack…). */
  | "native"
  /** Browser or desktop automation for systems with no usable API
   *  (ERP, SAP, banking portals, government sites, legacy software). */
  | "computer-use";

/**
 * How an executor's undo actually works — never assumed, always
 * declared, because "undo" must never be a lie:
 *
 *   pre-execute  · nothing has happened yet. Approve() starts an
 *                  undoWindowMs grace timer; execute() only runs once
 *                  it elapses. Undo during the window means execute()
 *                  never runs at all — a 100% honest cancel. This is
 *                  how Gmail send works (the same trick as Gmail's own
 *                  "undo send": the send is delayed, not reversed).
 *   post-execute · execute() runs immediately on approval. Completion
 *                  opens an undoWindowMs grace period during which
 *                  undo() performs a REAL compensating call (e.g. move
 *                  a calendar event back). Only usable when a genuine
 *                  reversal exists.
 *   none         · irreversible (e.g. a charge). No undo is ever
 *                  offered — never a fake button that does nothing.
 */
export type UndoStrategy = "pre-execute" | "post-execute" | "none";

/** What an executor produces when it runs. */
export type ExecutionResult =
  | { ok: true; receipt: string; ref?: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Human-readable summary of what an action will do, snapshotted at
 * prepare time so the queue + UI never need to reach back into the
 * executor to render a card or a receipt. Confidence/priority are
 * optional per executor — the queue never invents a number an
 * executor didn't supply.
 */
export interface ActionDescription {
  /** Short line for the approval card and the receipt log. */
  title: string;
  /** Optional secondary detail (subject, amount, target). */
  description?: string;
  /** 0–100. Omit rather than guess. */
  confidence?: number;
  priority?: "high" | "medium" | "low";
}

/**
 * An executor is a single verb Operator can perform in the world.
 * Generic over its parameter shape; the queue treats params opaquely
 * and NEVER imports a concrete executor module — only this interface.
 */
export interface Executor<P = unknown> {
  /** Stable id, e.g. "gmail.send", "gcal.move", "whatsapp.send". */
  id: string;
  /** Human label, e.g. "Send email". Never shown as agent management. */
  label: string;
  /** native | computer-use. The founder never sees this. */
  mode: ExecutionMode;
  undoStrategy: UndoStrategy;
  /** Grace window in ms. 0 when undoStrategy === "none". */
  undoWindowMs: number;
  /** How many automatic retries on a failed execute() before giving
   *  up. Default 0 (no silent retries) when omitted. */
  maxRetries?: number;
  /** The autonomy ladder, collapsed to what's actually load-bearing
   *  today: true (default) means a founder decision is required —
   *  every executor built so far. false means this executor is
   *  trusted to run without ever asking, because what it does is
   *  non-destructive and reversible by design (e.g. archiving —
   *  never sending, deleting, moving money, or touching customer
   *  data). The founder never loses visibility either way: silent
   *  actions still appear in Timeline and still support undo. */
  requiresApproval?: boolean;
  /** Render the approval card / receipt text from params. Pure. */
  describe(params: P): ActionDescription;
  /** Perform the verb. Only this touches the network / automation. */
  execute(params: P): Promise<ExecutionResult>;
  /** Required when undoStrategy === "post-execute": perform the real
   *  reversal. Receives the completed execution's ref alongside the
   *  original params. */
  undo?(params: P, ref: Record<string, unknown> | undefined): Promise<void>;
}

export type ActionStatus =
  /** A detector identified an opportunity; concrete params don't exist yet. */
  | "detected"
  /** The system generated concrete params (a draft, a computed move) —
   *  ready, but not yet shown to the founder. */
  | "prepared"
  /** Shown to the founder (or, for pre-execute executors, approved and
   *  inside the still-reversible grace window). Genuinely reversible. */
  | "waiting_approval"
  /** The undo window elapsed (or there wasn't one); executor.execute()
   *  is running. */
  | "executing"
  /** Executed successfully. */
  | "completed"
  /** Executor threw / returned ok:false, and retries (if any) are exhausted. */
  | "failed"
  /** Declined before anything ran — rejected outright, or undone during
   *  a pre-execute grace window. Nothing happened. */
  | "cancelled"
  /** Reversed after a real completion via the executor's undo(). */
  | "undone";

/** A concrete action instance moving through the queue. */
export interface Action<P = unknown> {
  id: string;
  /** Executor id this action runs through. The queue never imports the
   *  executor module itself — only this string + the registry. */
  executor: string;
  /** Opaque to the queue; passed straight to the executor. */
  params: P;
  title: string;
  description?: string;
  /** 0–100, from the executor/detector that produced this action. */
  confidence?: number;
  priority?: "high" | "medium" | "low";
  status: ActionStatus;

  createdAt: number;
  approvedAt?: number;
  executedAt?: number;
  /** Set once the action reaches ANY terminal status. */
  completedAt?: number;
  /** Unix ms when the undo grace window closes. */
  undoUntil?: number;

  /** Receipt string once completed. */
  receipt?: string;
  /** Executor ref (message id, event id, payment id…). */
  ref?: Record<string, unknown>;
  error?: string;
  /** How many execute() attempts have run (starts at 0). */
  retryCount?: number;

  /** Free-form, executor/detector-specific context (e.g. detector id,
   *  prompt version, model) — never read by the queue or the generic
   *  approval UI, only carried for logging/analytics. */
  metadata?: Record<string, unknown>;
}

/** One entry in the queue's own append-only activity log. */
export interface ActionLogEntry {
  at: number;
  actionId: string;
  executor: string;
  event:
    | "detected"
    | "prepared"
    | "waiting_approval"
    | "approved"
    | "executing"
    | "completed"
    | "failed"
    | "retried"
    | "cancelled"
    | "undone"
    | "recovered";
  detail?: string;
}

/** Derived timing for a single action — pure, no clock reads. */
export interface ActionTiming {
  /** approvedAt → completedAt, ms. */
  timeToApproveMs: number | null;
  /** executedAt → completedAt, ms (actual execution duration). */
  executionMs: number | null;
  /** createdAt → completedAt, ms (full lifecycle). */
  totalMs: number | null;
}

/** Aggregate queue health — separate concern from draft-quality KPIs
 *  (store/metrics.ts). This is "is the execution plumbing healthy?",
 *  not "are the drafts good?". */
export interface QueueMetrics {
  total: number;
  byStatus: Record<ActionStatus, number>;
  byExecutor: Record<string, number>;
  /** completed / (completed + failed). null when neither has happened yet. */
  successRate: number | null;
  medianExecutionMs: number | null;
  medianTimeToApproveMs: number | null;
  totalRetries: number;
}
