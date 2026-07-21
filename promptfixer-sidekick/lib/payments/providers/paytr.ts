/**
 * PayTR — Turkey-first hosted payment link.
 *
 * Phase-11 scaffold: returns `PAYTR_DEFAULT_PAYMENT_URL` with the
 * operator.center reference appended. The real PayTR Link API
 * (`/odeme/api/get-token` + `/odeme/api/link/send`) is left as a TODO.
 *
 * Callback route: `/api/payments/paytr/callback`. PayTR signs callbacks
 * with `merchant_key + merchant_salt + status fields`; the route checks
 * `PAYTR_CALLBACK_SECRET` as a generic HMAC stand-in. Real PayTR
 * verification belongs in the route once the operator wires it.
 */

import { createLinkProvider } from "./_linkProvider";
import type { PaymentProvider } from "../types";

export function createPaytrProvider(): PaymentProvider {
  return createLinkProvider({
    id: "paytr",
    label: "Card · PayTR (Turkey)",
    description:
      "Hosted Turkish payment link via PayTR. Card + installments.",
    mode: "paytr_payment_link",
    defaultUrlEnv: "PAYTR_DEFAULT_PAYMENT_URL",
    enabledEnv: "PAYTR_LINK_ENABLED",
    callbackConfiguredCheck: () => {
      return (process.env.PAYTR_CALLBACK_SECRET || "").length > 0;
    },
    extraNotes: [
      "PayTR returns the order id after a successful charge — paste it on the share page if you need to escalate."
    ]
    // TODO(payments-paytr-api):
    //   1. Mint a Link token via PAYTR_MERCHANT_ID + PAYTR_MERCHANT_KEY
    //      + PAYTR_MERCHANT_SALT against /odeme/api/link/send.
    //   2. Override `buildRedirectUrl` to return the hosted Link URL.
    //   3. Implement PayTR's exact hash verification in the callback
    //      route (HMAC-SHA256 of merchant_oid + merchant_salt + status).
  });
}
