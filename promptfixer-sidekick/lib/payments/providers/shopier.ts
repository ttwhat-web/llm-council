/**
 * Shopier — Turkey-first hosted payment link provider.
 *
 * Today the runtime returns the operator-configured
 * `SHOPIER_DEFAULT_PAYMENT_URL` with the operator.center reference id
 * appended. Real Shopier API link creation (signed form POST against
 * `https://www.shopier.com/ShowProduct/api_pay4.php`) is left as a
 * TODO — operators can wire it inside `buildRedirectUrl` without
 * disturbing routes or UI.
 *
 * Callback route: `/api/payments/shopier/callback`. The route verifies
 * an HMAC-SHA256 signature using `SHOPIER_CALLBACK_SECRET` when set.
 * Unsigned callbacks are accepted but do NOT auto-grant — they only
 * move the record to `submitted` and require admin verification.
 */

import { createLinkProvider } from "./_linkProvider";
import type { PaymentProvider } from "../types";

export function createShopierProvider(): PaymentProvider {
  return createLinkProvider({
    id: "shopier",
    label: "Card · Shopier (Turkey)",
    description:
      "Hosted Turkish payment link. Accepts local cards and major international cards.",
    mode: "shopier_payment_link",
    defaultUrlEnv: "SHOPIER_DEFAULT_PAYMENT_URL",
    enabledEnv: "SHOPIER_ENABLED",
    callbackConfiguredCheck: () => {
      // Callback can auto-grant only when we hold the signing secret.
      return (process.env.SHOPIER_CALLBACK_SECRET || "").length > 0;
    },
    extraNotes: [
      "Receipt and order id arrive in your email from Shopier after payment."
    ]
    // TODO(payments-shopier-api):
    //   1. POST signed form against api_pay4.php to mint a hosted URL.
    //   2. Override `buildRedirectUrl` to return the API-minted URL.
    //   3. Update the callback route to parse Shopier's POST body shape.
  });
}
