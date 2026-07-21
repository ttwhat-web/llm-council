"use client";

/**
 * Founder Feedback · the only thing Operator is allowed to learn from.
 *
 * A 1-tap reaction after every completed action turns it into
 * supervised training data:
 *   👍 Perfect      · approval without edit, prompt version + model
 *   👌 Needed edits · edit distance + what needed changing
 *   👎 Not usable   · what Operator should have done instead
 *
 * Permanent rule: Operator never becomes smarter from assumptions —
 * only from what the founder explicitly said. This store never infers
 * a rating from behavior; every event here was a deliberate tap.
 *
 * Local-only, same as metrics.ts. One event per actionId (a second
 * reaction on the same action is ignored — the first honest reaction
 * is the training signal).
 */

import { create } from "zustand";

export type FeedbackRating = "perfect" | "needed_edits" | "not_usable";

export type EditReason =
  | "tone"
  | "too_formal"
  | "too_casual"
  | "too_long"
  | "too_short"
  | "wrong_language"
  | "wrong_facts"
  | "missing_context"
  | "other";

export const EDIT_REASONS: Array<{ value: EditReason; label: string }> = [
  { value: "tone", label: "Tone" },
  { value: "too_formal", label: "Too formal" },
  { value: "too_casual", label: "Too casual" },
  { value: "too_long", label: "Too long" },
  { value: "too_short", label: "Too short" },
  { value: "wrong_language", label: "Wrong language" },
  { value: "wrong_facts", label: "Wrong facts" },
  { value: "missing_context", label: "Missing context" },
  { value: "other", label: "Other" }
];

export interface FeedbackEvent {
  actionId: string;
  at: number;
  rating: FeedbackRating;
  promptVersion: string;
  model: string;
  timeToApproveMs: number | null;
  /** "perfect" only. */
  approvalWithoutEdit: boolean | null;
  /** "needed_edits" only. */
  editDistance: number | null;
  editReason: EditReason | null;
  editReasonOther: string | null;
  /** "not_usable" only — what Operator should have done instead. */
  correction: string | null;
}

const STORAGE_KEY = "operator.feedback.v0";
const MAX_EVENTS = 2000;

function readEvents(): FeedbackEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FeedbackEvent[]) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: FeedbackEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* quota */
  }
}

interface FeedbackState {
  events: FeedbackEvent[];
  hasFeedback(actionId: string): boolean;
  recordPerfect(input: {
    actionId: string;
    promptVersion: string;
    model: string;
    approvalWithoutEdit: boolean;
    timeToApproveMs: number | null;
  }): void;
  recordNeededEdits(input: {
    actionId: string;
    promptVersion: string;
    model: string;
    editDistance: number;
    editReason: EditReason;
    editReasonOther?: string;
  }): void;
  recordNotUsable(input: {
    actionId: string;
    promptVersion: string;
    model: string;
    correction: string;
  }): void;
  exportJson(): string;
  reset(): void;
}

function append(get: () => FeedbackState, set: (partial: Partial<FeedbackState>) => void, event: FeedbackEvent): void {
  if (get().hasFeedback(event.actionId)) return;
  const next = [...get().events, event].slice(-MAX_EVENTS);
  writeEvents(next);
  set({ events: next });
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  events: readEvents(),

  hasFeedback(actionId) {
    return get().events.some((e) => e.actionId === actionId);
  },

  recordPerfect({ actionId, promptVersion, model, approvalWithoutEdit, timeToApproveMs }) {
    append(get, set, {
      actionId,
      at: Date.now(),
      rating: "perfect",
      promptVersion,
      model,
      timeToApproveMs,
      approvalWithoutEdit,
      editDistance: null,
      editReason: null,
      editReasonOther: null,
      correction: null
    });
  },

  recordNeededEdits({ actionId, promptVersion, model, editDistance, editReason, editReasonOther }) {
    append(get, set, {
      actionId,
      at: Date.now(),
      rating: "needed_edits",
      promptVersion,
      model,
      timeToApproveMs: null,
      approvalWithoutEdit: false,
      editDistance,
      editReason,
      editReasonOther: editReasonOther?.trim() || null,
      correction: null
    });
  },

  recordNotUsable({ actionId, promptVersion, model, correction }) {
    append(get, set, {
      actionId,
      at: Date.now(),
      rating: "not_usable",
      promptVersion,
      model,
      timeToApproveMs: null,
      approvalWithoutEdit: false,
      editDistance: null,
      editReason: null,
      editReasonOther: null,
      correction: correction.trim()
    });
  },

  exportJson() {
    return JSON.stringify(get().events, null, 2);
  },

  reset() {
    writeEvents([]);
    set({ events: [] });
  }
}));
