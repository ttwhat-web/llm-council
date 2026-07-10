/**
 * Silent executor · archive obvious inbox noise (F23).
 *
 * The one executor that runs without ever asking — because what it
 * does is genuinely safe: it only removes the INBOX label from a
 * message Operator is highly confident is noise (a no-reply sender,
 * a known automated domain — the exact heuristic already used to
 * keep noise out of drafted replies, see services/drafting/candidates.ts).
 * Never sends, never deletes, never touches customer data. Real undo:
 * undoStrategy "post-execute" means the archive already happened by
 * the time it's shown, but undo() genuinely re-adds the INBOX label —
 * never a fake reversal.
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
}

export const gmailArchiveExecutor: Executor<GmailArchiveParams> = {
  id: GMAIL_ARCHIVE_EXECUTOR_ID,
  label: "Archive message",
  mode: "native",
  undoStrategy: "post-execute",
  undoWindowMs: UNDO_WINDOW_MS,
  requiresApproval: false,
  describe(params) {
    return { title: `Archive: ${params.subject || "(no subject)"}`, description: params.fromName };
  },
  async execute(params) {
    try {
      await archiveMessage(params.messageId);
      return { ok: true, receipt: `Archived "${params.subject || "(no subject)"}".`, ref: { messageId: params.messageId } };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
  async undo(params) {
    await unarchiveMessage(params.messageId);
  }
};
