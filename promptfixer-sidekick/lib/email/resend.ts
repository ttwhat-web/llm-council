/**
 * Resend email provider — REST client (no SDK dep).
 *
 * Selected when `RESEND_API_KEY` and `EMAIL_FROM` are both set.
 * Failures never throw; the function returns `{ ok: false, error }`
 * with a normalised message so call sites can decide whether to alert.
 */

import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

const RESEND_API = "https://api.resend.com/emails";

function envFrom(): string {
  return (process.env.EMAIL_FROM || "").trim();
}
function envSupport(): string {
  return (process.env.SUPPORT_EMAIL || envFrom()).trim();
}
function envKey(): string {
  return (process.env.RESEND_API_KEY || "").trim();
}

export function createResendEmailProvider(): EmailProvider {
  const enabled = envKey().length > 0 && envFrom().length > 0;
  return {
    id: "resend",
    enabled,
    async send(message: EmailMessage): Promise<EmailSendResult> {
      if (!enabled) {
        return { ok: false, error: "resend_not_configured", skipped: true };
      }
      const fromAddress = envFrom();
      const fromHeader = message.fromName
        ? `${message.fromName} <${fromAddress}>`
        : fromAddress;
      try {
        const res = await fetch(RESEND_API, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${envKey()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: fromHeader,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
            reply_to: message.replyTo || envSupport() || undefined
          })
        });
        if (!res.ok) {
          // Don't propagate the provider body — it can contain hints
          // (e.g. domain not verified) but we only surface the status.
          return { ok: false, error: `resend_http_${res.status}` };
        }
        const data = (await res.json().catch(() => ({}))) as { id?: string };
        return { ok: true, id: data.id };
      } catch (err) {
        return { ok: false, error: (err as Error).name || "resend_failed" };
      }
    }
  };
}
