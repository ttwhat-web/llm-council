/**
 * Executor architecture · the permanent spine of Operator.
 *
 * Operator is ONE orchestrator coordinating many executors. Email is
 * executor #1. Calendar, WhatsApp, Stripe, documents, CRM, and — where
 * no API exists — browser/desktop computer-use are future executors.
 * The user never sees or manages them. They see one Operator; behind
 * it, a registry of verbs.
 *
 * Architectural rule (permanent): API-first but not API-limited.
 * Every executor declares its execution mode. The action queue and the
 * approval UI are mode-agnostic — a founder approving "move my 10:30"
 * cannot tell whether it went through the Calendar API or a headless
 * browser driving a legacy portal. That's the point.
 */

export type ExecutionMode =
  /** A real provider API (Gmail, Stripe, Google Calendar, Slack…). */
  | "native"
  /** Browser or desktop automation for systems with no usable API
   *  (ERP, SAP, banking portals, government sites, legacy software). */
  | "computer-use";

/** What an executor produces when it runs. */
export type ExecutionResult =
  | { ok: true; receipt: string; ref?: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Human-readable summary of what an action will do, snapshotted at
 * approve time so the queue + UI never need to reach back into the
 * executor to render a card or a receipt.
 */
export interface ActionDescription {
  /** Short line for the approval card and the receipt log. */
  title: string;
  /** Optional secondary detail (subject, amount, target). */
  detail?: string;
}

/**
 * An executor is a single verb Operator can perform in the world.
 * Generic over its parameter shape; the queue treats params opaquely.
 */
export interface Executor<P = unknown> {
  /** Stable id, e.g. "gmail.send", "gcal.move", "whatsapp.send". */
  id: string;
  /** Human label, e.g. "Send email". Never shown as agent management. */
  label: string;
  /** native | computer-use. The founder never sees this. */
  mode: ExecutionMode;
  /** Undo window in ms before the action actually executes. */
  undoWindowMs: number;
  /** Render the approval card / receipt text from params. Pure. */
  describe(params: P): ActionDescription;
  /** Perform the verb. Only this touches the network / automation. */
  execute(params: P): Promise<ExecutionResult>;
}

export type ActionStatus =
  /** In the undo window; not yet executed. */
  | "queued"
  /** Undo window elapsed; executor is running. */
  | "executing"
  /** Executed successfully. */
  | "done"
  /** Cancelled during the undo window. */
  | "undone"
  /** Executor threw / returned ok:false. */
  | "error";

/** A concrete action instance the founder approved. */
export interface Action {
  id: string;
  executorId: string;
  /** Opaque to the queue; passed straight to the executor. */
  params: unknown;
  /** Snapshotted describe() output, so the UI never needs the executor. */
  title: string;
  detail?: string;
  status: ActionStatus;
  /** Unix ms when the undo window closes (status === "queued"). */
  undoUntil?: number;
  /** Receipt string once done. */
  receipt?: string;
  /** Executor ref (message id, event id, payment id…). */
  ref?: Record<string, unknown>;
  error?: string;
  /** Unix ms when the action reached a terminal state. */
  settledAt?: number;
}
