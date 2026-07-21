/**
 * Lemon Squeezy `PaymentProvider`.
 *
 * Phase 9: real checkout. Merchant-of-record default for operator.center
 * pre-international-entity (Turkey-friendly, native lifetime SKU).
 *
 * The provider calls `POST /v1/checkouts` against the Lemon REST API
 * (no SDK dep) and returns the hosted-checkout URL. Lifecycle events
 * land at `/api/payments/lemon-squeezy/webhook`, which verifies the
 * `X-Signature` HMAC, normalises event names, and upserts via
 * BillingStore.
 *
 * Custom data carried along on every checkout:
 *   identityKey     stable `Identity.id` so the webhook can resolve back
 *   plan            our internal PaymentPlanKey
 *   founder         "true" when the plan is founder_lifetime — surfaced
 *                   in the welcome email
 *   reference       short user-visible reference (OC-XXXXXX)
 */

import {
  newPaymentReference
} from "../store";
import { countFounderSeats } from "../../billing/founder";
import type {
  CreateCheckoutInput,
  PaymentCheckoutResult,
  PaymentProvider,
  PaymentPlanKey,
  ProviderInfo
} from "../types";

const PROVIDER_ID = "lemon_squeezy";
const API_BASE = "https://api.lemonsqueezy.com/v1";

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

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3030").replace(/\/$/, "");
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
      const variantId = env.variants[input.plan];
      if (!variantId) {
        return {
          ok: false,
          code: "lemon_variant_missing",
          message: `Lemon Squeezy variant for ${input.plan} is not configured.`
        };
      }
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

      const reference = newPaymentReference();

      const checkoutBody = {
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: input.email,
              custom: {
                identityKey: input.identityKey,
                plan: input.plan,
                founder: input.plan === "founder_lifetime" ? "true" : "false",
                reference
              }
            },
            checkout_options: {
              embed: false,
              media: false,
              logo: true,
              dark: true
            },
            product_options: {
              redirect_url:
                input.successUrl || `${appUrl()}/app?billing=success&ref=${reference}`,
              receipt_link_url:
                input.successUrl || `${appUrl()}/app?billing=success&ref=${reference}`,
              receipt_thank_you_note: "Welcome aboard, operator."
            }
          },
          relationships: {
            store: { data: { type: "stores", id: env.storeId } },
            variant: { data: { type: "variants", id: variantId } }
          }
        }
      };

      try {
        const res = await fetch(`${API_BASE}/checkouts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.apiKey}`,
            Accept: "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json"
          },
          body: JSON.stringify(checkoutBody)
        });
        if (!res.ok) {
          // Provider body can include useful hints but we don't echo it
          // to the browser — surface only the status.
          return {
            ok: false,
            code: "lemon_error",
            message: `Lemon Squeezy rejected checkout (HTTP ${res.status}).`
          };
        }
        const data = (await res.json()) as {
          data?: { id?: string; attributes?: { url?: string } };
        };
        const url = data.data?.attributes?.url;
        if (!url) {
          return {
            ok: false,
            code: "lemon_no_url",
            message: "Lemon Squeezy didn't return a checkout URL."
          };
        }
        return {
          ok: true,
          provider: PROVIDER_ID,
          mode: "lemon_squeezy_checkout",
          paymentId: data.data?.id,
          redirectUrl: url
        };
      } catch (err) {
        return {
          ok: false,
          code: "lemon_error",
          message: `Lemon Squeezy request failed: ${(err as Error).name || "error"}`
        };
      }
    }
  };
}
