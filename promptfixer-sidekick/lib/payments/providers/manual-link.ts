/**
 * Generic manual payment link.
 *
 * The catch-all for any hosted link the operator wants to publish but
 * for which we don't have a dedicated provider: a fundraising page, a
 * Buy-Me-A-Coffee URL, a personal Stripe Payment Link, a bank-provided
 * payment portal, anything where the customer pays out-of-band and
 * the admin verifies receipt manually.
 *
 * No callback route — always requires admin verification. Operators
 * who need a callback should add a dedicated provider file instead.
 */

import { createLinkProvider } from "./_linkProvider";
import type { PaymentProvider } from "../types";

export function createManualLinkProvider(): PaymentProvider {
  return createLinkProvider({
    id: "manual_payment_link",
    label: "Manual payment link",
    description:
      "Static hosted link your operator publishes. Manual verification by operator.center staff.",
    mode: "manual_payment_link",
    defaultUrlEnv: "MANUAL_PAYMENT_URL",
    enabledEnv: "MANUAL_PAYMENT_LINK_ENABLED",
    callbackConfiguredCheck: () => false, // never auto-grants
    extraNotes: [
      "Operator.center will verify your payment manually before activating your plan.",
      // Pass through the operator-curated instruction string verbatim.
      ...(process.env.MANUAL_PAYMENT_INSTRUCTIONS
        ? [process.env.MANUAL_PAYMENT_INSTRUCTIONS]
        : [])
    ]
  }) as PaymentProvider;
}
