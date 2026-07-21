/**
 * Customer candidates · which stale/unanswered threads are worth a
 * drafted reply. Pure, deterministic — same heuristic the customers
 * panel already uses. Shared by DraftReplies.tsx (render) and the
 * Morning Run orchestrator (pipeline), so both agree on the exact same
 * set without duplicating the logic.
 */

import type { GmailMessage, WorkspaceSnapshot } from "@/services/google/types";

export const MAX_DRAFTS_PER_BATCH = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface CustomerCandidate {
  customerName: string;
  customerEmail: string;
  threadMessages: GmailMessage[];
  daysSinceLastInbound: number;
  subject: string;
}

const NOISE_PREFIXES = ["noreply", "no-reply", "donotreply", "do-not-reply", "notifications"];
const NOISE_DOMAINS = new Set([
  "google.com",
  "googlemail.com",
  "youtube.com",
  "linkedin.com",
  "github.com"
]);

/** Sender local-part looks automated (e.g. "noreply@"). Exported
 *  separately from isNoise() so the archive-candidate detector can
 *  reason about which specific signal(s) actually matched — real
 *  evidence for its confidence score, not a single opaque boolean. */
export function matchesNoisePrefix(addr: string): boolean {
  const local = addr.trim().toLowerCase().split("@")[0] ?? "";
  return NOISE_PREFIXES.some((p) => local.startsWith(p));
}

/** Sender domain is a known bulk/automated domain. */
export function matchesNoiseDomain(addr: string): boolean {
  const domain = addr.trim().toLowerCase().split("@")[1] ?? "";
  return NOISE_DOMAINS.has(domain);
}

/** Exported so the archive-candidate detector uses the exact same
 *  definition of "noise" as the reply-drafting candidates do — one
 *  heuristic, not two that could quietly drift apart. */
export function isNoise(addr: string): boolean {
  const a = addr.trim().toLowerCase();
  if (!a) return true;
  return matchesNoisePrefix(a) || matchesNoiseDomain(a);
}

export function collectCandidates(snapshot: WorkspaceSnapshot | null): CustomerCandidate[] {
  if (!snapshot) return [];
  const now = snapshot.syncedAt;
  const out: CustomerCandidate[] = [];
  for (const t of snapshot.threads) {
    const msgs = t.messages;
    if (msgs.length === 0) continue;
    const last = msgs[msgs.length - 1];
    if (last.isFromMe) continue;
    if (isNoise(last.fromAddress)) continue;
    const days = Math.max(0, Math.floor((now - last.date) / DAY_MS));
    if (days < 1) continue;
    out.push({
      customerName: last.fromName || last.fromAddress,
      customerEmail: last.fromAddress,
      threadMessages: msgs,
      daysSinceLastInbound: days,
      subject: t.subject || last.subject
    });
  }
  return out.sort((a, b) => b.daysSinceLastInbound - a.daysSinceLastInbound);
}

/** Legacy localStorage fallback for the founder's first name, used when
 *  FounderMemory.firstName isn't set yet. Shared so the orchestrator
 *  and DraftReplies.tsx sign off drafts identically. */
export function readFounderName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem("operator.user.firstName");
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}
