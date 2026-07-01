/**
 * Executor #1 · Gmail send (native).
 *
 * Wraps the existing gmailClient.sendMessage as an Executor so the
 * action queue can drive it exactly like every future verb. The email
 * feature is now just one registration; nothing about the queue or the
 * approval UI is email-specific.
 */

import { sendMessage, type SendMessageInput } from "@/services/google/gmailClient";
import type { Executor } from "./types";

export const GMAIL_SEND_EXECUTOR_ID = "gmail.send";
const UNDO_WINDOW_MS = 30_000;

export const gmailSendExecutor: Executor<SendMessageInput> = {
  id: GMAIL_SEND_EXECUTOR_ID,
  label: "Send email",
  mode: "native",
  undoWindowMs: UNDO_WINDOW_MS,
  describe(params) {
    return {
      title: `Reply to ${params.to}`,
      detail: params.subject
    };
  },
  async execute(params) {
    try {
      const result = await sendMessage(params);
      return {
        ok: true,
        receipt: `Sent to ${params.to}.`,
        ref: { messageId: result.id, threadId: result.threadId }
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }
};
