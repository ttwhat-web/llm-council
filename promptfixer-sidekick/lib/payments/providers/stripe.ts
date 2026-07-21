/**
 * Stripe `PaymentProvider`.
 *
 * Thin wrapper over the existing Stripe wiring (`lib/billing/stripe.ts`
 * + the webhook in `/api/billing/webhook/route.ts`). The unified
 * checkout endpoint can route Stripe-eligible plans here without
 * disturbing the legacy `/api/billing/checkout` path that the
 * UpgradeModal still uses for direct Stripe.
 */

import {
  STRIPE_PRICE_IDS,
  appUrl,
  checkoutModeFor,
  getStripe,
  type StripePlanKey
} from "../../billing/stripe";
import { getBillingStore, newCustomerId } from "../../billing/store";
import { countFounderSeats } from "../../billing/founder";
import type {
  CreateCheckoutInput,
  PaymentCheckoutResult,
  PaymentProvider,
  PaymentPlanKey,
  ProviderInfo
} from "../types";

const PROVIDER_ID = "stripe";

function planKeyFor(plan: PaymentPlanKey): StripePlanKey {
  return plan;
}

function configuredPlans(): PaymentPlanKey[] {
  const out: PaymentPlanKey[] = [];
  const plans: PaymentPlanKey[] = [
    "pro_monthly",
    "pro_annual",
    "team_monthly",
    "team_annual",
    "founder_lifetime"
  ];
  for (const p of plans) {
    if (STRIPE_PRICE_IDS[planKeyFor(p)]) out.push(p);
  }
  return out;
}

function stripeLinkEnabled(): boolean {
  return (process.env.STRIPE_LINK_ENABLED || "").toLowerCase() === "true";
}

export function createStripeProvider(): PaymentProvider {
  return {
    id: PROVIDER_ID,
    info(): ProviderInfo {
      const enabled = Boolean(getStripe());
      const plans = enabled ? configuredPlans() : [];
      // Link by Stripe is an accelerated checkout capability INSIDE
      // Stripe, not a standalone provider. We surface it as a label
      // change + a flag the UI can read; the underlying mode is still
      // `stripe_checkout` and the redirect target is the same.
      const linkOn = enabled && stripeLinkEnabled();
      return {
        id: PROVIDER_ID,
        label: linkOn ? "Card / Link by Stripe" : "Card · Stripe",
        description: linkOn
          ? "Visa / Mastercard / Amex via Stripe Checkout. Link autofills saved payment details after email or SMS verification."
          : "Visa / Mastercard / Amex via Stripe Checkout. Hosted page.",
        enabled,
        plans,
        modes: ["stripe_checkout"],
        manualVerification: false,
        unavailableReason: enabled
          ? undefined
          : "STRIPE_SECRET_KEY is not configured.",
        capabilities: { stripeLink: linkOn }
      };
    },
    async createCheckout(input: CreateCheckoutInput): Promise<PaymentCheckoutResult> {
      const stripe = getStripe();
      if (!stripe) {
        return {
          ok: false,
          code: "stripe_not_configured",
          message: "Stripe is not configured on this deployment."
        };
      }
      const priceKey = planKeyFor(input.plan);
      const priceId = STRIPE_PRICE_IDS[priceKey];
      if (!priceId) {
        return {
          ok: false,
          code: "stripe_price_missing",
          message: `Stripe price id for ${priceKey} is not configured.`
        };
      }

      // Founder cap — same pool as the manual / crypto path.
      if (input.plan === "founder_lifetime") {
        const seats = await countFounderSeats();
        if (seats.soldOut) {
          return {
            ok: false,
            code: "founder_sold_out",
            message: "Founder lifetime is fully claimed."
          };
        }
      }

      const store = await getBillingStore();
      const existing = await store.getCustomerByIdentity(input.identityKey);
      const customer =
        existing ??
        (await store.upsertCustomer({
          id: newCustomerId(),
          identityKey: input.identityKey,
          email: input.email,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }));

      try {
        const session = await stripe.checkout.sessions.create({
          mode: checkoutModeFor(priceKey),
          line_items: [{ price: priceId, quantity: 1 }],
          success_url:
            input.successUrl || `${appUrl()}/app?billing=success`,
          cancel_url: input.cancelUrl || `${appUrl()}/pricing?billing=cancel`,
          client_reference_id: input.identityKey,
          customer_email: input.email,
          metadata: {
            identityKey: input.identityKey,
            plan: input.plan,
            priceKey,
            customerRecordId: customer.id
          },
          ...(checkoutModeFor(priceKey) === "subscription"
            ? { allow_promotion_codes: true }
            : {})
        });

        return {
          ok: true,
          provider: PROVIDER_ID,
          mode: "stripe_checkout",
          redirectUrl: session.url ?? undefined,
          paymentId: session.id
        };
      } catch (err) {
        return {
          ok: false,
          code: "stripe_error",
          message: `Stripe rejected checkout: ${(err as Error).message?.slice(0, 200)}`
        };
      }
    }
  };
}
