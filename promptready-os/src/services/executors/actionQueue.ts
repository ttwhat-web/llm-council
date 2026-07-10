"use client";

/**
 * Action queue · the single execution primitive for the entire product.
 *
 * Every action Operator ever takes — send an email, move a meeting,
 * message on WhatsApp, charge a card, drive a browser — flows through
 * this one state machine. The queue never imports a concrete executor
 * module; it only knows the Executor interface (types.ts) and resolves
 * verbs by id through the registry. Adding a capability is exactly one
 * `registerExecutor()` call — nothing here changes.
 *
 * Lifecycle (see types.ts for exactly what each status means):
 *
 *   detected → prepared → waiting_approval → executing → completed
 *                                                       ↘ failed
 *   waiting_approval → cancelled            (declined, or pre-execute undo)
 *   completed → undone                      (post-execute undo only)
 *
 * Persisted to localStorage so receipts, metrics, and in-flight state
 * survive a reload — a crash mid-"executing" is recovered honestly
 * (marked failed, never silently re-run and never assumed to have
 * succeeded) rather than losing the record entirely.
 */

import { create } from "zustand";
import { getExecutor } from "./registry";
import { computeQueueMetrics } from "./actionMetrics";
import type { Action, ActionLogEntry, ActionStatus, QueueMetrics } from "./types";

const STORAGE_KEY = "operator.actionQueue.v1";
const MAX_ITEMS = 500;
const MAX_LOG = 2000;

export interface DetectInput {
  id: string;
  executor: string;
  title: string;
  description?: string;
  confidence?: number;
  priority?: "high" | "medium" | "low";
  metadata?: Record<string, unknown>;
}

export interface PrepareInput<P = unknown> {
  id: string;
  executor: string;
  params: P;
  /** Optional overrides — omit to use the executor's own describe(params). */
  title?: string;
  description?: string;
  confidence?: number;
  priority?: "high" | "medium" | "low";
  metadata?: Record<string, unknown>;
}

/** Kept for callers that only ever prepare (never call detect() first). */
export type ApproveInput<P = unknown> = PrepareInput<P>;

export interface Persisted {
  items: Record<string, Action>;
  order: string[];
  log: ActionLogEntry[];
}

function readPersisted(): Persisted {
  if (typeof window === "undefined") return { items: {}, order: [], log: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: {}, order: [], log: [] };
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      items: parsed.items && typeof parsed.items === "object" ? parsed.items : {},
      order: Array.isArray(parsed.order) ? parsed.order : [],
      log: Array.isArray(parsed.log) ? parsed.log : []
    };
  } catch {
    return { items: {}, order: [], log: [] };
  }
}

function writePersisted(p: Persisted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        items: p.items,
        order: p.order.slice(0, MAX_ITEMS),
        log: p.log.slice(-MAX_LOG)
      })
    );
  } catch {
    /* quota */
  }
}

/**
 * Failure recovery · anything still "executing" when this module last
 * unloaded means the app closed (or crashed) mid-network-call. We
 * genuinely don't know if it succeeded — honesty means never assuming
 * either way. Mark it failed with a clear reason instead of silently
 * losing it or silently re-running it (which could double-send).
 * Exported (pure, no I/O) so this is directly testable — persistence
 * is a no-op under Node/no-window, so this can't be exercised any
 * other way.
 */
export function recoverOrphans(p: Persisted): Persisted {
  const now = Date.now();
  const items = { ...p.items };
  const log = [...p.log];
  let changed = false;
  for (const id of Object.keys(items)) {
    const item = items[id];
    if (item.status !== "executing") continue;
    changed = true;
    items[id] = {
      ...item,
      status: "failed",
      error: "Interrupted before completion — verify manually before retrying.",
      completedAt: now
    };
    log.push({ at: now, actionId: id, executor: item.executor, event: "recovered" });
  }
  return changed ? { ...p, items, log } : p;
}

interface ActionQueueState {
  items: Record<string, Action>;
  order: string[];
  log: ActionLogEntry[];

