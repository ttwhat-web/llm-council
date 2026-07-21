/**
 * iyzico — Turkey-first hosted payment link (Link / Fastlink).
 *
 * Phase-11 scaffold: returns the operator-configured
 * `IYZICO_DEFAULT_PAYMENT_URL` with the operator.center reference
 * appended. The real iyzico Link API (`/v2/payment/iyzilink/products`
 * + checkout-form initialize) is left as a TODO.
 *
 * Callback route: `/api/payments/iyzico/callback`. Verifies HMAC-SHA256
 * against `IYZICO_CALLBACK_SECRET` when configured. Unsigned events
 * never auto-grant.
 */

import { createLinkProvider } from "./_linkProvider";
import type { PaymentProvider } from "../types";

export function createIyzicoProvider(): PaymentProvider {
  return createLinkProvider({
    id: "iyzico",
    label: "Card · iyzico (Turkey)",
    description:
      "Hosted Turkish payment link via iyzico Link / Fastlink. Card + installments.",
    mode: "iyzico_payment_link",
    defaultUrlEnv: "IYZICO_DEFAULT_PAYMENT_URL",
    enabledEnv: "IYZICO_LINK_ENABLED",
    callbackConfiguredCheck: () => {
      return (process.env.IYZICO_CALLBACK_SECRET || "").length > 0;
    },
    extraNotes: [
      "iyzico emails you a receipt with the order id after a successful charge."
    ]
    // TODO(payments-iyzico-api):
    //   1. Wire iyzipay-node (or REST against IYZICO_BASE_URL) to create
    //      a Link / Fastlink + return its hosted URL.
    //   2. Override `buildRedirectUrl` accordingly.
    //   3. Implement signature verification per
    //      https://docs.iyzico.com/iyzilink in the callback route.
  });
}
