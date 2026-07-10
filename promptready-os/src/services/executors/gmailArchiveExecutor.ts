/**
 * Silent executor · archive obvious inbox noise (F23).
 *
 * The executor declares itself trusted to run without asking, but
 * whether any given action actually does is decided per-instance by
 * the caller (see services/drafting/archiveCandidates.ts): hard denies
 * (invoices, payments, proposals, reservations, legal, calendar
 * invites, any thread the founder has personally replied in) are never
 * candidates at all; among what's left, only when multiple independent
 * signals agree (>=95 confidence) does the caller let this run silent —
 * otherwise it's prepared with forceApproval, same as any other action.
 * Never sends, never deletes, never touches a real conversation. Real
 * undo: undoStrategy "post-execute" means the archive already happened
 * by the time it's shown, but undo() genuinely re-adds the INBOX label
 * — never a fake reversal.
 *
 * Requires the gmail.modify scope, granted separately from the base
 * connect flow (see GMAIL_MODIFY_SCOPE in oauthClient.ts) — the queue
 * never prepares this until that scope is actually granted, matching
 * how Calendar write already works.
 */

import { archiveMessage, unarchiveMessage } from "@/services/google/gmailClient";
import type { Executor } from "./types";

export const GMAIL_ARCHIVE_EXECUTOR_ID = "gmail.archive";
const UNDO_WINDOW_MS = 30_000;

export interface GmailArchiveParams {
  messageId: string;
  subject: string;
  fromName: string;
  /** Why this was judged safe to archive — the founder-facing evidence,
   *  never a placeholder. Carried through to the receipt so Timeline
   *  shows exactly why, not just that it happened. */
  reason: string;
}

export const gmailArchiveExecutor: Executor<GmailArchiveParams> = {
  id: GMAIL_ARCHIVE_EXECUTOR_ID,
  label: "Archive message",
  mode: "native",
  undoStrategy: "post-execute",
  undoWindowMs: UNDO_WINDOW_MS,
  requiresApproval: false,
  describe(params) {
    return {
      title: `Archive: ${params.subject || "(no subject)"}`,
      description: `${params.fromName} · ${params.reason}`
    };
  },
  async execute(params) {
    try {
      await archiveMessage(params.messageId);
      return {
        ok: true,
        receipt: `Archived "${params.subject || "(no subject)"}" — ${params.reason}`,
        ref: { messageId: params.messageId }
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
  async undo(params) {
    await unarchiveMessage(params.messageId);
  }
};