  /** Register a raw opportunity before concrete params exist. */
  detect(input: DetectInput): void;
  /** Register (or refresh) work ready for approval. No-op if this id
   *  already progressed past "prepared"/"detected" — a pipeline re-run
   *  never clobbers a founder's decision. */
  prepare<P>(input: PrepareInput<P>): void;
  /** Mark a prepared item as actually shown to the founder — the
   *  moment it stops being background prep and starts being a real,
   *  reversible decision in front of them. */
  markWaitingApproval(id: string): void;
  /** Refresh a not-yet-approved item's params in place (e.g. the
   *  founder edited a draft's body before sending). No-op once the
   *  item has an approvedAt — never mutates something already
   *  committed to executing. */
  updateParams<P>(id: string, params: P): void;
  /** Approve a waiting_approval item. Branches on the executor's
   *  undoStrategy: pre-execute starts a grace timer before ever
   *  calling execute(); post-execute calls execute() immediately and
   *  opens a post-completion grace window instead. */
  approve(id: string): void;
  /** Decline before anything ran. */
  reject(id: string): void;
  /** Undo — pre-execute: cancels before execute() ever runs (→
   *  cancelled). Post-execute: calls the executor's real undo() (→
   *  undone). No-op outside the grace window. */
  undo(id: string): void;
  /** Re-attempt a failed action's execute() from scratch. */
  retry(id: string): void;
  /** Approve every not-yet-approved action across every executor at
   *  once — "the same loop, no exceptions": one global gesture, not
   *  a per-executor bulk button. Returns how many were approved. */
  approveAllPending(): number;
  get(id: string): Action | undefined;
  /** Count of actions that reached "completed" (for "Morning complete"). */
  doneCount(): number;
  metrics(): QueueMetrics;
  reset(): void;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function clearTimer(id: string): void {
  const t = timers.get(id);
  if (t) {
    clearTimeout(t);
    timers.delete(id);
  }
}

export const useActionQueue = create<ActionQueueState>((set, get) => {
  const initial = recoverOrphans(readPersisted());
  writePersisted(initial);

  function commit(items: Record<string, Action>, log: ActionLogEntry[], order?: string[]) {
    const next = { items, order: order ?? get().order, log };
    writePersisted(next);
    set(next);
  }

  function appendLog(base: ActionLogEntry[], entry: ActionLogEntry): ActionLogEntry[] {
    return [...base, entry].slice(-MAX_LOG);
  }

  /** Guarded entry point: only ever called from a grace timer, a
   *  direct approve() (post-execute/no-window), or retry() — each of
   *  which lands the item on "waiting_approval"/"prepared" first, so a
   *  stray call after some other status change is safely ignored. */
  async function runExecute(id: string): Promise<void> {
    const item = get().items[id];
    if (!item || (item.status !== "waiting_approval" && item.status !== "prepared")) return;
    const executor = getExecutor(item.executor);
    if (!executor) {
      const now = Date.now();
      commit(
        { ...get().items, [id]: { ...item, status: "failed", error: `No executor registered for "${item.executor}".`, completedAt: now } },
        appendLog(get().log, { at: now, actionId: id, executor: item.executor, event: "failed", detail: "unregistered executor" })
      );
      return;
    }
    const startedAt = Date.now();
    commit(
      { ...get().items, [id]: { ...item, status: "executing", executedAt: startedAt, undoUntil: undefined } },
      appendLog(get().log, { at: startedAt, actionId: id, executor: item.executor, event: "executing" })
    );
    await attemptExecute(id, executor);
  }

  /** The actual execute() attempt + result handling, including
   *  automatic retries. Assumes the item is already "executing" —
   *  called both by runExecute's first attempt and by itself on retry,
   *  so it never re-checks the pre-execution status. */
  async function attemptExecute(id: string, executor: NonNullable<ReturnType<typeof getExecutor>>): Promise<void> {
    const before = get().items[id];
    if (!before || before.status !== "executing") return; // recovered/reset meanwhile

    let result;
    try {
      result = await executor.execute(before.params);
    } catch (e) {
      result = { ok: false as const, error: (e as Error).message };
    }

    const current = get().items[id];
    if (!current || current.status !== "executing") return; // recovered/reset meanwhile
    const now = Date.now();

    if (result.ok) {
      const undoUntil = executor.undoStrategy === "post-execute" ? now + executor.undoWindowMs : undefined;
      commit(
        { ...get().items, [id]: { ...current, status: "completed", receipt: result.receipt, ref: result.ref, completedAt: now, undoUntil } },
        appendLog(get().log, { at: now, actionId: id, executor: current.executor, event: "completed" })
      );
      return;
    }

    const retryCount = current.retryCount ?? 0;
    const maxRetries = executor.maxRetries ?? 0;
    if (retryCount < maxRetries) {
      commit(
        { ...get().items, [id]: { ...current, retryCount: retryCount + 1 } },
        appendLog(get().log, { at: now, actionId: id, executor: current.executor, event: "retried", detail: `attempt ${retryCount + 2}` })
      );
      await attemptExecute(id, executor);
      return;
    }

    commit(
      { ...get().items, [id]: { ...current, status: "failed", error: result.error, completedAt: now } },
      appendLog(get().log, { at: now, actionId: id, executor: current.executor, event: "failed", detail: result.error })
    );
  }

  return {
    items: initial.items,
    order: initial.order,
    log: initial.log,

    detect(input) {
      const existing = get().items[input.id];
      if (existing) return; // detection never overwrites anything further along
      const now = Date.now();
      const action: Action = {
        id: input.id,
        executor: input.executor,
        params: undefined,
        title: input.title,
        description: input.description,
        confidence: input.confidence,
        priority: input.priority,
        status: "detected",
        createdAt: now,
        metadata: input.metadata
      };
      commit(
        { ...get().items, [input.id]: action },
        appendLog(get().log, { at: now, actionId: input.id, executor: input.executor, event: "detected" }),
        get().order.includes(input.id) ? get().order : [input.id, ...get().order]
      );
    },

    prepare(input) {
      const existing = get().items[input.id];
      if (existing && existing.status !== "detected" && existing.status !== "prepared") return;

      const executor = getExecutor(input.executor);
      if (!executor) return; // no phantom entries for a capability that isn't registered
      const desc = executor.describe(input.params);
      const now = Date.now();
      const silent = executor.requiresApproval === false;
      const action: Action = {
        id: input.id,
        executor: input.executor,
        params: input.params,
        title: input.title ?? desc?.title ?? input.executor,
        description: input.description ?? desc?.description,
        confidence: input.confidence ?? desc?.confidence,
        priority: input.priority ?? desc?.priority,
        status: "prepared",
        createdAt: existing?.createdAt ?? now,
        metadata: silent ? { ...input.metadata, silent: true } : (input.metadata ?? existing?.metadata)
      };
      commit(
        { ...get().items, [input.id]: action },
        appendLog(get().log, { at: now, actionId: input.id, executor: input.executor, event: "prepared" }),
        get().order.includes(input.id) ? get().order : [input.id, ...get().order]
      );
      // Silent executor: trusted to run without ever asking. Still
      // real approve() → execute() → receipt/undo — just no founder
      // decision pause in between. Never used for anything that
      // sends, deletes, moves money, or touches customer data.
      if (silent) get().approve(input.id);
    },

    markWaitingApproval(id) {
      const item = get().items[id];
      if (!item || item.status !== "prepared") return;
      const now = Date.now();
      commit(
        { ...get().items, [id]: { ...item, status: "waiting_approval" } },
        appendLog(get().log, { at: now, actionId: id, executor: item.executor, event: "waiting_approval" })
      );
    },

    updateParams(id, params) {
      const item = get().items[id];
      if (!item || item.approvedAt != null) return;
      // Editable up until a founder decision has committed it to run:
      // still-pending, previously declined, or previously failed — a
      // fresh edit before re-approving/retrying is normal, not a reset.
      const editable: ActionStatus[] = ["prepared", "waiting_approval", "cancelled", "failed"];
      if (!editable.includes(item.status)) return;
      const executor = getExecutor(item.executor);
      const desc = executor?.describe(params);
      commit(
        {
          ...get().items,
          [id]: {
            ...item,
            params,
            title: desc?.title ?? item.title,
            description: desc?.description ?? item.description
          }
        },
        get().log
      );
    },

    approve(id) {
      const item = get().items[id];
      // waiting_approval with approvedAt already set means it's mid
      // grace-window — a stray second approve() call is a no-op, never
      // a duplicate timer.
      const alreadyApproving = item?.status === "waiting_approval" && item.approvedAt != null;
      const approvable: ActionStatus[] = ["prepared", "waiting_approval", "cancelled"];
      if (!item || alreadyApproving || !approvable.includes(item.status)) return;
      const executor = getExecutor(item.executor);
      if (!executor) {
        const now = Date.now();
        commit(
          { ...get().items, [id]: { ...item, status: "failed", error: `No executor registered for "${item.executor}".`, completedAt: now } },
          appendLog(get().log, { at: now, actionId: id, executor: item.executor, event: "failed", detail: "unregistered executor" })
        );
        return;
      }

      const now = Date.now();
      // Re-approving after a cancel/failure clears the stale terminal
      // fields — this is a fresh attempt, not a resumed one.
      const freshItem = { ...item, error: undefined, completedAt: undefined, retryCount: 0 };
      if (executor.undoStrategy === "pre-execute" && executor.undoWindowMs > 0) {
        commit(
          { ...get().items, [id]: { ...freshItem, status: "waiting_approval", approvedAt: now, undoUntil: now + executor.undoWindowMs } },
          appendLog(get().log, { at: now, actionId: id, executor: item.executor, event: "approved" })
        );
        const t = setTimeout(() => {
          timers.delete(id);
          void runExecute(id);
        }, executor.undoWindowMs);
        timers.set(id, t);
        return;
      }

      commit(
        { ...get().items, [id]: { ...freshItem, status: "waiting_approval", approvedAt: now, undoUntil: undefined } },
        appendLog(get().log, { at: now, actionId: id, executor: item.executor, event: "approved" })
      );
      void runExecute(id);
    },

    reject(id) {
      const item = get().items[id];
      if (!item || item.status !== "prepared" && item.status !== "waiting_approval") return;
      clearTimer(id);
      const now = Date.now();
      commit(
        { ...get().items, [id]: { ...item, status: "cancelled", completedAt: now, undoUntil: undefined } },
        appendLog(get().log, { at: now, actionId: id, executor: item.executor, event: "cancelled" })
      );
    },

    undo(id) {
      const item = get().items[id];
      if (!item) return;
      const now = Date.now();

      // Pre-execute grace window: cancel before execute() ever runs.
      if (item.status === "waiting_approval" && item.undoUntil != null && now < item.undoUntil) {
        clearTimer(id);
        commit(
          { ...get().items, [id]: { ...item, status: "cancelled", completedAt: now, undoUntil: undefined } },
          appendLog(get().log, { at: now, actionId: id, executor: item.executor, event: "cancelled", detail: "undone pre-execute" })
        );
        return;
      }

      // Post-execute grace window: a real compensating call.
      if (item.status === "completed" && item.undoUntil != null && now < item.undoUntil) {
        const executor = getExecutor(item.executor);
        if (!executor?.undo) return; // honesty: no compensating action exists, no-op
        void executor.undo(item.params, item.ref).then(
          () => {
            const cur = get().items[id];
            if (!cur) return;
            commit(
              { ...get().items, [id]: { ...cur, status: "undone", completedAt: Date.now(), undoUntil: undefined } },
              appendLog(get().log, { at: Date.now(), actionId: id, executor: item.executor, event: "undone" })
            );
          },
          (e) => {
            const cur = get().items[id];
            if (!cur) return;
            commit(
              { ...get().items, [id]: { ...cur, error: `Undo failed: ${(e as Error).message}` } },
              appendLog(get().log, { at: Date.now(), actionId: id, executor: item.executor, event: "failed", detail: "undo failed" })
            );
          }
        );
      }
    },

    retry(id) {
      const item = get().items[id];
      if (!item || item.status !== "failed") return;
      const now = Date.now();
      // Land on "waiting_approval" (no grace window) so runExecute's
      // entry guard accepts it, then immediately hand off to execute —
      // a manual retry means the founder already asked for it now.
      commit(
        { ...get().items, [id]: { ...item, status: "waiting_approval", retryCount: (item.retryCount ?? 0) + 1, error: undefined, undoUntil: undefined } },
        appendLog(get().log, { at: now, actionId: id, executor: item.executor, event: "retried", detail: "manual retry" })
      );
      void runExecute(id);
    },

    approveAllPending() {
      const items = get().items;
      const approveFn = get().approve;
      let count = 0;
      for (const [id, action] of Object.entries(items)) {
        const isPending =
          action.status === "prepared" ||
          action.status === "cancelled" ||
          (action.status === "waiting_approval" && action.approvedAt == null);
        if (!isPending) continue;
        approveFn(id);
        count++;
      }
      return count;
    },

    get(id) {
      return get().items[id];
    },

    doneCount() {
      return Object.values(get().items).filter((a) => a.status === "completed").length;
    },

    metrics() {
      return computeQueueMetrics(Object.values(get().items));
    },

    reset() {
      for (const id of Object.keys(get().items)) clearTimer(id);
      writePersisted({ items: {}, order: [], log: [] });
      set({ items: {}, order: [], log: [] });
    }
  };
});

export { undoSecondsLeft, computeActionTiming, computeQueueMetrics } from "./actionMetrics";
