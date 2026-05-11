/**
 * Lemon Squeezy `PaymentProvider`.
 *
 * Merchant-of-record. The recommended Turkey-friendly default for
 * card-based subscriptions while we establish a Stripe-supported
 * international entity. Lemon Squeezy supports lifetime SKUs natively,
 * so it's the natural home for the founder lifetime.
 *
 * Phase-8 ships the abstraction stub: `info()` reports enabled when env
 * vars are present; `createCheckout` returns a 503 until the Lemon
 * Squeezy SDK is wired.
 */

import type {
  CreateCheckoutInput,
  PaymentCheckoutResult,
  PaymentProvider,
  PaymentPlanKey,
  ProviderInfo
} from "../types";

const PROVIDER_ID = "lemon_squeezy";

interface LemonEnv {
  apiKey: string;
  webhookSecret: string;
  storeId: string;
  variants: Partial<Record<PaymentPlanKey, string>>;
}

function lemonEnv(): LemonEnv {
  return {
    apiKey: process.env.LEMON_SQUEEZY_API_KEY || "",
    webhookSecret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "",
    storeId: process.env.LEMON_SQUEEZY_STORE_ID || "",
    variants: {
      pro_monthly: process.env.LEMON_SQUEEZY_VARIANT_PRO_MONTHLY,
      pro_annual: process.env.LEMON_SQUEEZY_VARIANT_PRO_ANNUAL,
      team_monthly: process.env.LEMON_SQUEEZY_VARIANT_TEAM_MONTHLY,
      team_annual: process.env.LEMON_SQUEEZY_VARIANT_TEAM_ANNUAL,
      founder_lifetime: process.env.LEMON_SQUEEZY_VARIANT_FOUNDER_LIFETIME
    }
  };
}

function configuredPlans(env: LemonEnv): PaymentPlanKey[] {
  return (Object.entries(env.variants) as Array<[PaymentPlanKey, string | undefined]>)
    .filter(([, v]) => Boolean(v))
    .map(([k]) => k);
}

export function createLemonSqueezyProvider(): PaymentProvider {
  return {
    id: PROVIDER_ID,
    info(): ProviderInfo {
      const env = lemonEnv();
      const enabled = env.apiKey.length > 0 && env.storeId.length > 0;
      const plans = enabled ? configuredPlans(env) : [];
      return {
        id: PROVIDER_ID,
        label: "Card · Lemon Squeezy (MoR)",
        description:
          "Merchant-of-record. Lemon Squeezy handles VAT, EU MOSS, and card processing globally.",
        enabled,
        plans,
        modes: ["lemon_squeezy_checkout"],
        manualVerification: false,
        unavailableReason: enabled
          ? undefined
          : "LEMON_SQUEEZY_API_KEY + LEMON_SQUEEZY_STORE_ID are not configured."
      };
    },
    async createCheckout(input: CreateCheckoutInput): Promise<PaymentCheckoutResult> {
      const env = lemonEnv();
      if (!env.apiKey || !env.storeId) {
        return {
          ok: false,
          code: "lemon_not_configured",
          message: "Lemon Squeezy isn't configured on this deployment."
        };
      }
      void input;
      // TODO(payments-lemon):
      // 1. POST /v1/checkouts with the right variant id + custom data
      //    carrying identityKey.
      // 2. Return the redirect URL (data.attributes.url).
      // 3. Register a webhook handler under
      //    /api/payments/lemon-squeezy/webhook verifying the
      //    `X-Signature` HMAC, then upsert through BillingStore on
      //    `order_created` and `subscription_*` events.
      return {
        ok: false,
        code: "lemon_not_implemented",
        message:
          "Lemon Squeezy checkout integration is stubbed in Phase 8. " +
          "Wire the @lemonsqueezy/lemonsqueezy.js SDK here and a webhook handler."
      };
    }
  };
}
