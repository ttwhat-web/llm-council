/**
 * Company Brain · shared types.
 *
 * A retrieval facade, not a new database: every CompanyBrainFact
 * traces back to a real record already owned by another store (a
 * Gmail message, a calendar event, the Action Queue, a saved memory
 * note, a founder feedback event). Company Brain only combines,
 * ranks, and caps what's already there — nothing here is invented,
 * and every fact carries its provenance so a founder could always
 * check where it came from.
 */

import type { WorkspaceSnapshot } from "@/services/google/types";
import type { Action, ActionLogEntry } from "@/services/executors/types";
import type { FounderMemory } from "@/services/operator/memorySeed";
import type { MemoryCandidate } from "@/store/memoryCandidates";
import type { NoteOverride } from "@/store/memoryNotes";
import type { FeedbackEvent } from "@/store/feedback";

export type CompanyBrainSourceKind = "email" | "calendar" | "queue" | "memory" | "feedback";

export interface CompanyBrainFact {
  /** Plain, founder-facing sentence — never a technical label. */
  text: string;
  source: CompanyBrainSourceKind;
  /** Unix ms of the real underlying event, when known — used for
   *  ranking and for "is this still fresh" staleness checks. */
  at?: number;
}

export interface CompanyBrainConflict {
  a: CompanyBrainFact;
  b: CompanyBrainFact;
  /** Plain description of the disagreement — never auto-resolved. */
  note: string;
}

export interface CompanyBrainRecommendation {
  text: string;
  evidence: CompanyBrainFact[];
}

export interface CompanyBrainResult {
  /** Canonical identity — an email address, or `topic:<query>` when
   *  the subject spans more than one person (e.g. a company name). */
  subjectKey: string;
  displayName: string;
  /** One line describing who/what this is, grounded in real evidence. */
  who: string;
  lastContact: CompanyBrainFact | null;
  /** Prepared work still waiting on a founder decision. */
  pending: CompanyBrainFact[];
  /** Active memory notes about this subject. */
  memory: CompanyBrainFact[];
  /** Real completed/resolved actions — what was actually decided. */
  recentDecisions: CompanyBrainFact[];
  /** What's overdue or failed and needs a founder's eyes. */
  attention: CompanyBrainFact[];
  /** Never present unless grounded in at least one real fact. */
  recommendation: CompanyBrainRecommendation | null;
  /** Surfaced plainly, never silently resolved. */
  conflicts: CompanyBrainConflict[];
  /** False when literally nothing real was found for this subject —
   *  the caller should say so plainly rather than render an empty shell. */
  hasEvidence: boolean;
}

export type SubjectResolution =
  | { kind: "resolved"; subjectKey: string; displayName: string }
  | { kind: "ambiguous"; candidates: string[] }
  | { kind: "not-found" };

/** Everything the facade reads from — gathered once by the caller from
 *  the real stores, mirroring how DelegationContext keeps the planner
 *  itself trivially testable without mocking half the app. */
export interface CompanyBrainContext {
  snapshot: WorkspaceSnapshot | null;
  actionItems: Record<string, Action>;
  actionLog: ActionLogEntry[];
  memory: FounderMemory;
  candidates: Record<string, MemoryCandidate>;
  noteOverrides: Record<string, NoteOverride>;
  feedbackEvents: FeedbackEvent[];
  now: number;
}
