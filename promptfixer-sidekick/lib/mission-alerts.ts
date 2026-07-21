/**
 * Mission Alerts — decide *whether* to alert a human, and format the message
 * once we decide we should. Pure functions; the actual sending lives in
 * lib/telegram.ts and the rate limiter is a tiny in-process Map at the
 * bottom of this file.
 *
 * Two tiers of triggers:
 *
 *   Hard (always fires when configured):
 *     - safety blocked  (critical command detected)
 *     - system_error    (the route handler caught an exception)
 *     - mission_failed  (architect plan returned no usable JSON, etc.)
 *
 *   Soft (only fires when the user has opted in):
 *     - safety needs_review        (high/medium-severity findings)
 *     - low_confidence             (poor model fit / specificity score)
 *     - supervisor returned error  (model unreachable / bad JSON)
 */

import type { ArchitectResponse, FixResponse } from "./types";

// ---------- Public types ---------------------------------------------------

export type AlertType =
  | "mission_failed"
  | "needs_human"
  | "low_confidence"
  | "system_error";

export type AlertSeverity = "low" | "medium" | "high";

export interface AlertDecision {
  type: AlertType;
  severity: AlertSeverity;
  reason: string;
}

export interface AlertContext {
  /** Result from /api/fix when present. */
  fix?: FixResponse;
  /** Result from /api/architect when present. */
  architect?: ArchitectResponse;
  /** Server-caught exception. Forces a system_error alert. */
  systemError?: string;
  /** User's per-mission opt-in for "soft" cases. Default false. */
  notifyOnHumanNeeded?: boolean;
}

// ---------- Decision logic -------------------------------------------------

const LOW_FIT_THRESHOLD = 40;
const LOW_SPEC_THRESHOLD = 30;

export function shouldAlertHuman(ctx: AlertContext): AlertDecision | null {
  // 1. Backend caught an exception — always alert (admin only).
  if (ctx.systemError) {
    return {
      type: "system_error",
      severity: "high",
      reason: ctx.systemError.slice(0, 240)
    };
  }

  // 2. Architect path: deterministic fallback after a non-deterministic
  //    request usually means the cloud / ollama path failed. Alert when the
  //    user opted in.
  if (ctx.architect) {
    const a = ctx.architect;
    if (
      a.isDeterministic &&
      a.notice &&
      a.notice.toLowerCase().includes("unavailable") &&
      ctx.notifyOnHumanNeeded
    ) {
      return {
        type: "mission_failed",
        severity: "medium",
        reason: a.notice
      };
    }
  }

  // 3. Fix path
  if (ctx.fix) {
    const r = ctx.fix;

    // Hard: safety screen blocked the output.
    if (r.safety?.blocked) {
      return {
        type: "mission_failed",
        severity: "high",
        reason: "Safety screen blocked the output (critical command detected)."
      };
    }

    // Soft: safety findings need confirmation.
    if (
      r.safety?.requiresConfirmation &&
      r.safety.findings.length > 0 &&
      ctx.notifyOnHumanNeeded
    ) {
      return {
        type: "needs_human",
        severity: "medium",
        reason: `${r.safety.findings.length} safety finding(s) require confirmation before execution.`
      };
    }

    // Soft: supervisor failed — model unreachable / bad JSON.
    if (r.supervisor?.error && ctx.notifyOnHumanNeeded) {
      return {
        type: "low_confidence",
        severity: "medium",
        reason: `Supervisor: ${r.supervisor.error}`.slice(0, 240)
      };
    }

    // Soft: very low scoring (likely the user needs to refine).
    const fit = r.score?.modelFit ?? 100;
    const spec = r.score?.specificity ?? 100;
    if ((fit < LOW_FIT_THRESHOLD || spec < LOW_SPEC_THRESHOLD) && ctx.notifyOnHumanNeeded) {
      return {
        type: "low_confidence",
        severity: "low",
        reason: `Low score · fit ${fit} · specificity ${spec}.`
      };
    }
  }

  return null;
}

// ---------- Message formatting --------------------------------------------

import { escapeHtml, truncate } from "./telegram";

export interface AlertMessageInput {
  type: AlertType;
  severity: AlertSeverity;
  mission: string;
  summary: string;
  /** Mode label e.g. "fix · dev" or "architect". */
  surface?: string;
  /** Optional user identifier — email, IP, anon. */
  user?: string;
}

const TYPE_LABEL: Record<AlertType, string> = {
  mission_failed: "MISSION_FAILED",
  needs_human: "NEEDS_HUMAN",
  low_confidence: "LOW_CONFIDENCE",
  system_error: "SYSTEM_ERROR"
};

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH"
};

/**
 * Build the HTML-formatted Telegram message. All free-form fields are
 * truncated and escaped — Telegram HTML is strict about unescaped `<` `>`.
 */
export function formatAlertMessage(input: AlertMessageInput): string {
  const mission = escapeHtml(truncate(input.mission, 1000));
  const summary = escapeHtml(truncate(input.summary, 600));
  const surface = input.surface ? escapeHtml(truncate(input.surface, 60)) : "—";
  const user = input.user ? escapeHtml(truncate(input.user, 120)) : "anon";

  return [
    "🚨 <b>PromptFixer Mission Alert</b>",
    "",
    `<b>Type:</b> <code>${TYPE_LABEL[input.type]}</code>`,
    `<b>Severity:</b> <code>${SEVERITY_LABEL[input.severity]}</code>`,
    "",
    `<b>User:</b> ${user}`,
    `<b>Surface:</b> ${surface}`,
    "",
    "<b>Mission:</b>",
    `<blockquote>${mission}</blockquote>`,
    "",
    "<b>Reason:</b>",
    summary,
    "",
    "<b>Action:</b>",
    "Open the dashboard and review the mission."
  ].join("\n");
}

// ---------- Rate limit ----------------------------------------------------

const RATE_PER_MIN = Number(process.env.MISSION_ALERTS_RATE_PER_MIN || 5);
const WINDOW_MS = 60_000;

interface Bucket {
  count: number;
  firstAt: number;
}

const BUCKETS = new Map<string, Bucket>();

/**
 * Best-effort per-key rate limiter. Returns true when the alert is allowed
 * (and consumes one slot), false when the bucket is exhausted for the
 * current minute. Single-process, in-memory — replace with Redis for
 * multi-instance deploys.
 *
 * `key` should be a stable identifier for the source — IP, user id, or
 * `${ip}:${alertType}` if you want per-type buckets.
 */
export function consumeAlertBudget(key: string, now = Date.now()): boolean {
  const entry = BUCKETS.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    BUCKETS.set(key, { count: 1, firstAt: now });
    return true;
  }
  if (entry.count >= RATE_PER_MIN) return false;
  entry.count += 1;
  BUCKETS.set(key, entry);
  return true;
}

/** Light-touch garbage collector — call from any alert path. */
export function gcAlertBuckets(now = Date.now()): void {
  for (const [k, v] of BUCKETS.entries()) {
    if (now - v.firstAt > WINDOW_MS * 2) BUCKETS.delete(k);
  }
}
