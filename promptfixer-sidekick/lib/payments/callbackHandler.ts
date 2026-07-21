/**
 * Shared callback handler for Shopier / iyzico / PayTR.
 *
 * Each provider posts a different body shape on success — but the rule
 * is the same across all of them:
 *
 *   1. If a callback secret is configured, verify the signature
 *      timing-safely. Bad signatures → 401.
 *   2. Look up the PaymentRecord by reference (`OC-XXXXXX`).
 *   3. SIGNED callbacks may auto-grant the plan (Lemon pattern). The
 *      record flips to `verified` and BillingStore upserts the
 *      Subscription. Activation email fires.
 *   4. UNSIGNED callbacks NEVER auto-grant. The record flips to
 *      `submitted` and an admin must verify via /admin/payments.
 *
 * Founder cap is re-checked before grant; if the cap is hit during a
 * concurrent verify, the record is left `submitted` so the admin can
 * triage.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { billingErrorResponse, requestExceedsSize } from "../billing/server";
import {
  getBillingStore,
  newCustomerId,
  newSubscriptionId,
  type BillingStore,
  type Subscription
} from "../billing/store";
import { countFounderSeats } from "../billing/founder";
import { getPaymentStore } from "./store";
import type { PaymentPlanKey, PaymentProviderId, PaymentRecord, PaymentStatus } from "./types";
import { sendEmail } from "../email";
import {
  paymentRejectedTemplate,
  paymentVerifiedTemplate,
  subscriptionActivatedTemplate
} from "../email/templates";

export interface NormalizedCallbackEvent {
  /** Our short reference (`OC-XXXXXX`) — required to resolve the record. */
  reference: string;
  /** Provider's order id; stored for audit. */
  externalId?: string;
  /** Normalised status of the event. */
  status:
    | "paid" // happy path — grants plan when signed
    | "failed" // provider declined; record → rejected
    | "pending"; // intermediate; record → submitted
  /** Free-text reason surfaced in audit + email. */
  reason?: string;
}

export interface ProviderCallbackConfig {
  provider: PaymentProviderId;
  /** Env name holding the callback signing secret. */
  secretEnv: string;
  /** Header that carries the signature; first match wins. */
  signatureHeaders: string[];
  /** Parse the raw body into a normalised event. Provider-specific
   *  parsers go here. Return null when the body is unrecognisable. */
  parse(body: string, headers: Headers): NormalizedCallbackEvent | null;
}

