/**
 * Email adapter — provider-neutral types.
 *
 * The product sends transactional email on a handful of events:
 *   - crypto payment submitted
 *   - payment verified (subscription activated)
 *   - payment rejected
 *   - founder purchase confirmed
 *   - subscription activated (provider webhook)
 *   - payment failed (provider webhook)
 *
 * Phase 9 ships two backends — noop (default) and resend. New backends
 * (Postmark / SES / SendGrid) drop in as additional `EmailProvider`
 * implementations behind the same factory.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Optional sender name override. */
  fromName?: string;
  /** Reply-To used for support replies. Default: env.SUPPORT_EMAIL. */
  replyTo?: string;
}

export interface EmailSendResult {
  ok: boolean;
  /** Provider message id when available. */
  id?: string;
  /** Short error message — never the underlying response body. */
  error?: string;
  /** Set when the provider deliberately dropped the message (e.g. noop). */
  skipped?: boolean;
}

export interface EmailProvider {
  id: "noop" | "resend";
  enabled: boolean;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
