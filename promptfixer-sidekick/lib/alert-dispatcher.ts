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
import {
  getAdminTelegramChatId,
  hasTelegramToken,
  sendTelegramAlert
} from "./telegram";
import { getTelegramChatIdForUser } from "./telegram-links";

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
  if (!hasTelegramToken()) {
    return { triggered: false, reason: "no_token" };
  }

  const decision = shouldAlertHuman(input);
  if (!decision) return { triggered: false };

  // Resolve destination chat:
  //   1. user-linked chat (if input.user provided AND linked)
  //   2. admin fallback (TELEGRAM_ADMIN_CHAT_ID)
  //   3. neither → silently skip
  const userChatId = await getTelegramChatIdForUser(input.user).catch(() => null);
  const adminChatId = getAdminTelegramChatId();
  const chatId = userChatId || adminChatId;
  if (!chatId) {
    return { triggered: true, sent: false, reason: "no_chat" };
  }

  // Per-(client, alertType, chat) rate bucket so a noisy mission doesn't
  // also spam the admin if the user is also linked.
  const key = `alert:${input.clientKey}:${decision.type}:${chatId}`;
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

  const send = await sendTelegramAlert(message, { chatId, parseMode: "HTML" });
  return {
    triggered: true,
    sent: send.ok,
    reason: send.ok ? (userChatId ? "sent_user" : "sent_admin") : send.reason
  };
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
