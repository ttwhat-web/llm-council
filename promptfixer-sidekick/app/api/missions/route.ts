/**
 * /api/missions
 *
 *   POST → save a Mission Receipt for the calling identity. Returns
 *          `{ ok: true, receipt }` (full record) and the share URL.
 *   GET  → recent receipts for the calling identity (defaults to 10,
 *          newest first).
 *
 * The receipt id is generated server-side; the client cannot supply
 * one. Secrets in the input/output are redacted before persist.
 *
 * Anonymous callers get a session-cookie identity (handled by
 * `resolveUserIdentity`) so anonymous trial users can still save +
 * share their work.
 */

import { NextRequest, NextResponse } from "next/server";
import { isMode } from "@/lib/modes";
import { isModelQuality } from "@/lib/quality";
import {
  billingErrorResponse,
  requestExceedsSize,
  resolveUserIdentity
} from "@/lib/billing/server";
import { getMissionStore, newMissionId } from "@/lib/missions/store";
import { buildInputSummary, buildTitle, redactSecrets } from "@/lib/missions/redact";
import type {
  MissionReceipt,
  MissionReceiptDraft,
  MissionSafetyFinding,
  MissionVisibility
} from "@/lib/missions/types";
import type {
  Engine,
  Mode,
  ModelQuality,
  ProviderId,
  ScoreCard
} from "@/lib/types";
import type { StageEvent } from "@/lib/pipeline/types";
import type { ExportFormat } from "@/lib/exports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024; // 256 KB — same envelope as /api/fix
const MAX_OUTPUT_CHARS = 32_000;
const RECENT_DEFAULT = 10;
const RECENT_MAX = 25;

// ============================================================================
// POST — save
// ============================================================================

export async function POST(req: NextRequest) {
  if (requestExceedsSize(req, MAX_BODY_BYTES)) {
    return billingErrorResponse("payload_too_large", "Receipt body too large.", 413);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return billingErrorResponse("invalid_json", "Invalid JSON body.");
  }

  const draft = parseDraft(body);
  if (!draft) {
    return billingErrorResponse("invalid_receipt", "Missing or malformed mission fields.");
  }

  const { identity, attachToResponse } = await resolveUserIdentity(req);
  const store = await getMissionStore();
  const id = newMissionId();
  const now = Date.now();

  const inputSummary = buildInputSummary(draft.input);
  const inputLength = draft.inputLength ?? draft.input.length;
  const title = draft.title?.trim() || buildTitle(draft.input);
  const outputRedacted = redactSecrets(draft.output ?? "").text.slice(0, MAX_OUTPUT_CHARS);

  const receipt: MissionReceipt = {
    id,
    ownerKey: identity.id,
    visibility: draft.visibility ?? "private",
    createdAt: now,
    updatedAt: now,
    title,
    inputSummary,
    inputLength,
    mode: draft.mode,
    modelQuality: draft.modelQuality,
    output: outputRedacted,
    score: draft.score,
    safetyFindings: draft.safetyFindings,
    safetyBlocked: draft.safetyBlocked,
    supervisor: draft.supervisor,
    events: draft.events,
    elapsedMs: draft.elapsedMs,
    exportsAvailable: draft.exportsAvailable
  };

  try {
    await store.put(receipt);
  } catch (err) {
    return attachToResponse(
      billingErrorResponse(
        "store_unavailable",
        `Mission store error: ${(err as Error).message?.slice(0, 200)}`,
        503
      )
    );
  }

  return attachToResponse(
    NextResponse.json({
      ok: true,
      receipt,
      shareUrl: shareUrlFor(req, id)
    })
  );
}

// ============================================================================
// GET — recent (this caller)
// ============================================================================

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawLimit = Number(url.searchParams.get("limit") || RECENT_DEFAULT);
  const limit = Math.min(RECENT_MAX, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : RECENT_DEFAULT));

  const { identity, attachToResponse } = await resolveUserIdentity(req);
  const store = await getMissionStore();
  const list = await store.listRecent(identity.id, limit);

  // Trim per-row to keep the recent rail cheap to render.
  const compact = list.map((r) => ({
    id: r.id,
    title: r.title,
    inputSummary: r.inputSummary,
    mode: r.mode,
    score: r.score,
    visibility: r.visibility,
    createdAt: r.createdAt,
    elapsedMs: r.elapsedMs,
    supervisor: {
      resolved: r.supervisor.resolved,
      model: r.supervisor.model
    }
  }));

  return attachToResponse(
    NextResponse.json({ ok: true, missions: compact })
  );
}

