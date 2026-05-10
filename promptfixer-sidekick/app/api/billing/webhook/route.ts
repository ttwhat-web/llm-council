/**
 * POST /api/billing/webhook
 *
 * Phase 6: real Stripe wiring when STRIPE_SECRET_KEY +
 * STRIPE_WEBHOOK_SECRET are set. Otherwise falls back to the Phase-4
 * generic HMAC verifier so local replay harnesses still work.
 *
 * Stripe events handled:
 *   - checkout.session.completed       → upsert customer + subscription
 *                                        (covers founder-lifetime payment mode)
 *   - customer.subscription.created    → upsert subscription
 *   - customer.subscription.updated    → upsert subscription
 *   - customer.subscription.deleted    → delete subscription
 *   - invoice.payment_failed           → audit only (grace handled later)
 *
 * Idempotency: keyed off Stripe `event.id` via the BillingStore's
 * audit log. Duplicate events return a 200 no-op.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { billingErrorResponse, requestExceedsSize } from "@/lib/billing/server";
import {
  getBillingStore,
  newCustomerId,
  newSubscriptionId,
  type BillingStore,
  type Subscription
} from "@/lib/billing/store";
import {
  getStripe,
  planFromStripeKey,
  planKeyFromPriceId,
  webhookSecret
} from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB — Stripe events fit easily

export async function POST(req: NextRequest) {
  if (requestExceedsSize(req, MAX_BODY_BYTES)) {
    return billingErrorResponse("payload_too_large", "Webhook body too large.", 413);
  }

  const raw = await req.text();
  const stripe = getStripe();
  const stripeSecret = webhookSecret();

  // ---------- Real Stripe path ----------
  if (stripe && stripeSecret) {
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return billingErrorResponse("missing_signature", "Missing stripe-signature.", 401);
    }
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, stripeSecret);
    } catch (err) {
      return billingErrorResponse(
        "invalid_signature",
        `Stripe signature verification failed: ${(err as Error).message?.slice(0, 200)}`,
        401
      );
    }
    const store = await getBillingStore();

    // Idempotency: bail if we've already processed this event.
    const seen = await store.getAuditEvents(undefined, 200);
    if (seen.some((e) => e.meta?.stripeEventId === event.id)) {
      return NextResponse.json(
        { ok: true, received: true, idempotent: true, type: event.type },
        { status: 200 }
      );
    }

    try {
      await handleStripeEvent(store, event);
      void store.appendAuditEvent({
        kind: "subscription-upserted",
        detail: `${event.type}`,
        meta: { stripeEventId: event.id, type: event.type }
      });
    } catch (err) {
      // Always 200 so Stripe doesn't hammer retries on a bad mapping;
      // log for inspection via the audit feed.
      void store.appendAuditEvent({
        kind: "subscription-upserted",
        detail: `error processing ${event.type}: ${(err as Error).message?.slice(0, 200)}`,
        meta: { stripeEventId: event.id, type: event.type, errored: true }
      });
    }

    return NextResponse.json({ ok: true, received: true, type: event.type });
  }

  // ---------- Generic HMAC fallback (stub mode) ----------
  const fallbackSecret = process.env.BILLING_WEBHOOK_SECRET || "";
  if (!fallbackSecret) {
    return NextResponse.json(
      {
        ok: true,
        received: true,
        mode: "stub",
        message:
          "Webhook stub — no Stripe configuration. Set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET to verify."
      },
      { status: 200 }
    );
  }

  const sigHeader =
    req.headers.get("x-pf-signature") ||
    req.headers.get("stripe-signature") ||
    req.headers.get("paddle-signature");
  if (!sigHeader) {
    return billingErrorResponse("missing_signature", "Signature header required.", 401);
  }
  if (!verifyHmac(raw, sigHeader, fallbackSecret)) {
    return billingErrorResponse(
      "invalid_signature",
      "Webhook signature verification failed.",
      401
    );
  }
  return NextResponse.json(
    { ok: true, received: true, mode: "generic-hmac", processed: false },
    { status: 200 }
  );
}

// ============================================================================
// Stripe event handlers
// ============================================================================

async function handleStripeEvent(store: BillingStore, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await onCheckoutCompleted(store, session);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await onSubscriptionUpsert(store, sub);
      return;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customer = await findCustomerByStripeId(store, stringifyCustomer(sub.customer));
      if (customer) await store.deleteSubscription(customer.id);
      return;
    }
    case "invoice.payment_failed": {
      // Phase-7 work — fire mission alert + grace window. For now,
      // append a marker to the audit feed.
      const invoice = event.data.object as Stripe.Invoice;
      void store.appendAuditEvent({
        kind: "subscription-upserted",
        detail: `invoice.payment_failed for stripe customer ${stringifyCustomer(invoice.customer)}`,
        meta: { stripeEventId: event.id }
      });
      return;
    }
    default:
      // Unhandled event types are not an error — Stripe sends many.
      return;
  }
}

async function onCheckoutCompleted(
  store: BillingStore,
  session: Stripe.Checkout.Session
): Promise<void> {
  const identityKey =
    session.client_reference_id ||
    (typeof session.metadata?.identityKey === "string"
      ? session.metadata.identityKey
      : undefined);
  if (!identityKey) return;

  const stripeCustomerId = stringifyCustomer(session.customer);
  if (!stripeCustomerId) return;

  const email =
    session.customer_details?.email ||
    session.customer_email ||
    undefined;

  const customer = await upsertCustomerFor(store, identityKey, stripeCustomerId, email);

  // For one-time payments (founder lifetime), Stripe doesn't emit a
  // subscription event — record the entitlement here.
  if (session.mode === "payment") {
    const planKey = (session.metadata?.priceKey as string | undefined) ?? "founder_lifetime";
    const sub: Subscription = {
      id: newSubscriptionId(),
      customerId: customer.id,
      plan: planFromStripeKey(planKey as Parameters<typeof planFromStripeKey>[0]),
      status: "active",
      source: "stripe",
      externalId: session.id,
      // Lifetime: no period end. We treat absence as "never expires".
      currentPeriodEnd: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await store.upsertSubscription(sub);
  }
  // For subscription mode, Stripe will fire customer.subscription.created
  // separately — that handler upserts the durable subscription record.
}

async function onSubscriptionUpsert(
  store: BillingStore,
  sub: Stripe.Subscription
): Promise<void> {
  const stripeCustomerId = stringifyCustomer(sub.customer);
  if (!stripeCustomerId) return;

  const customer = await findCustomerByStripeId(store, stripeCustomerId);
  if (!customer) {
    // We received a subscription event before our customer record
    // existed. Backfill from `metadata.identityKey` if present.
    const fallbackIdentity = sub.metadata?.identityKey;
    if (!fallbackIdentity) return;
    await upsertCustomerFor(store, fallbackIdentity, stripeCustomerId, undefined);
  }

  const linked = customer ?? (await findCustomerByStripeId(store, stripeCustomerId));
  if (!linked) return;

  const item = sub.items.data[0];
  const priceId = item?.price?.id;
  const planKey = priceId ? planKeyFromPriceId(priceId) : null;
  const plan = planKey ? planFromStripeKey(planKey) : "pro";

  const status = mapStripeStatus(sub.status);
  if (status === null) {
    // Inactive / incomplete-expired — treat as no subscription.
    await store.deleteSubscription(linked.id);
    return;
  }

  const record: Subscription = {
    id: newSubscriptionId(),
    customerId: linked.id,
    plan,
    status,
    source: "stripe",
    externalId: sub.id,
    currentPeriodEnd: typeof sub.current_period_end === "number"
      ? sub.current_period_end * 1000
      : undefined,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await store.upsertSubscription(record);
}

// ---------- helpers --------------------------------------------------------

async function upsertCustomerFor(
  store: BillingStore,
  identityKey: string,
  stripeCustomerId: string,
  email: string | undefined
) {
  const existing = await store.getCustomerByIdentity(identityKey);
  if (existing) {
    return store.upsertCustomer({
      ...existing,
      externalId: stripeCustomerId,
      email: email ?? existing.email,
      updatedAt: Date.now()
    });
  }
  return store.upsertCustomer({
    id: newCustomerId(),
    identityKey,
    email,
    externalId: stripeCustomerId,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

async function findCustomerByStripeId(store: BillingStore, stripeCustomerId: string) {
  const list = (await store.listCustomers?.()) ?? [];
  return list.find((c) => c.externalId === stripeCustomerId) ?? null;
}

function stringifyCustomer(c: Stripe.Subscription["customer"] | Stripe.Invoice["customer"]): string {
  if (!c) return "";
  if (typeof c === "string") return c;
  return c.id;
}

function mapStripeStatus(s: Stripe.Subscription.Status): Subscription["status"] | null {
  switch (s) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "incomplete":
      return "incomplete";
    case "canceled":
      return "canceled";
    case "incomplete_expired":
    case "unpaid":
    case "paused":
    default:
      return null;
  }
}

function verifyHmac(body: string, header: string, secret: string): boolean {
  if (!secret) return false;
  const mac = parseSignatureHeader(header);
  if (!mac) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  let provided: Buffer;
  try {
    provided =
      mac.encoding === "hex"
        ? Buffer.from(mac.value, "hex")
        : Buffer.from(mac.value, "base64");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

function parseSignatureHeader(
  header: string
): { encoding: "hex" | "base64"; value: string } | null {
  const v1 = /(?:^|,)\s*v1=([a-f0-9]+)/i.exec(header);
  if (v1?.[1]) return { encoding: "hex", value: v1[1] };
  if (/^[a-f0-9]+$/i.test(header.trim())) return { encoding: "hex", value: header.trim() };
  if (/^[A-Za-z0-9+/=]+$/.test(header.trim())) {
    return { encoding: "base64", value: header.trim() };
  }
  return null;
}
