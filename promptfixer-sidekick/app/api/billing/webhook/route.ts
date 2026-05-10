/**
 * POST /api/billing/webhook
 *
 * Documented stub. When real billing lands this is the entry point
 * Stripe / Paddle hits to deliver subscription lifecycle events.
 *
 * Today the route:
 *   - rejects requests when `BILLING_WEBHOOK_SECRET` is required but
 *     the signature header is missing or fails verification;
 *   - acknowledges the event when the secret isn't configured (stub
 *     mode), so local replay harnesses still work;
 *   - never mutates state.
 *
 * Production checklist (when this stub is swapped):
 *   1. Verify the provider's signature header (Stripe: `Stripe-Signature`
 *      via `stripe.webhooks.constructEvent`; Paddle: HMAC over the body
 *      with `paddle-signature`).
 *   2. On `customer.subscription.created` / `.updated` / `.deleted`:
 *        - resolve the customer's identity (email / customer_id)
 *        - upsert `{ identityId, plan, source: "auth", expiresAt }`
 *          into the durable store (KV / DB) `lib/billing/server.ts`
 *          consults from `resolvePlan`.
 *   3. On `invoice.payment_failed`: downgrade to free after the grace
 *      window, fire a Mission Alert.
 *   4. Idempotency: dedupe by `event.id` (Stripe) / `notification_id`
 *      (Paddle). The provider WILL retry.
 *   5. Return 200 even on no-op events; non-2xx triggers retries.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { billingErrorResponse, requestExceedsSize } from "@/lib/billing/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;
const WEBHOOK_SECRET = process.env.BILLING_WEBHOOK_SECRET || "";
const PROVIDER = (process.env.BILLING_PROVIDER || "stub").toLowerCase();

export async function POST(req: NextRequest) {
  if (requestExceedsSize(req, MAX_BODY_BYTES)) {
    return billingErrorResponse("payload_too_large", "Webhook body too large.", 413);
  }

  const raw = await req.text();

  // Stub mode (default): no secret, no payment integration. Acknowledge
  // without parsing — but log a one-line trace so misconfigured callers
  // are visible.
  if (PROVIDER === "stub" && !WEBHOOK_SECRET) {
    return NextResponse.json(
      {
        ok: true,
        received: true,
        mode: "stub",
        message:
          "Webhook stub — no payment integration configured. " +
          "Set BILLING_PROVIDER and BILLING_WEBHOOK_SECRET to enable verification."
      },
      { status: 200 }
    );
  }

  // When a secret is configured we verify it regardless of provider.
  // Real Stripe / Paddle will replace this with their SDK's verifier;
  // the shape (`<sig>`-style HMAC over the body) is intentionally kept
  // generic so the local stub can drive integration tests.
  const sigHeader =
    req.headers.get("x-pf-signature") ||
    req.headers.get("stripe-signature") ||
    req.headers.get("paddle-signature");
  if (!sigHeader) {
    return billingErrorResponse(
      "missing_signature",
      "Signature header is required.",
      401
    );
  }

  if (!verifyHmac(raw, sigHeader, WEBHOOK_SECRET)) {
    return billingErrorResponse(
      "invalid_signature",
      "Webhook signature verification failed.",
      401
    );
  }

  // TODO(billing-real): parse the event and upsert subscription state
  // into durable storage. For now we accept and no-op.
  return NextResponse.json(
    { ok: true, received: true, mode: PROVIDER, processed: false },
    { status: 200 }
  );
}

function verifyHmac(body: string, header: string, secret: string): boolean {
  if (!secret) return false;
  // Accept a bare hex/base64 mac OR a Stripe-style "t=...,v1=..." string.
  const mac = parseSignatureHeader(header);
  if (!mac) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  let provided: Buffer;
  try {
    provided = mac.encoding === "hex" ? Buffer.from(mac.value, "hex") : Buffer.from(mac.value, "base64");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

function parseSignatureHeader(header: string): { encoding: "hex" | "base64"; value: string } | null {
  // Stripe pattern: "t=1700000000,v1=<hex>"
  const v1 = /(?:^|,)\s*v1=([a-f0-9]+)/i.exec(header);
  if (v1?.[1]) return { encoding: "hex", value: v1[1] };
  // Bare hex
  if (/^[a-f0-9]+$/i.test(header.trim())) return { encoding: "hex", value: header.trim() };
  // Bare base64
  if (/^[A-Za-z0-9+/=]+$/.test(header.trim())) {
    return { encoding: "base64", value: header.trim() };
  }
  return null;
}
