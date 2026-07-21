/**
 * POST /api/payments/checkout
 *
 * Body: { provider: PaymentProviderId, plan: PaymentPlanKey,
 *         period?: ..., cryptoNetwork? }
 *
 * Unified entry to every payment provider. Dispatches to the registry
 * and returns the provider's `PaymentCheckoutResult` directly.
 *
 *   - Stripe / Paddle / Lemon → { redirectUrl }
 *   - Crypto / local manual   → { paymentId, manualInstructions }
 *   - Stub                    → ask the caller to route to
 *                               /api/billing/checkout (legacy mints
 *                               the dev cookie there)
 *
 * The legacy `/api/billing/checkout` (Stripe-only + stub) keeps working
 * unchanged for backwards compatibility.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  billingErrorResponse,
  requestExceedsSize,
  resolveUserIdentity,
  runBillingGate
} from "@/lib/billing/server";
import { getProvider } from "@/lib/payments/registry";
import { isPaymentPlanKey, isPaymentProviderId } from "@/lib/payments/types";
import { founderLaunchEnabled } from "@/lib/launchMode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2 * 1024;

interface CheckoutBody {
  provider?: unknown;
  plan?: unknown;
  cryptoNetwork?: unknown;
}

export async function POST(req: NextRequest) {
  if (requestExceedsSize(req, MAX_BODY_BYTES)) {
    return billingErrorResponse("payload_too_large", "Request body too large.", 413);
  }

  const gate = await runBillingGate(req, { rateLimit: "billingMutation" });
  if (!gate.ok) return gate.errorResponse!;

  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return gate.attach(billingErrorResponse("invalid_json", "Invalid JSON body."));
  }

  if (!isPaymentProviderId(body.provider)) {
    return gate.attach(
      billingErrorResponse("invalid_provider", "Unknown payment provider.")
    );
  }
  if (!isPaymentPlanKey(body.plan)) {
    return gate.attach(
      billingErrorResponse("invalid_plan", "Unknown plan key for payment.")
    );
  }
  const provider = getProvider(body.provider);
  if (!provider) {
    return gate.attach(
      billingErrorResponse("unknown_provider", "Provider not registered.")
    );
  }

  const info = provider.info();
  if (!info.enabled) {
    return gate.attach(
      billingErrorResponse(
        "provider_disabled",
        info.unavailableReason || `Provider ${body.provider} is not available.`,
        503
      )
    );
  }
  if (body.plan === "founder_lifetime" && !founderLaunchEnabled()) {
    return gate.attach(
      billingErrorResponse(
        "founder_launch_disabled",
        "Founder lifetime is not available right now.",
        410
      )
    );
  }
  if (!info.plans.includes(body.plan)) {
    return gate.attach(
      billingErrorResponse(
        "plan_unsupported",
        `Provider ${body.provider} does not currently accept ${body.plan}.`
      )
    );
  }

  const { identity, attachToResponse } = await resolveUserIdentity(req);

  const result = await provider.createCheckout({
    plan: body.plan,
    identityKey: identity.id,
    email: identity.email,
    cryptoNetwork:
      typeof body.cryptoNetwork === "string" ? body.cryptoNetwork : undefined
  });

  if (!result.ok) {
    return attachToResponse(
      billingErrorResponse(
        result.code || "checkout_failed",
        result.message || "Checkout failed.",
        result.code === "founder_sold_out" ? 410 : 400
      )
    );
  }

  return attachToResponse(NextResponse.json({ ...result, ok: true }));
}
