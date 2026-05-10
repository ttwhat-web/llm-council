/**
 * Auto-trigger dispatcher. Wires `shouldAlertHuman` + `formatAlertMessage`
 * + `sendTelegramAlert` together so the route handlers can fire alerts
 * with one call.
 *
 * The dispatch is non-blocking — promises returned from `dispatchAlert`
 * are deliberately not awaited by callers. The route handler's response
 * goes out first; the alert flies in the background.
 *
 * Server-only. No client imports.
 */

import {
  consumeAlertBudget,
  formatAlertMessage,
  shouldAlertHuman,
  type AlertContext
} from "./mission-alerts";
import { isTelegramConfigured, sendTelegramAlert } from "./telegram";

const ALERTS_ENABLED =
  (process.env.NEXT_PUBLIC_MISSION_ALERTS_ENABLED || "").toLowerCase() === "true";

export interface DispatchInput extends AlertContext {
  /** Stable rate-limit key — usually the client IP. */
  clientKey: string;
  /** Human-readable surface label e.g. "fix · dev" or "architect". */
  surface: string;
  /** Optional user identifier surfaced in the message body. */
  user?: string;
  /** Truncated mission text (raw user input). */
  mission: string;
}

export interface DispatchResult {
  triggered: boolean;
  sent?: boolean;
  reason?: string;
}

/**
 * Decide → format → send. Always resolves; never throws. Intended use:
 *
 *   void dispatchAlert({ clientKey, surface, mission, fix, ... });
 *
 * The route handler returns its response without awaiting the promise.
 */
export async function dispatchAlert(input: DispatchInput): Promise<DispatchResult> {
  if (!ALERTS_ENABLED) return { triggered: false, reason: "feature_disabled" };
  if (!isTelegramConfigured()) {
    return { triggered: false, reason: "telegram_not_configured" };
  }

  const decision = shouldAlertHuman(input);
  if (!decision) return { triggered: false };

  // Bucket per client so we don't spam the admin chat with a stuck retry loop.
  const key = `alert:${input.clientKey}:${decision.type}`;
  if (!consumeAlertBudget(key)) {
    return { triggered: true, sent: false, reason: "rate_limited" };
  }

  const message = formatAlertMessage({
    type: decision.type,
    severity: decision.severity,
    mission: input.mission,
    summary: decision.reason,
    surface: input.surface,
    user: input.user
  });

  const send = await sendTelegramAlert(message, { parseMode: "HTML" });
  return { triggered: true, sent: send.ok, reason: send.reason };
}

/**
 * Fire-and-forget wrapper. Use this from route handlers when you do NOT
 * want to await the network round-trip before returning the response.
 *
 *   fireAndForgetAlert({ ... });   // no await
 */
export function fireAndForgetAlert(input: DispatchInput): void {
  // Note: in Next.js Node runtime the event loop continues after the
  // response is sent, so this resolves cleanly. On Edge runtime use
  // `waitUntil(...)` instead.
  void dispatchAlert(input).catch((err) => {
    // dispatchAlert is already try/catch-safe internally; this catch is
    // a belt-and-braces guard for unexpected programmer errors.
    console.warn("[alert-dispatcher] unexpected:", (err as Error)?.message);
  });
}
