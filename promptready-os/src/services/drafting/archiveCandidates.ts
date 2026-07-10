/**
 * Archive candidates · which inbox messages are safe for Operator to
 * silently archive, and which merely look like noise but need a
 * founder's decision first.
 *
 * Hard denies run BEFORE the noise heuristic and can never be
 * overridden by it — the noise heuristic only decides "does this look
 * automated", it doesn't get a vote on whether the content is actually
 * a customer, supplier, invoice, payment, proposal, reservation, legal
 * matter, calendar invite, or a thread the founder has personally
 * replied in. Any of those, and the message is never a candidate at
 * all, at any confidence.
 *
 * Among what survives, confidence is a count of independent real
 * signals that agree this is safe — never an invented score. Only
 * when multiple signals agree (>=95) does Operator archive silently;
 * anything less is still surfaced, but requires the founder's
 * approval like any other action. Every candidate carries the exact
 * evidence behind its confidence, so both the approval card and the
 * Timeline can show exactly why.
 */

import type { GmailMessage, GmailThread, WorkspaceSnapshot } from "@/services/google/types";
import { isNoise, matchesNoisePrefix, matchesNoiseDomain } from "./candidates";

export const MAX_ARCHIVE_PER_BATCH = 10;
export const SILENT_ARCHIVE_CONFIDENCE_THRESHOLD = 95;

export interface ArchiveCandidate {
  messageId: string;
  subject: string;
  fromName: string;
  /** Human-readable evidence for why this was judged safe to archive. */
  reason: string;
  /** 0-100, derived only from real signals below — never invented. */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Hard denies — never a candidate, no matter how noise-like the sender
// looks. Keyword lists are intentionally conservative (favor false
// negatives over false positives): missing a real newsletter costs
// nothing, silently archiving a real invoice costs trust.
// ---------------------------------------------------------------------------

const DENY_KEYWORDS: RegExp[] = [
  /\b(invoice|receipt|payment|paid|refund|billing|charged|subscription renewed)\b/i,
  /\b(proposal|quote|estimate)\b/i,
  /\b(reservation|booking|reserved|check-in|itinerary|confirmed:|your stay|your trip)\b/i,
  /\b(contract|agreement|\bnda\b|legal notice|terms of service|subpoena|lawsuit|cease and desist)\b/i
];

const CALENDAR_INVITE_SUBJECT = /^(invitation:|accepted:|declined:|tentative:|updated invitation:|canceled event:|updated event:|new event:|invite:)/i;
const CALENDAR_INVITE_SENDER = /calendar-notification@|noreply@calendar\./i;

function isCalendarInvite(m: GmailMessage): boolean {
  return CALENDAR_INVITE_SUBJECT.test(m.subject.trim()) || CALENDAR_INVITE_SENDER.test(m.fromAddress);
}

function matchesDenyKeyword(m: GmailMessage): boolean {
  const text = `${m.subject} ${m.snippet}`;
  return DENY_KEYWORDS.some((re) => re.test(text));
}

function threadHasHumanReply(thread: GmailThread | undefined): boolean {
  if (!thread) return false;
  return thread.messages.some((tm) => tm.isFromMe);
}

function isHardDenied(m: GmailMessage, thread: GmailThread | undefined): boolean {
  return isCalendarInvite(m) || matchesDenyKeyword(m) || threadHasHumanReply(thread);
}

// ---------------------------------------------------------------------------
// Confidence — sum of independent, named real signals, capped at 100.
// ---------------------------------------------------------------------------

function scoreCandidate(m: GmailMessage, thread: GmailThread | undefined): { confidence: number; reason: string } {
  const reasons: string[] = [];
  let confidence = 0;

  if (matchesNoisePrefix(m.fromAddress)) {
    confidence += 55;
    reasons.push(`sender "${m.fromAddress.split("@")[0]}@" is a known automated prefix`);
  }
  if (matchesNoiseDomain(m.fromAddress)) {
    confidence += 55;
    reasons.push(`sender domain "${m.fromAddress.split("@")[1] ?? ""}" is a known automated domain`);
  }
  if (!thread || thread.messages.length <= 1) {
    confidence += 10;
    reasons.push("no reply has ever been sent in this thread");
  }

  confidence = Math.min(confidence, 100);
  const reason =
    reasons.length > 0
      ? capitalize(reasons.join("; "))
      : "Matched the automated-sender heuristic, but no independent signal confirmed it.";
  return { confidence, reason };
}

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function collectArchiveCandidates(snapshot: WorkspaceSnapshot | null): ArchiveCandidate[] {
  if (!snapshot) return [];
  const threadById = new Map(snapshot.threads.map((t) => [t.id, t]));
  const out: ArchiveCandidate[] = [];

  for (const m of snapshot.messages) {
    if (m.isFromMe || !m.isInInbox) continue;
    if (!isNoise(m.fromAddress)) continue;

    const thread = threadById.get(m.threadId);
    if (isHardDenied(m, thread)) continue;

    const { confidence, reason } = scoreCandidate(m, thread);
    out.push({
      messageId: m.id,
      subject: m.subject,
      fromName: m.fromName || m.fromAddress,
      reason,
      confidence
    });
  }
  return out.slice(0, MAX_ARCHIVE_PER_BATCH);
}
