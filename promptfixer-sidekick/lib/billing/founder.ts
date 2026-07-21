/**
 * Founder lifetime cap.
 *
 * operator.center sells a $99 lifetime Pro tier capped at the first
 * `FOUNDER_LIFETIME_CAP` operators. Both the Stripe checkout path
 * (subscription source) AND the manual / crypto path (PaymentStore
 * verified records) consume the same pool.
 *
 * `countFounderSeats()` is the single source of truth — both routes and
 * the UI banner consult it. Reads only — no caching beyond what the
 * underlying stores cache.
 */

import { getBillingStore } from "./store";
import { getPaymentStore } from "../payments/store";

export const FOUNDER_LIFETIME_CAP = Number(
  process.env.FOUNDER_LIFETIME_CAP || "100"
);

export interface FounderSeatSnapshot {
  cap: number;
  claimed: number;
  remaining: number;
  soldOut: boolean;
}

export async function countFounderSeats(): Promise<FounderSeatSnapshot> {
  // Subscriptions sourced via Stripe / debug-grant — count those whose
  // plan is "pro" AND status is active AND no period end (lifetime
  // marker). We treat any pro sub created via the founder-lifetime
  // price as having an absent `currentPeriodEnd`; that's the
  // distinguishing feature we set on /api/billing/webhook for
  // checkout.session.completed in payment mode.
  const billing = await getBillingStore();
  const subs = (await billing.listSubscriptions?.()) ?? [];
  const subscriptionSeats = subs.filter(
    (s) =>
      s.plan === "pro" &&
      (s.status === "active" || s.status === "trialing") &&
      typeof s.currentPeriodEnd !== "number"
  ).length;

  // Manual / crypto verified founder payments.
  const payments = await getPaymentStore();
  const cryptoSeats = await payments.countByPlanAndStatus(
    "founder_lifetime",
    "verified"
  );

  const claimed = subscriptionSeats + cryptoSeats;
  const cap = Math.max(0, FOUNDER_LIFETIME_CAP);
  const remaining = Math.max(0, cap - claimed);
  return { cap, claimed, remaining, soldOut: claimed >= cap };
}
