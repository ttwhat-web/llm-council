/**
 * Mission Receipt — durable record of a successful mission run.
 *
 * Receipts are the unit of share + audit. Every successful run from the
 * `/api/fix` (and via /api/skills/run for prompt-fixer) gets a receipt
 * if the caller opts in. Receipts are addressable by an unguessable id;
 * `visibility="shared"` makes them publicly viewable at /m/[id].
 *
 * Secrets in input/output are redacted before persist (see redact.ts).
 * The owner is the calling identity (Clerk user → email kind, anon →
 * session kind). Only the owner can mutate visibility.
 */

import type { Engine, Mode, ModelQuality, ProviderId, ScoreCard } from "../types";
import type { StageEvent } from "../pipeline/types";
import type { ExportFormat } from "../exports";

export type MissionVisibility = "private" | "shared";

export interface MissionSafetyFinding {
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
}

export interface MissionSupervisor {
  used: boolean;
  resolved: ProviderId;
  requestedEngine: Engine;
  fallbackUsed: boolean;
  model?: string;
  latencyMs?: number;
}

export interface MissionReceipt {
  /** Unguessable id; format: `m_<48 hex chars>`. */
  id: string;
  /** Identity.id — only the owner can mutate. */
  ownerKey: string;
  visibility: MissionVisibility;
  createdAt: number;
  updatedAt: number;

  // ---- Mission snapshot ----
  /** Redacted, capped, single-line title for lists + share OG. */
  title: string;
  /** Redacted excerpt of the original input — capped to ~240 chars. */
  inputSummary: string;
  /** True input length (pre-redaction) for displaying "12k chars" etc. */
  inputLength: number;
  mode: Mode;
  modelQuality: ModelQuality;
  /** Final rendered prompt — redacted. */
  output: string;
  score: ScoreCard;
  safetyFindings: MissionSafetyFinding[];
  safetyBlocked: boolean;
  supervisor: MissionSupervisor;
  /** Per-stage events from the typed pipeline (when present). */
  events?: StageEvent[];
  elapsedMs: number;
  /** Exports the share page can offer to a logged-out viewer. */
  exportsAvailable: ExportFormat[];
}

/** Public projection — what /m/[id] sends to the browser. */
export interface PublicMissionReceipt {
  id: string;
  visibility: MissionVisibility;
  createdAt: number;
  title: string;
  inputSummary: string;
  inputLength: number;
  mode: Mode;
  output: string;
  score: ScoreCard;
  safetyFindings: MissionSafetyFinding[];
  safetyBlocked: boolean;
  supervisor: Omit<MissionSupervisor, never>;
  events?: StageEvent[];
  elapsedMs: number;
  exportsAvailable: ExportFormat[];
}

export interface MissionReceiptDraft {
  ownerKey: string;
  title?: string;
  input: string;
  inputLength: number;
  mode: Mode;
  modelQuality: ModelQuality;
  output: string;
  score: ScoreCard;
  safetyFindings: MissionSafetyFinding[];
  safetyBlocked: boolean;
  supervisor: MissionSupervisor;
  events?: StageEvent[];
  elapsedMs: number;
  exportsAvailable: ExportFormat[];
  visibility?: MissionVisibility;
}

/**
 * Strip server-only / privacy-sensitive fields before sending a
 * receipt to a public share viewer. Owner-facing fetches use the full
 * record; the share page MUST go through this.
 */
export function toPublicReceipt(receipt: MissionReceipt): PublicMissionReceipt {
  return {
    id: receipt.id,
    visibility: receipt.visibility,
    createdAt: receipt.createdAt,
    title: receipt.title,
    inputSummary: receipt.inputSummary,
    inputLength: receipt.inputLength,
    mode: receipt.mode,
    output: receipt.output,
    score: receipt.score,
    safetyFindings: receipt.safetyFindings,
    safetyBlocked: receipt.safetyBlocked,
    supervisor: receipt.supervisor,
    events: receipt.events,
    elapsedMs: receipt.elapsedMs,
    exportsAvailable: receipt.exportsAvailable
  };
}
