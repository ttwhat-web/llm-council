/**
 * POST /api/billing/checkout
 *
 * Body: { plan: "free" | "pro" | "team" | "enterprise",
 *         period?: "monthly" | "annual",
 *         founder?: boolean }
 *
 * Behaviour matrix:
 *
 *   STRIPE_SECRET_KEY set + matching price id:
 *     → real `stripe.checkout.sessions.create`. Returns
 *       `{ ok: true, mode: "stripe", url }`. The client redirects.
 *
 *   STRIPE_SECRET_KEY missing AND BILLING_DEV_OVERRIDE_SECRET set:
 *     → stub: signs the dev-override cookie. Returns
 *       `{ ok: true, mode: "stub", plan, ... }`.
 *
 *   Neither configured:
 *     → 503 `checkout_unavailable` with a clear message.
 *
 * Free plan is always honoured: clears any active dev cookie + audit
 * event. (Stripe never sells a free plan.)
 */

import { NextRequest, NextResponse } from "next/server";
import { isPlan } from "@/lib/billing/plans";
import {
  billingErrorResponse,
  devOverrideEnabled,
  devOverrideMutationFor,
  requestExceedsSize,
  resolveUserIdentity,
  runBillingGate
} from "@/lib/billing/server";
import { getBillingStore, newCustomerId } from "@/lib/billing/store";
import {
  STRIPE_PRICE_IDS,
  appUrl,
  checkoutModeFor,
  getStripe,
  type StripePlanKey
} from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;

interface CheckoutBody {
  plan?: unknown;
  period?: "monthly" | "annual";
  founder?: boolean;
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

  if (!isPlan(body.plan)) {
    return gate.attach(billingErrorResponse("invalid_plan", "Unknown plan id."));
  }
  const requested = body.plan;
  const store = await getBillingStore();
  const { identity, attachToResponse } = await resolveUserIdentity(req);

  // Free plan: clear any active dev override cookie.
  if (requested === "free") {
    const ops = devOverrideMutationFor(identity, "free");
    void store.appendAuditEvent({
      kind: "checkout-stub",
      identityKey: identity.id,
      plan: "free",
      detail: "dev override cleared"
    });
    return attachToResponse(
      ops.clear(
        NextResponse.json({
          ok: true,
          mode: "stub",
          plan: "free",
          message: "Dev override cleared.",
          nextAction: "reload"
        })
      )
    );
  }

  // Resolve which Stripe price to charge.
  const priceKey = pickPriceKey(requested, body.period, body.founder);
  if (!priceKey) {
    return attachToResponse(
      billingErrorResponse(
        "invalid_plan",
        "Enterprise / unknown plan combinations aren't sold from this endpoint."
      )
    );
  }

  const stripe = getStripe();
  const priceId = STRIPE_PRICE_IDS[priceKey];

  // ---------- Real Stripe path ----------
  if (stripe && priceId) {
    try {
      // Make sure we have a customer record so the webhook can resolve
      // back to this identity even before checkout.session.completed.
      const customer = await ensureCustomer(store, identity);

      const session = await stripe.checkout.sessions.create({
        mode: checkoutModeFor(priceKey),
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl()}/app?billing=success`,
        cancel_url: `${appUrl()}/pricing?billing=cancel`,
        client_reference_id: identity.id,
        customer_email: identity.email,
        metadata: {
          identityKey: identity.id,
          plan: requested,
          priceKey,
          customerRecordId: customer.id
        },
        // For subscription plans, allow promotion codes; payment mode
        // (founder lifetime) doesn't need them.
        ...(checkoutModeFor(priceKey) === "subscription"
          ? { allow_promotion_codes: true }
          : {})
      });

      void store.appendAuditEvent({
        kind: "checkout-stub",
        identityKey: identity.id,
        customerId: customer.id,
        plan: requested,
        detail: `stripe checkout session ${session.id} created (${priceKey})`
      });

      return attachToResponse(
        NextResponse.json({
          ok: true,
          mode: "stripe",
          plan: requested,
          priceKey,
          url: session.url,
          sessionId: session.id,
          nextAction: "redirect"
        })
      );
    } catch (err) {
      // Don't leak Stripe internals to the browser.
      const detail = (err as Error).message?.slice(0, 200);
      return attachToResponse(
        billingErrorResponse(
          "stripe_error",
          `Stripe rejected the checkout request${detail ? `: ${detail}` : "."}`,
          502
        )
      );
    }
  }

  // ---------- Stub fallback ----------
  if (!devOverrideEnabled()) {
    return attachToResponse(
      billingErrorResponse(
        "checkout_unavailable",
        stripe
          ? `Stripe is configured but no price id is set for ${priceKey}. ` +
              "Add the matching STRIPE_PRICE_* env var or enable the dev override."
          : "No real billing provider is configured. Set STRIPE_SECRET_KEY (and price ids) " +
            "or BILLING_DEV_OVERRIDE_SECRET for the local Pro Preview flow.",
        503
      )
    );
  }

  const ops = devOverrideMutationFor(identity, requested);
  void store.appendAuditEvent({
    kind: "checkout-stub",
    identityKey: identity.id,
    plan: requested,
    detail: "signed dev override applied (stripe unavailable)"
  });

  return attachToResponse(
    ops.apply(
      NextResponse.json({
        ok: true,
        mode: "stub",
        plan: requested,
        message:
          "Stub checkout — signed dev override applied. No payment was processed.",
        nextAction: "reload"
      })
    )
  );
}

// ---------- helpers --------------------------------------------------------

function pickPriceKey(
  plan: "pro" | "team" | "enterprise",
  period: "monthly" | "annual" | undefined,
  founder: boolean | undefined
): StripePlanKey | null {
  if (plan === "enterprise") return null;
  if (founder && plan === "pro") return "founder_lifetime";
  if (plan === "pro") return period === "annual" ? "pro_annual" : "pro_monthly";
  if (plan === "team") return period === "annual" ? "team_annual" : "team_monthly";
  return null;
}

async function ensureCustomer(
  store: Awaited<ReturnType<typeof getBillingStore>>,
  identity: { id: string; email?: string }
) {
  const existing = await store.getCustomerByIdentity(identity.id);
  if (existing) return existing;
  const now = Date.now();
  return store.upsertCustomer({
    id: newCustomerId(),
    identityKey: identity.id,
    email: identity.email,
    createdAt: now,
    updatedAt: now
  });
}
