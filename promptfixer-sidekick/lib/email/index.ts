/**
 * Email factory + send helpers.
 *
 *   getEmailProvider()      → current provider (Resend when configured,
 *                             else noop).
 *   sendEmail(message)      → provider.send fire-and-forget wrapper that
 *                             never throws and never blocks the request
 *                             that triggered it.
 *
 * Templates live in `./templates`. Routes call `sendEmail()` with the
 * already-rendered subject + html + text so the email module owns
 * provider plumbing and templates own copy.
 */

import { createNoopEmailProvider } from "./noop";
import { createResendEmailProvider } from "./resend";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

let CACHED: EmailProvider | null = null;

function shouldUseResend(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function getEmailProvider(): EmailProvider {
  if (CACHED) return CACHED;
  CACHED = shouldUseResend() ? createResendEmailProvider() : createNoopEmailProvider();
  return CACHED;
}

export function __resetEmailProviderCache(): void {
  CACHED = null;
}

/**
 * Fire-and-forget send. Returns a Promise the caller can `void` away.
 * Failures are caught and logged (dev only) — routes should never block
 * on email delivery.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  if (!message.to || !/.+@.+\..+/.test(message.to)) {
    return { ok: false, error: "invalid_recipient", skipped: true };
  }
  try {
    const provider = getEmailProvider();
    const result = await provider.send(message);
    if (!result.ok && !result.skipped && process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[email] send failed via ${provider.id}: ${result.error}`);
    }
    return result;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[email] threw: ${(err as Error).message}`);
    }
    return { ok: false, error: "email_send_threw" };
  }
}

/** Diagnostics — used by `/api/health/full`. */
export function emailProviderSnapshot() {
  const provider = getEmailProvider();
  return {
    provider: provider.id,
    enabled: provider.enabled,
    from: process.env.EMAIL_FROM ? "set" : "missing",
    support: process.env.SUPPORT_EMAIL ? "set" : "missing"
  };
}

export type { EmailMessage } from "./types";
