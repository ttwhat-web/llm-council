/**
 * Calendar move executor · the second real executor.
 *
 * Same shape as gmail.send: describe() renders the approval card,
 * execute() touches the network, the action queue owns the 30s undo
 * window. Operator's second verb, proving the orchestrator isn't
 * email-shaped — it's execution-shaped.
 */

import { moveEvent, type MoveEventInput } from "@/services/google/calendarWriteClient";
import type { Executor } from "./types";

export const CALENDAR_MOVE_EXECUTOR_ID = "gcal.move";
const UNDO_WINDOW_MS = 30_000;

export interface CalendarMoveParams extends MoveEventInput {
  summary: string;
}

export const calendarMoveExecutor: Executor<CalendarMoveParams> = {
  id: CALENDAR_MOVE_EXECUTOR_ID,
  label: "Move calendar event",
  mode: "native",
  undoWindowMs: UNDO_WINDOW_MS,

  describe(params) {
    const time = new Date(params.newStartMs).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit"
    });
    return {
      title: `Move "${params.summary}" to ${time}`,
      detail: new Date(params.newStartMs).toLocaleDateString()
    };
  },

  async execute(params) {
    try {
      const result = await moveEvent(params);
      const time = new Date(params.newStartMs).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit"
      });
      return {
        ok: true,
        receipt: `Moved to ${time}.`,
        ref: { eventId: result.id, htmlLink: result.htmlLink }
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }
};
