"use client";

/**
 * Action queue · the one approval + undo + execute + receipt loop for
 * EVERY executor. Generalizes the email send queue: approve stages an
 * action in an undo window; if the window elapses untouched, the queue
 * resolves the executor from the registry and runs it; the result
 * becomes a receipt. Undo cancels before anything happens.
 *
 * This is the founder's single gesture — the ✓ — no matter which verb
 * (email, calendar, WhatsApp, payment, computer-use) it drives.
 *
 * Deterministic + unit-tested with a fake clock and fake executors.
 * Only the executor's execute() touches the network / automation.
 */

import { create } from "zustand";
import { getExecutor } from "./registry";
import type { Action } from "./types";

export interface ApproveInput {
  /** Stable queue id, e.g. `gmail.send:hans@acme.de`. */
  id: string;
  executorId: string;
  params: unknown;
}

interface ActionQueueState {
  items: Record<string, Action>;
  order: string[];
  approve(input: ApproveInput): void;
  undo(id: string): void;
  get(id: string): Action | undefined;
  /** Count of actions that ended in "done" (for "Morning complete"). */
  doneCount(): number;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useActionQueue = create<ActionQueueState>((set, get) => ({
  items: {},
  order: [],

  approve(input) {
    const executor = getExecutor(input.executorId);
    if (!executor) {
      // Unknown executor → surface an honest error rather than silently
      // dropping the founder's approval.
      const failed: Action = {
        id: input.id,
        executorId: input.executorId,
        params: input.params,
        title: input.executorId,
        status: "error",
        error: `No executor registered for "${input.executorId}".`,
        settledAt: Date.now()
      };
      set((s) => ({
        items: { ...s.items, [input.id]: failed },
        order: [input.id, ...s.order.filter((x) => x !== input.id)]
      }));
      return;
    }

    const desc = executor.describe(input.params);
    const now = Date.now();
    const action: Action = {
      id: input.id,
      executorId: input.executorId,
      params: input.params,
      title: desc.title,
      detail: desc.detail,
      status: "queued",
      undoUntil: now + executor.undoWindowMs
    };
    set((s) => ({
      items: { ...s.items, [input.id]: action },
      order: [input.id, ...s.order.filter((x) => x !== input.id)]
    }));

    const t = setTimeout(() => {
      timers.delete(input.id);
      void settle(input.id, set, get);
    }, executor.undoWindowMs);
    timers.set(input.id, t);
  },

  undo(id) {
    const item = get().items[id];
    if (!item || item.status !== "queued") return;
    const t = timers.get(id);
    if (t) {
      clearTimeout(t);
      timers.delete(id);
    }
    set((s) => ({
      items: {
        ...s.items,
        [id]: { ...item, status: "undone", undoUntil: undefined, settledAt: Date.now() }
      }
    }));
  },

  get(id) {
    return get().items[id];
  },

  doneCount() {
    return Object.values(get().items).filter((a) => a.status === "done").length;
  }
}));

async function settle(
  id: string,
  set: (fn: (s: ActionQueueState) => Partial<ActionQueueState>) => void,
  get: () => ActionQueueState
): Promise<void> {
  const item = get().items[id];
  if (!item || item.status !== "queued") return; // undone meanwhile
  const executor = getExecutor(item.executorId);
  if (!executor) {
    set((s) => ({
      items: {
        ...s.items,
        [id]: { ...s.items[id], status: "error", undoUntil: undefined, error: "Executor vanished.", settledAt: Date.now() }
      }
    }));
    return;
  }

  set((s) => ({
    items: { ...s.items, [id]: { ...s.items[id], status: "executing", undoUntil: undefined } }
  }));

  try {
    const result = await executor.execute(item.params);
    set((s) => ({
      items: {
        ...s.items,
        [id]:
          result.ok
            ? {
                ...s.items[id],
                status: "done",
                receipt: result.receipt,
                ref: result.ref,
                settledAt: Date.now()
              }
            : {
                ...s.items[id],
                status: "error",
                error: result.error,
                settledAt: Date.now()
              }
      }
    }));
  } catch (e) {
    set((s) => ({
      items: {
        ...s.items,
        [id]: { ...s.items[id], status: "error", error: (e as Error).message, settledAt: Date.now() }
      }
    }));
  }
}

/** Whole seconds left in the undo window; 0 when not queued. */
export function undoSecondsLeft(item: Action, now: number = Date.now()): number {
  if (item.status !== "queued" || item.undoUntil == null) return 0;
  return Math.max(0, Math.ceil((item.undoUntil - now) / 1000));
}
