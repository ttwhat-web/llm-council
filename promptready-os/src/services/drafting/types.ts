/**
 * Drafting types · the shape of input/output for reply drafts.
 *
 * Pure data. The service in `draftReply.ts` is the only thing that
 * touches the network; everything else (UI, tests) operates on these
 * types.
 */

import type { GmailMessage } from "@/services/google/types";
import type { FounderMemory } from "@/services/operator/memorySeed";

export interface DraftContext {
  /** The customer we're drafting to. */
  customerName: string;
  customerEmail: string;
  /** Most recent thread messages, ordered oldest → newest, capped at 5. */
  threadMessages: GmailMessage[];
  /** Days since the customer's most recent message. */
  daysSinceLastInbound: number;
  /** Subject from the thread's most recent message (we prefix "Re:"). */
  subject: string;
}

export interface DraftRequest {
  context: DraftContext;
  /** The founder's first name — used to sign off the draft. */
  founderFirstName: string | null;
  /** "follow-up" is the only intent in P0. More verbs land in P1. */
  intent: "follow-up";
  /** Optional founder memory. When present, spliced into the prompt
   *  as a profile block so the draft uses real company / tone /
   *  preferred-language context. When null, no profile block is
   *  added and Operator stays generic. */
  memory?: FounderMemory | null;
}

export interface DraftResponse {
  /** What lands in the To: field. */
  to: string;
  /** What lands in the Subject: field. */
  subject: string;
  /** Body text the founder reviews before sending. */
  body: string;
  /** Identifier the UI uses to key the draft to its customer. */
  customerEmail: string;
  /** Prompt template version active when this draft was generated —
   *  attached at generation time so feedback always attributes to the
   *  version that actually produced the text, even after the live
   *  constant moves on to a newer version. */
  promptVersion: string;
  /** Model that generated this draft. */
  model: string;
}

export type DraftResult =
  | { ok: true; draft: DraftResponse }
  | { ok: false; error: string };
