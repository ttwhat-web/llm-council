/**
 * Email templates — copy + light HTML.
 *
 * Every template returns `{ subject, html, text }`. HTML is intentionally
 * minimal inline-styled email; the `text` variant is the source of truth
 * for clients that strip HTML.
 *
 * Vocabulary lock matches the rest of the brand: mission, dispatch,
 * operator, telemetry, audit, receipt. No emoji.
 */

import type { PaymentPlanKey } from "../payments/types";

const SUPPORT = () => process.env.SUPPORT_EMAIL || "hello@operator.center";
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || "https://operator.center";

interface PlanCopy {
  label: string;
  blurb: string;
}

function planCopy(plan: PaymentPlanKey): PlanCopy {
  switch (plan) {
    case "pro_monthly":
      return { label: "Pro · monthly", blurb: "Unlimited missions, saved stacks, recorder, exports." };
    case "pro_annual":
      return { label: "Pro · annual", blurb: "Unlimited Pro for the year — two months free over monthly." };
    case "team_monthly":
      return { label: "Team · monthly", blurb: "Per-seat Team plan with shared workflows + audit." };
    case "team_annual":
      return { label: "Team · annual", blurb: "Per-seat Team plan, annual billing." };
    case "founder_lifetime":
      return { label: "Founder · lifetime", blurb: "Pro for life. Capped at the first 100 operators." };
  }
}

export interface TemplateOutput {
  subject: string;
  html: string;
  text: string;
}

interface Shell {
  title: string;
  preheader: string;
  body: string;
  footerNote?: string;
}

function shell({ title, preheader, body, footerNote }: Shell): string {
  return [
    `<!doctype html>`,
    `<html><head><meta charset="utf-8" />`,
    `<meta name="viewport" content="width=device-width" />`,
    `<title>${escapeHtml(title)}</title>`,
    `</head>`,
    `<body style="margin:0;padding:24px;background:#07080b;color:#e6e8ee;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">`,
    `<span style="display:none;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#0c0f15;border:1px solid rgba(255,255,255,0.06);border-radius:16px;">`,
    `<tr><td style="padding:24px 24px 8px;">`,
    `<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(124,155,255,0.85);">operator.center</div>`,
    `<h1 style="margin:8px 0 0;font-size:20px;line-height:1.25;color:#ffffff;">${escapeHtml(title)}</h1>`,
    `</td></tr>`,
    `<tr><td style="padding:16px 24px 24px;font-size:14px;line-height:1.6;color:rgba(230,232,238,0.85);">${body}</td></tr>`,
    `<tr><td style="padding:0 24px 20px;">`,
    `<a href="${APP_URL()}/app" style="display:inline-block;background:#7c9bff;color:#0a0d12;padding:8px 14px;border-radius:10px;text-decoration:none;font-weight:600;font-size:13px;">Open Mission Control →</a>`,
    `</td></tr>`,
    footerNote
      ? `<tr><td style="padding:0 24px 16px;font-size:11px;color:rgba(230,232,238,0.4);">${footerNote}</td></tr>`
      : "",
    `<tr><td style="padding:14px 24px;border-top:1px solid rgba(255,255,255,0.05);font-size:11px;color:rgba(230,232,238,0.45);">`,
    `Questions? Reply to this email or contact <a href="mailto:${SUPPORT()}" style="color:#7c9bff;">${SUPPORT()}</a>.`,
    `</td></tr>`,
    `</table>`,
    `</body></html>`
  ].join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function kvBlock(rows: Array<[string, string]>): string {
  return [
    `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;font-size:13px;">`,
    ...rows.map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:rgba(230,232,238,0.5);white-space:nowrap;">${escapeHtml(k)}</td>` +
        `<td style="padding:4px 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#ffffff;word-break:break-all;">${escapeHtml(v)}</td></tr>`
    ),
    `</table>`
  ].join("");
}

// ============================================================================
// Templates
// ============================================================================

export interface CryptoSubmittedCtx {
  reference: string;
  plan: PaymentPlanKey;
  networkLabel: string;
  txHash: string;
}

export function cryptoSubmittedTemplate(ctx: CryptoSubmittedCtx): TemplateOutput {
  const plan = planCopy(ctx.plan);
  const subject = `We received your payment submission · ${ctx.reference}`;
  const text = [
    `Hello operator,`,
    ``,
    `We received your ${plan.label} payment submission.`,
    ``,
    `Reference:     ${ctx.reference}`,
    `Network:       ${ctx.networkLabel}`,
    `Transaction:   ${ctx.txHash}`,
    ``,
    `An operator will verify the on-chain transfer and grant your plan.`,
    `You'll receive a confirmation email the moment it's verified.`,
    ``,
    `— operator.center`
  ].join("\n");
  const html = shell({
    title: "Payment submission received",
    preheader: `Reference ${ctx.reference} — manual verification in progress`,
    body:
      `<p>We received your <strong>${escapeHtml(plan.label)}</strong> payment submission.</p>` +
      kvBlock([
        ["Reference", ctx.reference],
        ["Network", ctx.networkLabel],
        ["Transaction", ctx.txHash]
      ]) +
      `<p style="margin-top:16px;">An operator will verify the on-chain transfer and grant your plan. You'll get a confirmation email the moment it's verified.</p>`,
    footerNote:
      "Manual verification required. Access is granted only after on-chain confirmation."
  });
  return { subject, html, text };
}

export interface PaymentVerifiedCtx {
  reference: string;
  plan: PaymentPlanKey;
  isFounder?: boolean;
}

