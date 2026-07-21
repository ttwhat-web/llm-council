/**
 * Stub `PaymentProvider` — dev override only.
 *
 * Mirrors the existing /api/billing/checkout dev cookie flow. Used so
 * the new `/api/payments/checkout` surface degrades gracefully when no
 * real provider is configured: instead of failing, it issues the same
 * server-signed dev cookie the legacy route already mints. Anonymous
 * trial flow stays usable in local dev.
 */

import type {
  CreateCheckoutInput,
  PaymentCheckoutResult,
  PaymentProvider,
  PaymentPlanKey,
  ProviderInfo
} from "../types";
import { devOverrideEnabled } from "../../billing/server";

const PROVIDER_ID = "stub";

function listPlans(): PaymentPlanKey[] {
  return [
    "pro_monthly",
    "pro_annual",
    "team_monthly",
    "team_annual",
    "founder_lifetime"
  ];
}

export function createStubProvider(): PaymentProvider {
  return {
    id: PROVIDER_ID,
    info(): ProviderInfo {
      const enabled = devOverrideEnabled();
      return {
        id: PROVIDER_ID,
        label: "Dev override",
        description:
          "Server-signed local preview. Grants the plan instantly. No payment is processed.",
        enabled,
        plans: enabled ? listPlans() : [],
        modes: ["stub_dev_override"],
        manualVerification: false,
        unavailableReason: enabled
          ? undefined
          : "BILLING_DEV_OVERRIDE_SECRET is not set."
      };
    },
    async createCheckout(input: CreateCheckoutInput): Promise<PaymentCheckoutResult> {
      // The route layer handles cookie issuance via existing
      // devOverrideMutationFor(); this provider exists primarily so the
      // unified surface can advertise stub mode alongside real
      // providers. Routes should detect `provider === "stub"` and call
      // the existing /api/billing/checkout codepath rather than
      // duplicating cookie logic here.
      void input;
      return {
        ok: true,
        provider: PROVIDER_ID,
        mode: "stub_dev_override",
        message:
          "Stub provider — route to /api/billing/checkout with plan to mint the dev cookie."
      };
    }
  };
}
