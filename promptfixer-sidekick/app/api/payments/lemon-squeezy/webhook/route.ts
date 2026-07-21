/**
 * POST /api/payments/lemon-squeezy/webhook
 *
 * Verifies `X-Signature` (HMAC-SHA256 of the raw body with
 * `LEMON_SQUEEZY_WEBHOOK_SECRET`) and processes a normalised subset of
 * Lemon Squeezy events.
 *
 * Events handled:
 *   order_created                  → upsert customer + lifetime sub for
 *                                    founder_lifetime, or one-shot pro
 *   subscription_created           → upsert subscription (active)
 *   subscription_updated           → upsert subscription (any status)
 *   subscription_cancelled         → upsert subscription (canceled)
 *   subscription_expired           → delete subscription
 *   subscription_payment_success   → audit; no state change required
 *   subscription_payment_failed    → audit + payment-failed email
 *
 * Idempotency: deduped by `meta.event_id` against the BillingStore
 * audit feed. Duplicate deliveries respond 200 idempotent. We never
 * echo the raw payload to logs — only the event name + numeric ids.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { billingErrorResponse, requestExceedsSize } from "@/lib/billing/server";
import {
  getBillingStore,
  newCustomerId,
  newSubscriptionId,
  type BillingStore,
  type Subscription
} from "@/lib/billing/store";
import { sendEmail } from "@/lib/email";
import {
  paymentFailedTemplate,
  subscriptionActivatedTemplate
} from "@/lib/email/templates";
import type { PaymentPlanKey } from "@/lib/payments/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024 * 1024;

interface LemonEnvelope {
  meta?: {
    event_name?: string;
    custom_data?: {
      identityKey?: string;
      plan?: string;
      founder?: string;
      reference?: string;
    };
    event_id?: string | number;
    test_mode?: boolean;
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: Record<string, unknown>;
  };
}

export async function POST(req: NextRequest) {
  if (requestExceedsSize(req, MAX_BODY_BYTES)) {
    return billingErrorResponse("payload_too_large", "Webhook body too large.", 413);
  }

  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";
  if (!secret) {
    // No secret → no verification possible. Refuse rather than accept
    // arbitrary payloads in stub mode.
    return billingErrorResponse(
      "webhook_not_configured",
      "LEMON_SQUEEZY_WEBHOOK_SECRET is not set.",
      503
    );
  }

  const raw = await req.text();
  const sig = req.headers.get("x-signature") || "";
  if (!verifyHmac(raw, sig, secret)) {
    return billingErrorResponse("invalid_signature", "Bad webhook signature.", 401);
  }

  let payload: LemonEnvelope;
  try {
    payload = JSON.parse(raw) as LemonEnvelope;
  } catch {
    return billingErrorResponse("invalid_json", "Invalid JSON.", 400);
  }

  const eventName = payload.meta?.event_name;
  const eventId = String(payload.meta?.event_id ?? "");
  if (!eventName) {
    return billingErrorResponse("missing_event", "No event name.", 400);
  }

  const billing = await getBillingStore();

  // Idempotency: bail on duplicate event id.
  if (eventId) {
    const seen = await billing.getAuditEvents(undefined, 250);
    if (seen.some((e) => e.meta?.lemonEventId === eventId)) {
      return NextResponse.json({
        ok: true,
        received: true,
        idempotent: true,
        event: eventName
      });
    }
  }

  try {
    await dispatch(billing, eventName, payload);
    void billing.appendAuditEvent({
      kind: "subscription-upserted",
      detail: `lemon_squeezy: ${eventName}`,
      meta: {
        lemonEventId: eventId,
        event: eventName,
        testMode: payload.meta?.test_mode ?? null
      }
    });
  } catch (err) {
    // Acknowledge with 200 — provider retries on non-2xx, and a parsing
    // bug shouldn't replay forever. Trace via the audit feed.
    void billing.appendAuditEvent({
      kind: "subscription-upserted",
      detail: `lemon_squeezy: ${eventName} error: ${(err as Error).message?.slice(0, 120)}`,
      meta: { lemonEventId: eventId, errored: true }
    });
  }

  return NextResponse.json({ ok: true, received: true, event: eventName });
}

// ============================================================================
// dispatcher
// ============================================================================

async function dispatch(
  store: BillingStore,
  event: string,
  payload: LemonEnvelope
): Promise<void> {
  const attrs = payload.data?.attributes ?? {};
  const custom = payload.meta?.custom_data ?? {};
  const identityKey = (custom.identityKey || "").trim();
  if (!identityKey) return; // can't resolve back without it

  const plan = normalizePlan(custom.plan);
  if (!plan) return;

  const lemonCustomerId = stringField(attrs.customer_id);
  const userEmail = stringField(attrs.user_email);
  const orderId = stringField(payload.data?.id);

  const customer = await upsertCustomer(store, {
    identityKey,
    email: userEmail,
    lemonCustomerId
  });

  switch (event) {
    case "order_created": {
      // Lifetime SKU lands here too (mode=payment). Treat as a
      // non-renewing active subscription with no period end.
      await store.upsertSubscription(
        buildSubscription({
          customerId: customer.id,
          plan,
          status: "active",
          externalId: orderId,
          currentPeriodEnd: undefined
        })
      );
      void sendEmail({
        to: userEmail || "",
        ...subscriptionActivatedTemplate({
          plan,
          externalReference: orderId,
          isFounder: plan === "founder_lifetime" || custom.founder === "true"
        })
      });
      return;
    }
    case "subscription_created":
    case "subscription_updated": {
      const status = mapStatus(stringField(attrs.status)) || "active";
      const periodEnd = parseDate(stringField(attrs.renews_at)) ||
        parseDate(stringField(attrs.ends_at));
      await store.upsertSubscription(
        buildSubscription({
          customerId: customer.id,
          plan,
          status,
          externalId: orderId,
          currentPeriodEnd: periodEnd
        })
      );
      if (event === "subscription_created" && status === "active") {
        void sendEmail({
          to: userEmail || "",
          ...subscriptionActivatedTemplate({
            plan,
            externalReference: orderId
          })
        });
      }
      return;
    }
    case "subscription_cancelled": {
      await store.upsertSubscription(
        buildSubscription({
          customerId: customer.id,
          plan,
          status: "canceled",
          externalId: orderId,
          currentPeriodEnd:
            parseDate(stringField(attrs.ends_at)) ?? undefined
        })
      );
      return;
    }
    case "subscription_expired": {
      await store.deleteSubscription(customer.id);
      return;
    }
    case "subscription_payment_success":
      return;
    case "subscription_payment_failed": {
      void sendEmail({
        to: userEmail || "",
        ...paymentFailedTemplate({
          plan,
          reason: "Card processor declined the charge.",
          externalReference: orderId
        })
      });
      return;
    }
    default:
      return;
  }
}

// ============================================================================
// helpers
// ============================================================================

async function upsertCustomer(
  store: BillingStore,
  args: {
    identityKey: string;
    email: string | undefined;
    lemonCustomerId: string | undefined;
  }
) {
  const existing = await store.getCustomerByIdentity(args.identityKey);
  const now = Date.now();
  return store.upsertCustomer({
    id: existing?.id ?? newCustomerId(),
    identityKey: args.identityKey,
    email: args.email ?? existing?.email,
    externalId: args.lemonCustomerId ?? existing?.externalId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  });
}

interface BuildSubArgs {
  customerId: string;
  plan: PaymentPlanKey;
  status: Subscription["status"];
  externalId?: string;
  currentPeriodEnd?: number;
}

function buildSubscription(args: BuildSubArgs): Subscription {
  const planMapped = args.plan.startsWith("team") ? "team" : "pro";
  const now = Date.now();
  return {
    id: newSubscriptionId(),
    customerId: args.customerId,
    plan: planMapped,
    status: args.status,
    source: "lemon_squeezy",
    externalId: args.externalId,
    currentPeriodEnd: args.currentPeriodEnd,
    createdAt: now,
    updatedAt: now
  };
}

function normalizePlan(value: string | undefined): PaymentPlanKey | null {
  switch (value) {
    case "pro_monthly":
    case "pro_annual":
    case "team_monthly":
    case "team_annual":
    case "founder_lifetime":
      return value;
    default:
      return null;
  }
}

function mapStatus(status: string | undefined): Subscription["status"] | null {
  switch (status) {
    case "on_trial":
    case "trialing":
      return "trialing";
    case "active":
    case "paused":
      return "active";
    case "past_due":
      return "past_due";
    case "unpaid":
    case "cancelled":
      return "canceled";
    case "expired":
      return null;
    default:
      return null;
  }
}

function stringField(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function parseDate(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : undefined;
}

function verifyHmac(body: string, headerHex: string, secret: string): boolean {
  if (!headerHex) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(headerHex, "hex");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
