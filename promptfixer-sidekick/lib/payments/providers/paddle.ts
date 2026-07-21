/**
 * Paddle `PaymentProvider`.
 *
 * Merchant-of-record. Paddle handles VAT / sales tax globally and
 * works well for sellers without a Stripe-supported entity (relevant
 * to operator.center operating from Turkey).
 *
 * Phase-8 ships the abstraction stub: `info()` reports the provider as
 * enabled when env vars are present; `createCheckout` currently returns
 * a 503 with a clear message until the Paddle Billing SDK is wired.
 * The route layer and UI already speak the unified shape so swapping
 * the body of `createCheckout` is the only code change required.
 */

import type {
  CreateCheckoutInput,
  PaymentCheckoutResult,
  PaymentProvider,
  PaymentPlanKey,
  ProviderInfo
} from "../types";

const PROVIDER_ID = "paddle";

interface PaddleEnv {
  apiKey: string;
  webhookSecret: string;
  pricePro: { monthly?: string; annual?: string };
  priceTeam: { monthly?: string; annual?: string };
}

function paddleEnv(): PaddleEnv {
  return {
    apiKey: process.env.PADDLE_API_KEY || "",
    webhookSecret: process.env.PADDLE_WEBHOOK_SECRET || "",
    pricePro: {
      monthly: process.env.PADDLE_PRICE_PRO_MONTHLY,
      annual: process.env.PADDLE_PRICE_PRO_ANNUAL
    },
    priceTeam: {
      monthly: process.env.PADDLE_PRICE_TEAM_MONTHLY,
      annual: process.env.PADDLE_PRICE_TEAM_ANNUAL
    }
  };
}

function configuredPlans(env: PaddleEnv): PaymentPlanKey[] {
  const out: PaymentPlanKey[] = [];
  if (env.pricePro.monthly) out.push("pro_monthly");
  if (env.pricePro.annual) out.push("pro_annual");
  if (env.priceTeam.monthly) out.push("team_monthly");
  if (env.priceTeam.annual) out.push("team_annual");
  return out;
}

export function createPaddleProvider(): PaymentProvider {
  return {
    id: PROVIDER_ID,
    info(): ProviderInfo {
      const env = paddleEnv();
      const enabled = env.apiKey.length > 0;
      const plans = enabled ? configuredPlans(env) : [];
      return {
        id: PROVIDER_ID,
        label: "Card · Paddle (MoR)",
        description: "Merchant-of-record. Paddle handles VAT / sales tax worldwide.",
        enabled,
        plans,
        modes: ["paddle_checkout"],
        manualVerification: false,
        unavailableReason: enabled
          ? undefined
          : "PADDLE_API_KEY is not configured."
      };
    },
    async createCheckout(input: CreateCheckoutInput): Promise<PaymentCheckoutResult> {
      const env = paddleEnv();
      if (!env.apiKey) {
        return {
          ok: false,
          code: "paddle_not_configured",
          message: "Paddle isn't configured on this deployment."
        };
      }
      void input;
      // TODO(payments-paddle):
      // 1. Create a transaction with Paddle Billing API.
      // 2. Return the hosted-checkout URL.
      // 3. Register webhook handler (separate file, mirror /api/billing/webhook
      //    but for Paddle events: subscription_created / subscription_canceled /
      //    transaction_completed). Upsert through BillingStore.
      return {
        ok: false,
        code: "paddle_not_implemented",
        message:
          "Paddle checkout integration is stubbed in Phase 8. Wire " +
          "`@paddle/paddle-node-sdk` here and a /api/payments/paddle/webhook handler."
      };
    }
  };
}
