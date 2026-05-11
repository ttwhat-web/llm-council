/**
 * Local manual `PaymentProvider` — Turkish-market local payment seat.
 *
 * Reserved abstraction. Architected so we can wire Shopier / iyzico /
 * PayTR / bank transfer later without churning the route layer or UI.
 * For now: enabled when `ENABLE_LOCAL_MANUAL_PAYMENTS=true` and at
 * least one local instruction set is configured; returns manual
 * instructions for the operator to relay.
 */

import {
  getPaymentStore,
  newPaymentId,
  newPaymentReference
} from "../store";
import type {
  CreateCheckoutInput,
  ManualInstructions,
  PaymentCheckoutResult,
  PaymentProvider,
  PaymentRecord,
  ProviderInfo
} from "../types";
import { priceHintFor } from "../crypto";
import { countFounderSeats } from "../../billing/founder";

const PROVIDER_ID = "local_manual";

interface LocalConfig {
  enabled: boolean;
  bankInstructions: string;
  bankReference: string;
}

function localConfig(): LocalConfig {
  const enabled =
    (process.env.ENABLE_LOCAL_MANUAL_PAYMENTS || "").toLowerCase() === "true";
  return {
    enabled,
    bankInstructions: process.env.LOCAL_BANK_INSTRUCTIONS || "",
    bankReference: process.env.LOCAL_BANK_REFERENCE || "operator.center"
  };
}

export function createLocalManualProvider(): PaymentProvider {
  return {
    id: PROVIDER_ID,
    info(): ProviderInfo {
      const cfg = localConfig();
      const enabled = cfg.enabled && cfg.bankInstructions.length > 0;
      return {
        id: PROVIDER_ID,
        label: "Bank transfer · Turkey / local",
        description:
          "Wire transfer or local payment provider. Manual verification by operator.center staff.",
        enabled,
        plans: enabled
          ? ["pro_monthly", "pro_annual", "team_monthly", "team_annual", "founder_lifetime"]
          : [],
        modes: ["local_bank_transfer_manual"],
        manualVerification: true,
        unavailableReason: enabled
          ? undefined
          : "ENABLE_LOCAL_MANUAL_PAYMENTS=true plus LOCAL_BANK_INSTRUCTIONS required."
      };
    },
    async createCheckout(input: CreateCheckoutInput): Promise<PaymentCheckoutResult> {
      const cfg = localConfig();
      if (!cfg.enabled || !cfg.bankInstructions) {
        return {
          ok: false,
          code: "local_not_configured",
          message: "Local manual payments aren't enabled on this deployment."
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
      const price = priceHintFor(input.plan);
      const store = await getPaymentStore();
      const record: PaymentRecord = {
        id: newPaymentId(),
        reference: newPaymentReference(),
        provider: PROVIDER_ID,
        mode: "local_bank_transfer_manual",
        status: "pending",
        plan: input.plan,
        identityKey: input.identityKey,
        email: input.email,
        amount: { value: price.usd, currency: "USD" },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await store.put(record);

      const instructions: ManualInstructions = {
        reference: record.reference,
        amount: record.amount,
        notes: [
          `Send the USD-equivalent of ${price.label} via the instructions below.`,
          `Use reference ${record.reference} in the wire memo so we can match it.`,
          cfg.bankInstructions,
          "Manual verification required. Access is granted after the payment is confirmed."
        ],
        submissionUrl: `/api/payments/crypto/submit`
      };

      return {
        ok: true,
        provider: PROVIDER_ID,
        mode: "local_bank_transfer_manual",
        paymentId: record.id,
        manualInstructions: instructions
      };
    }
  };
}