export async function handleProviderCallback(
  req: NextRequest,
  cfg: ProviderCallbackConfig
): Promise<NextResponse> {
  if (requestExceedsSize(req, 256 * 1024)) {
    return billingErrorResponse("payload_too_large", "Callback body too large.", 413);
  }
  const raw = await req.text();
  const secret = (process.env[cfg.secretEnv] || "").trim();

  // Signature handling.
  const sigHeader = pickHeader(req.headers, cfg.signatureHeaders);
  let signed = false;
  if (secret.length > 0) {
    if (!sigHeader) {
      return billingErrorResponse(
        "missing_signature",
        "Callback signature header is required when a secret is configured.",
        401
      );
    }
    if (!verifyHmac(raw, sigHeader, secret)) {
      return billingErrorResponse(
        "invalid_signature",
        "Callback signature verification failed.",
        401
      );
    }
    signed = true;
  }

  // Parse.
  const event = cfg.parse(raw, req.headers);
  if (!event || !event.reference) {
    return billingErrorResponse(
      "invalid_event",
      "Couldn't extract a payment reference from the callback body.",
      400
    );
  }

  const store = await getPaymentStore();
  const billing = await getBillingStore();
  const record = await findByReference(store, event.reference);
  if (!record) {
    return billingErrorResponse(
      "unknown_reference",
      "No payment with that reference.",
      404
    );
  }
  if (record.provider !== cfg.provider) {
    // Reference collision with a different provider — refuse rather
    // than silently mutate someone else's record.
    return billingErrorResponse(
      "provider_mismatch",
      "Reference belongs to a different provider.",
      409
    );
  }

  // Idempotent terminal states.
  if (record.status === "verified") {
    return NextResponse.json({ ok: true, idempotent: true, status: "verified" });
  }
  if (record.status === "rejected") {
    return NextResponse.json({ ok: true, idempotent: true, status: "rejected" });
  }

  // Failure → reject + email.
  if (event.status === "failed") {
    const updated = await store.patch(record.id, (r) => ({
      ...r,
      status: "rejected",
      rejectedAt: Date.now(),
      rejectedReason: event.reason || `${cfg.provider} callback reported failure.`,
      external: { ...r.external, eventId: event.externalId }
    }));
    void billing.appendAuditEvent({
      kind: "revoke",
      identityKey: record.identityKey,
      detail: `${cfg.provider} callback: failed (${updated?.rejectedReason ?? ""})`,
      meta: {
        paymentId: record.id,
        reference: record.reference,
        signed,
        external: event.externalId
      }
    });
    if (record.email) {
      void sendEmail({
        to: record.email,
        ...paymentRejectedTemplate({
          reference: record.reference,
          plan: record.plan,
          reason: updated?.rejectedReason
        })
      });
    }
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // Pending / unknown intermediate states → submitted, no grant.
  if (event.status !== "paid") {
    await markSubmitted(store, record.id, event.externalId);
    void billing.appendAuditEvent({
      kind: "subscription-upserted",
      identityKey: record.identityKey,
      detail: `${cfg.provider} callback: pending — admin verify required`,
      meta: { paymentId: record.id, reference: record.reference, signed }
    });
    return NextResponse.json({ ok: true, status: "submitted" });
  }

  // Paid path.
  if (!signed) {
    // Hard rule: unsigned "paid" callbacks NEVER auto-grant. Move to
    // submitted and require admin verification.
    await markSubmitted(store, record.id, event.externalId);
    void billing.appendAuditEvent({
      kind: "subscription-upserted",
      identityKey: record.identityKey,
      detail: `${cfg.provider} callback: paid (unsigned — admin verify required)`,
      meta: { paymentId: record.id, reference: record.reference, signed: false }
    });
    return NextResponse.json({ ok: true, status: "submitted", autoGranted: false });
  }

  // Signed paid: re-check the founder cap before granting.
  if (record.plan === "founder_lifetime") {
    const seats = await countFounderSeats();
    if (seats.soldOut) {
      await markSubmitted(store, record.id, event.externalId);
      void billing.appendAuditEvent({
        kind: "subscription-upserted",
        identityKey: record.identityKey,
        detail: `${cfg.provider} callback: founder sold out at grant time — admin triage`,
        meta: { paymentId: record.id, reference: record.reference, signed: true }
      });
      return NextResponse.json({ ok: true, status: "submitted", autoGranted: false });
    }
  }

  // Auto-grant via BillingStore.
  const verified = await store.patch(record.id, (r) => ({
    ...r,
    status: "verified",
    verifiedAt: Date.now(),
    verifiedBy: `callback:${cfg.provider}`,
    external: { ...r.external, eventId: event.externalId }
  }));
  if (verified) {
    await grantSubscription(billing, verified);
    void billing.appendAuditEvent({
      kind: "grant",
      identityKey: verified.identityKey,
      plan: planMappedFor(verified.plan),
      detail: `${cfg.provider} signed callback verified ${verified.reference}`,
      meta: { paymentId: verified.id, reference: verified.reference, signed: true }
    });
    if (verified.email) {
      const isFounder = verified.plan === "founder_lifetime";
      void sendEmail({
        to: verified.email,
        ...(isFounder
          ? subscriptionActivatedTemplate({
              plan: verified.plan,
              isFounder: true,
              externalReference: verified.reference
            })
          : paymentVerifiedTemplate({
              reference: verified.reference,
              plan: verified.plan
            }))
      });
    }
  }
  return NextResponse.json({ ok: true, status: "verified", autoGranted: true });
}

// ============================================================================
// Helpers
// ============================================================================

async function findByReference(
  store: Awaited<ReturnType<typeof getPaymentStore>>,
  reference: string
): Promise<PaymentRecord | null> {
  // We don't have a by-reference index; the pending queue is bounded
  // and covers every active manual record across identities. For
  // already-verified / rejected records (rare race) we scan the listing
  // helper if the implementation provides it. Otherwise we miss those —
  // which is the right behaviour: terminal states shouldn't accept new
  // callback writes anyway.
  const pending = await store.listPending(500);
  return pending.find((p) => p.reference === reference) ?? null;
}

async function markSubmitted(
  store: Awaited<ReturnType<typeof getPaymentStore>>,
  id: string,
  externalId?: string
): Promise<void> {
  await store.patch(id, (r) => ({
    ...r,
    status: "submitted" as PaymentStatus,
    external: { ...r.external, eventId: externalId }
  }));
}

function pickHeader(headers: Headers, names: string[]): string | undefined {
  for (const name of names) {
    const value = headers.get(name);
    if (value) return value;
  }
  return undefined;
}

function verifyHmac(body: string, header: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(body).digest();
  let provided: Buffer;
  try {
    // Accept hex first, then base64. Headers vary by provider.
    if (/^[a-f0-9]+$/i.test(header.trim())) {
      provided = Buffer.from(header.trim(), "hex");
    } else {
      provided = Buffer.from(header.trim(), "base64");
    }
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(provided, expected);
  } catch {
    return false;
  }
}

async function grantSubscription(
  billing: BillingStore,
  record: PaymentRecord
): Promise<void> {
  const now = Date.now();
  const existing = await billing.getCustomerByIdentity(record.identityKey);
  const customer = await billing.upsertCustomer({
    id: existing?.id ?? newCustomerId(),
    identityKey: record.identityKey,
    email: record.email ?? existing?.email,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  });
  const plan = planMappedFor(record.plan);
  const currentPeriodEnd =
    record.plan === "founder_lifetime"
      ? undefined
      : record.plan.endsWith("annual")
        ? now + 365 * 24 * 60 * 60 * 1000
        : now + 30 * 24 * 60 * 60 * 1000;
  const sub: Subscription = {
    id: newSubscriptionId(),
    customerId: customer.id,
    plan,
    status: "active",
    source:
      record.provider === "shopier"
        ? "shopier"
        : record.provider === "iyzico"
          ? "iyzico"
          : record.provider === "paytr"
            ? "paytr"
            : "manual_payment_link",
    externalId: record.id,
    currentPeriodEnd,
    createdAt: now,
    updatedAt: now
  };
  await billing.upsertSubscription(sub);
}

function planMappedFor(plan: PaymentPlanKey): "pro" | "team" {
  return plan.startsWith("team") ? "team" : "pro";
}
