/**
 * Stripe wiring helpers.
 *
 * Single import point for the Stripe SDK so routes don't litter
 * `new Stripe(...)` at module load. Returns `null` when STRIPE_SECRET_KEY
 * isn't set, which lets the rest of the app degrade to stub mode without
 * branching on env in every handler.
 */

import Stripe from "stripe";
import type { Plan } from "./types";

const SECRET = process.env.STRIPE_SECRET_KEY || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3030";

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!SECRET) return null;
  if (!cached) {
    cached = new Stripe(SECRET, {
      // Pin to the API version the installed Stripe SDK ships defaults
      // for; let the package's own type drive the literal so we don't
      // need to bump this when the SDK upgrades.
      typescript: true,
      appInfo: { name: "operator.center", url: APP_URL }
    });
  }
  return cached;
}

export function appUrl(): string {
  return APP_URL.replace(/\/$/, "");
}

export type StripePlanKey =
  | "pro_monthly"
  | "pro_annual"
  | "team_monthly"
  | "team_annual"
  | "founder_lifetime";

export const STRIPE_PRICE_IDS: Record<StripePlanKey, string | undefined> = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  team_monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY,
  team_annual: process.env.STRIPE_PRICE_TEAM_ANNUAL,
  founder_lifetime: process.env.STRIPE_PRICE_FOUNDER_LIFETIME
};

export function planFromStripeKey(key: StripePlanKey): Exclude<Plan, "free"> {
  if (key.startsWith("team")) return "team";
  return "pro";
}

export function checkoutModeFor(key: StripePlanKey): "subscription" | "payment" {
  return key === "founder_lifetime" ? "payment" : "subscription";
}

/**
 * Resolve a price id from a Stripe Price.id string back to our internal
 * key. Used in the webhook to figure out the plan.
 */
export function planKeyFromPriceId(priceId: string): StripePlanKey | null {
  for (const [key, value] of Object.entries(STRIPE_PRICE_IDS) as Array<
    [StripePlanKey, string | undefined]
  >) {
    if (value && value === priceId) return key;
  }
  return null;
}

/** Webhook signing secret. */
export function webhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET || undefined;
}