// ============================================================================
// helpers
// ============================================================================

function parseDraft(input: unknown): MissionReceiptDraft | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  if (typeof v.input !== "string" || typeof v.output !== "string") return null;
  if (!isMode(v.mode)) return null;
  if (!isModelQuality(v.modelQuality)) return null;

  const score = parseScore(v.score);
  if (!score) return null;
  const supervisor = parseSupervisor(v.supervisor);
  if (!supervisor) return null;

  const visibility =
    v.visibility === "shared" || v.visibility === "private"
      ? (v.visibility as MissionVisibility)
      : undefined;

  const safetyFindings = Array.isArray(v.safetyFindings)
    ? (v.safetyFindings as unknown[]).flatMap((f) => parseFinding(f))
    : [];
  const safetyBlocked = Boolean(v.safetyBlocked);

  return {
    ownerKey: "",
    title: typeof v.title === "string" ? v.title : undefined,
    input: v.input,
    inputLength:
      typeof v.inputLength === "number" && Number.isFinite(v.inputLength)
        ? v.inputLength
        : v.input.length,
    mode: v.mode as Mode,
    modelQuality: v.modelQuality as ModelQuality,
    output: v.output,
    score,
    safetyFindings,
    safetyBlocked,
    supervisor,
    events: parseEvents(v.events),
    elapsedMs:
      typeof v.elapsedMs === "number" && Number.isFinite(v.elapsedMs) ? v.elapsedMs : 0,
    exportsAvailable: parseExports(v.exportsAvailable),
    visibility
  };
}

function parseScore(raw: unknown): ScoreCard | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const n = (k: string) => (typeof v[k] === "number" ? (v[k] as number) : NaN);
  const out: ScoreCard = {
    clarity: n("clarity"),
    specificity: n("specificity"),
    safety: n("safety"),
    modelFit: n("modelFit")
  };
  if ([out.clarity, out.specificity, out.safety, out.modelFit].some((x) => !Number.isFinite(x))) {
    return null;
  }
  return out;
}

function parseSupervisor(raw: unknown): MissionReceiptDraft["supervisor"] | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const resolved = v.resolved;
  const requestedEngine = v.requestedEngine;
  if (!isProviderId(resolved) || !isEngine(requestedEngine)) return null;
  return {
    used: Boolean(v.used),
    resolved: resolved as ProviderId,
    requestedEngine: requestedEngine as Engine,
    fallbackUsed: Boolean(v.fallbackUsed),
    model: typeof v.model === "string" ? v.model : undefined,
    latencyMs:
      typeof v.latencyMs === "number" && Number.isFinite(v.latencyMs)
        ? v.latencyMs
        : undefined
  };
}

function isProviderId(v: unknown): v is ProviderId {
  return (
    v === "cloud-anthropic" ||
    v === "cloud-openai" ||
    v === "ollama" ||
    v === "deterministic"
  );
}

function isEngine(v: unknown): v is Engine {
  return v === "auto" || v === "cloud" || v === "ollama" || v === "deterministic";
}

function parseFinding(raw: unknown): MissionSafetyFinding[] {
  if (!raw || typeof raw !== "object") return [];
  const v = raw as Record<string, unknown>;
  const sev = v.severity;
  if (
    sev !== "low" &&
    sev !== "medium" &&
    sev !== "high" &&
    sev !== "critical"
  ) {
    return [];
  }
  const reason = typeof v.reason === "string" ? v.reason : "";
  if (!reason) return [];
  return [{ severity: sev, reason }];
}

function parseEvents(raw: unknown): StageEvent[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  // Trust the shape — these come from our own pipeline runner via the
  // FixResponse the client just received. Cap to keep payload bounded.
  return (raw as StageEvent[]).slice(0, 60);
}

function parseExports(raw: unknown): ExportFormat[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set<ExportFormat>([
    "claude-prompt",
    "chatgpt-prompt",
    "gemini-prompt",
    "cursor-task",
    "markdown-spec",
    "prd",
    "technical-plan",
    "terminal-script",
    "terminal-safe-command",
    "jira-ticket",
    "github-issue"
  ]);
  return (raw as unknown[]).filter((x): x is ExportFormat =>
    typeof x === "string" && valid.has(x as ExportFormat)
  );
}

function shareUrlFor(req: NextRequest, id: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3030"}`;
  return `${base.replace(/\/$/, "")}/m/${id}`;
}
