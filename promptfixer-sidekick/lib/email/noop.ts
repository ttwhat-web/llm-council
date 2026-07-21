/**
 * No-op email provider — default when RESEND_API_KEY isn't configured.
 *
 * Logs a one-line `[email]` trace in development so callers can see
 * messages are being dispatched, but never sends.
 */

import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

export function createNoopEmailProvider(): EmailProvider {
  return {
    id: "noop",
    enabled: false,
    async send(message: EmailMessage): Promise<EmailSendResult> {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.debug(
          `[email] noop → to=${message.to} subject="${message.subject}"`
        );
      }
      return { ok: true, skipped: true };
    }
  };
}