export function paymentVerifiedTemplate(ctx: PaymentVerifiedCtx): TemplateOutput {
  const plan = planCopy(ctx.plan);
  const subject = ctx.isFounder
    ? `You're founder #—. ${plan.label} active.`
    : `${plan.label} is active.`;
  const text = [
    ctx.isFounder ? `Welcome aboard, founder.` : `Welcome aboard, operator.`,
    ``,
    `Your ${plan.label} is now active.`,
    ``,
    `Reference:  ${ctx.reference}`,
    `What you have:  ${plan.blurb}`,
    ``,
    `Open Mission Control:  ${APP_URL()}/app`,
    ``,
    `— operator.center`
  ].join("\n");
  const html = shell({
    title: ctx.isFounder ? "Welcome aboard, founder." : `${plan.label} is active.`,
    preheader: `${plan.label} unlocked · reference ${ctx.reference}`,
    body:
      `<p>Your <strong>${escapeHtml(plan.label)}</strong> is now active.</p>` +
      `<p style="color:rgba(230,232,238,0.7);">${escapeHtml(plan.blurb)}</p>` +
      kvBlock([
        ["Reference", ctx.reference],
        ["Plan", plan.label]
      ])
  });
  return { subject, html, text };
}

export interface PaymentRejectedCtx {
  reference: string;
  plan: PaymentPlanKey;
  reason?: string;
}

export function paymentRejectedTemplate(ctx: PaymentRejectedCtx): TemplateOutput {
  const plan = planCopy(ctx.plan);
  const subject = `Payment ${ctx.reference} couldn't be confirmed`;
  const safeReason = ctx.reason?.slice(0, 240) || "No additional detail recorded.";
  const text = [
    `Hello operator,`,
    ``,
    `We weren't able to confirm your ${plan.label} payment.`,
    ``,
    `Reference:  ${ctx.reference}`,
    `Reason:     ${safeReason}`,
    ``,
    `If you believe this is a mistake, reply to this email with the transaction details and we'll review again.`,
    ``,
    `— operator.center`
  ].join("\n");
  const html = shell({
    title: "We couldn't confirm your payment.",
    preheader: `Reference ${ctx.reference} was not verified`,
    body:
      `<p>We weren't able to confirm your <strong>${escapeHtml(plan.label)}</strong> payment.</p>` +
      kvBlock([
        ["Reference", ctx.reference],
        ["Reason", safeReason]
      ]) +
      `<p style="margin-top:16px;">If you believe this is a mistake, reply to this email with the transaction details and we'll review again.</p>`
  });
  return { subject, html, text };
}

export interface SubscriptionActivatedCtx {
  plan: PaymentPlanKey;
  externalReference?: string;
  isFounder?: boolean;
}

export function subscriptionActivatedTemplate(
  ctx: SubscriptionActivatedCtx
): TemplateOutput {
  const plan = planCopy(ctx.plan);
  const subject = ctx.isFounder
    ? `Founder lifetime unlocked.`
    : `${plan.label} activated.`;
  const text = [
    ctx.isFounder
      ? `Welcome aboard, founder. Your lifetime access is live.`
      : `Your ${plan.label} subscription is active.`,
    ``,
    plan.blurb,
    ``,
    ctx.externalReference ? `Provider reference: ${ctx.externalReference}` : ``,
    ``,
    `Open Mission Control:  ${APP_URL()}/app`,
    ``,
    `— operator.center`
  ]
    .filter(Boolean)
    .join("\n");
  const html = shell({
    title: ctx.isFounder ? "Founder lifetime unlocked." : `${plan.label} activated.`,
    preheader: plan.blurb,
    body:
      `<p>${escapeHtml(plan.blurb)}</p>` +
      (ctx.externalReference
        ? kvBlock([["Provider reference", ctx.externalReference]])
        : "")
  });
  return { subject, html, text };
}

export interface PaymentFailedCtx {
  plan?: PaymentPlanKey;
  reason?: string;
  externalReference?: string;
}

export function paymentFailedTemplate(ctx: PaymentFailedCtx): TemplateOutput {
  const plan = ctx.plan ? planCopy(ctx.plan) : null;
  const subject = `Payment failed on your ${plan?.label ?? "operator.center"} subscription`;
  const reason = ctx.reason?.slice(0, 240) || "Card or provider declined the charge.";
  const text = [
    `Hello operator,`,
    ``,
    `Your ${plan?.label ?? "operator.center"} payment didn't go through.`,
    ``,
    ctx.externalReference ? `Provider reference: ${ctx.externalReference}` : ``,
    `Reason:             ${reason}`,
    ``,
    `Update your payment method via the Customer Portal in Mission Control to keep your plan active.`,
    ``,
    `— operator.center`
  ]
    .filter(Boolean)
    .join("\n");
  const html = shell({
    title: "Payment didn't go through.",
    preheader: reason,
    body:
      `<p>Your <strong>${escapeHtml(plan?.label ?? "operator.center")}</strong> payment didn't go through.</p>` +
      kvBlock(
        [
          ctx.externalReference
            ? (["Provider reference", ctx.externalReference] as [string, string])
            : null,
          ["Reason", reason] as [string, string]
        ].filter(Boolean) as Array<[string, string]>
      ) +
      `<p style="margin-top:16px;">Update your payment method via the Customer Portal in Mission Control to keep your plan active.</p>`
  });
  return { subject, html, text };
}

export interface FounderPurchaseConfirmedCtx {
  reference: string;
}

export function founderPurchaseConfirmedTemplate(
  ctx: FounderPurchaseConfirmedCtx
): TemplateOutput {
  return paymentVerifiedTemplate({
    reference: ctx.reference,
    plan: "founder_lifetime",
    isFounder: true
  });
}
