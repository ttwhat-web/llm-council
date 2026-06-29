"use client";

/**
 * Send queue · the trust mechanism behind the one-keystroke ✓.
 *
 * When the founder approves a draft, it does NOT send immediately. It
 * enters a 30-second "sending" window during which a single Undo
 * cancels it. If the window elapses without an undo, the message is
 * sent for real via Gmail (gmail.send) and a receipt is recorded.
 *
 * This is what makes a founder comfortable letting software send mail
 * in their name: nothing is irreversible for 30 seconds, every send
 * is visible, and the receipt log proves what went out.
 *
 * Pure-ish: the queue logic (enqueue / undo / countdown / settle) is a
 * deterministic state machine, unit-tested with a fake clock + fake
 * sender. Only the real `sendMessage` call touches the network.
 */

import { create } from "zustand";
import { sendMessage, type SendMessageInput } from "@/services/google/gmailClient";

export const UNDO_WINDOW_MS = 30_000;

export type SendStatus = "pending" | "sending" | "sent" | "undone" | "error";

export interface QueuedSend {
  id: string;
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  status: SendStatus;
  /** Unix ms when the undo window ends (status === "sending"). */
  undoUntil?: number;
  /** Gmail message id once sent. */
  sentMessageId?: string;
  error?: string;
  /** Unix ms when this entry reached its terminal state. */
  settledAt?: number;
}

interface SendQueueState {
  items: Record<string, QueuedSend>;
  /** Order of ids, newest first. */
  order: string[];
  approve(input: { id: string } & SendMessageInput): void;
  undo(id: string): void;
  get(id: string): QueuedSend | undefined;
}

// The real sender. Swapped for a fake in tests.
type Sender = (input: SendMessageInput) => Promise<{ id: string; threadId: string }>;
let sender: Sender = sendMessage;

/** Test seam · inject a fake sender. */
export function __setSenderForTests(fn: Sender): void {
  sender = fn;
}

// Active undo timers, keyed by queue id.
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useSendQueueStore = create<SendQueueState>((set, get) => ({
  items: {},
  order: [],

  approve(input) {
    const now = Date.now();
    const item: QueuedSend = {
      id: input.id,
      to: input.to,
      subject: input.subject,
      body: input.body,
      threadId: input.threadId,
      inReplyTo: input.inReplyTo,
      status: "sending",
      undoUntil: now + UNDO_WINDOW_MS
    };
    set((s) => ({
      items: { ...s.items, [input.id]: item },
      order: [input.id, ...s.order.filter((x) => x !== input.id)]
    }));

    const t = setTimeout(() => {
      timers.delete(input.id);
      void settle(input.id, set, get);
    }, UNDO_WINDOW_MS);
    timers.set(input.id, t);
  },

  undo(id) {
    const item = get().items[id];
    if (!item || item.status !== "sending") return;
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
  }
}));

async function settle(
  id: string,
  set: (fn: (s: SendQueueState) => Partial<SendQueueState>) => void,
  get: () => SendQueueState
): Promise<void> {
  const item = get().items[id];
  if (!item || item.status !== "sending") return; // undone in the meantime
  try {
    const result = await sender({
      to: item.to,
      subject: item.subject,
      body: item.body,
      threadId: item.threadId,
      inReplyTo: item.inReplyTo
    });
    set((s) => ({
      items: {
        ...s.items,
        [id]: {
          ...s.items[id],
          status: "sent",
          undoUntil: undefined,
          sentMessageId: result.id,
          threadId: result.threadId || s.items[id].threadId,
          settledAt: Date.now()
        }
      }
    }));
  } catch (e) {
    set((s) => ({
      items: {
        ...s.items,
        [id]: {
          ...s.items[id],
          status: "error",
          undoUntil: undefined,
          error: (e as Error).message,
          settledAt: Date.now()
        }
      }
    }));
  }
}

/**
 * Pure helper for the UI countdown. Returns whole seconds remaining in
 * the undo window, clamped to >= 0.
 */
export function undoSecondsLeft(item: QueuedSend, now: number = Date.now()): number {
  if (item.status !== "sending" || item.undoUntil == null) return 0;
  return Math.max(0, Math.ceil((item.undoUntil - now) / 1000));
}
