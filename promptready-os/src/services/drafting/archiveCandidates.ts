/**
 * Archive candidates · which inbox messages are safe for Operator to
 * silently archive. Same noise heuristic as collectCandidates() (one
 * definition, not two) — a message only qualifies when it's inbound,
 * still sitting in the inbox, and from a known automated sender
 * (no-reply prefix or a known automated domain). Never a customer,
 * never a thread with a real reply pending.
 */

import type { WorkspaceSnapshot } from "@/services/google/types";
import { isNoise } from "./candidates";

export const MAX_ARCHIVE_PER_BATCH = 10;

export interface ArchiveCandidate {
  messageId: string;
  subject: string;
  fromName: string;
}

export function collectArchiveCandidates(snapshot: WorkspaceSnapshot | null): ArchiveCandidate[] {
  if (!snapshot) return [];
  const out: ArchiveCandidate[] = [];
  for (const m of snapshot.messages) {
    if (m.isFromMe || !m.isInInbox) continue;
    if (!isNoise(m.fromAddress)) continue;
    out.push({ messageId: m.id, subject: m.subject, fromName: m.fromName || m.fromAddress });
  }
  return out.slice(0, MAX_ARCHIVE_PER_BATCH);
}
