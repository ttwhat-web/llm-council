/**
 * Auto-trigger dispatcher. Wires `shouldAlertHuman` + `formatAlertMessage`
 * + `sendTelegramAlert` + `createAlertRecord` (the in-app inbox) together
 * so route handlers fire alerts with one call.
 *
 * The dispatch is non-blocking — promises returned from `dispatchAlert`
 * are deliberately not awaited by callers. The route handler's response
 * goes out first; the alert and the inbox write fly in the background.
 *
 * Server-only. No client imports.
 */

import { createAlertRecord, type AlertSentTo } from "./alert-inbox";
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
  /** Optional user identifier surfaced in the message body + inbox attribution. */
  user?: string;
  /** Truncated mission text (raw user input). */
  mission: string;
}

export interface DispatchResult {
  triggered: boolean;
  sent?: boolean;
  reason?: string;
  /** id of the inbox record when one was written. */
  inboxId?: string;
}

/**
 * Decide → record (inbox) → send (Telegram). Always resolves; never throws.
 *
 *   - When the master feature flag is off, nothing happens.
 *   - When `shouldAlertHuman` returns null, nothing happens.
 *   - Otherwise:
 *       * Inbox: a record is written iff `input.user` is present.
 *         The record's `sentTo` reflects what actually happened with
 *         Telegram (user / admin / none).
 *       * Telegram: tries the user-linked chat first, falls back to
 *         TELEGRAM_ADMIN_CHAT_ID, skips silently when neither is set
 *         or when no bot token is configured.
 *
 * Inbox write failures are logged + swallowed and do not affect the
 * Telegram send (or vice versa).
 */
export async function dispatchAlert(input: DispatchInput): Promise<DispatchResult> {
  if (!ALERTS_ENABLED) return { triggered: false, reason: "feature_disabled" };

  const decision = shouldAlertHuman(input);
  if (!decision) return { triggered: false };

  // Resolve destination chat:
  //   1. user-linked chat (if input.user provided AND linked)
  //   2. admin fallback (TELEGRAM_ADMIN_CHAT_ID)
  //   3. neither → no Telegram send (sentTo "none"), inbox still records.
  const tokenOk = hasTelegramToken();
  const userChatId = tokenOk
    ? await getTelegramChatIdForUser(input.user).catch(() => null)
    : null;
  const adminChatId = tokenOk ? getAdminTelegramChatId() : "";
  const chatId = userChatId || adminChatId || "";

  // Per-(client, alertType, chat) rate bucket so a noisy mission doesn't
  // double-spam the same chat. Inbox writes are NOT rate-limited — they
  // are private to the user.
  let rateLimited = false;
  if (chatId) {
    const key = `alert:${input.clientKey}:${decision.type}:${chatId}`;
    if (!consumeAlertBudget(key)) rateLimited = true;
  }

  let telegramSent = false;
  let sentTo: AlertSentTo = "none";
  let sendReason: string | undefined;

  if (chatId && !rateLimited) {
    const message = formatAlertMessage({
      type: decision.type,
      severity: decision.severity,
      mission: input.mission,
      summary: decision.reason,
      surface: input.surface,
      user: input.user
    });
    const send = await sendTelegramAlert(message, { chatId, parseMode: "HTML" });
    telegramSent = send.ok;
    sendReason = send.reason;
    if (send.ok) sentTo = userChatId ? "user" : "admin";
  } else if (rateLimited) {
    sendReason = "rate_limited";
  } else if (!tokenOk) {
    sendReason = "no_token";
  } else {
    sendReason = "no_chat";
  }

  // Inbox: write a record when we have a user identity. Anonymous alerts
  // (admin-only, no user supplied) are not recorded — there is no inbox
  // to read them from anyway.
  let inboxId: string | undefined;
  if (input.user) {
    try {
      const record = await createAlertRecord({
        userEmail: input.user,
        type: decision.type,
        severity: decision.severity,
        mission: input.mission,
        summary: decision.reason,
        reason: sendReason && !telegramSent ? sendReason : undefined,
        sentTo,
        telegramSent
      });
      if (record) inboxId = record.id;
    } catch (err) {
      console.warn("[alert-dispatcher] inbox write failed:", (err as Error)?.message);
    }
  }

  return {
    triggered: true,
    sent: telegramSent,
    reason: telegramSent ? `sent_${sentTo}` : sendReason,
    inboxId
  };
}

/**
 * Fire-and-forget wrapper. Use from route handlers when the response
 * should not wait for Telegram + inbox. On Next.js Node runtime the event
 * loop continues after the response is sent, so the promise resolves
 * cleanly. On Edge runtime use `waitUntil(...)` instead.
 */
export function fireAndForgetAlert(input: DispatchInput): void {
  void dispatchAlert(input).catch((err) => {
    console.warn("[alert-dispatcher] unexpected:", (err as Error)?.message);
  });
}
