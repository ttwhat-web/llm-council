/**
 * Crypto manual `PaymentProvider`.
 *
 * Generates a PaymentRecord with status="pending" and returns manual
 * instructions (network + receiving address + reference + warnings).
 * The user then sends the crypto out-of-band and submits the tx hash
 * via `/api/payments/crypto/submit`, which moves the record to
 * status="submitted". An admin verifies and the plan is granted via
 * BillingStore.
 *
 * NO PRIVATE KEYS, NO WALLETS, NO BLOCKCHAIN RPC. The server only
 * publishes public receiving addresses configured in env.
 */

import { cryptoConfig, getNetwork, priceHintFor } from "../crypto";
import { countFounderSeats } from "../../billing/founder";
import {
  getPaymentStore,
  newPaymentId,
  newPaymentReference
} from "../store";
import type {
  CreateCheckoutInput,
  ManualInstructions,
  PaymentCheckoutResult,
  PaymentPlanKey,
  PaymentProvider,
  PaymentRecord,
  ProviderInfo
} from "../types";

const PROVIDER_ID = "crypto_manual";
const EXPIRES_AFTER_MS = 1000 * 60 * 60 * 24; // 24h to send

function pickDefaultNetwork(): string | null {
  const cfg = cryptoConfig();
  const first = cfg.networks.find((n) => n.enabled);
  return first?.id ?? null;
}

function listPlansSupported(): PaymentPlanKey[] {
  // Phase-8 scope: founder lifetime + Pro annual / monthly via crypto.
  // Team plans go through providers that handle recurring billing.
  return ["founder_lifetime", "pro_annual", "pro_monthly"];
}

export function createCryptoManualProvider(): PaymentProvider {
  return {
    id: PROVIDER_ID,
    info(): ProviderInfo {
      const cfg = cryptoConfig();
      const enabled = cfg.enabled;
      return {
        id: PROVIDER_ID,
        label: "Crypto · BTC / USDT / USDC",
        description:
          "Send on-chain to operator.center. Manual verification — plan is granted after admin confirms the deposit.",
        enabled,
        plans: enabled ? listPlansSupported() : [],
        modes: ["crypto_manual_invoice"],
        manualVerification: true,
        unavailableReason: enabled
          ? undefined
          : "ENABLE_CRYPTO_PAYMENTS=true plus at least one CRYPTO_*_ADDRESS env var required."
      };
    },
    async createCheckout(input: CreateCheckoutInput): Promise<PaymentCheckoutResult> {
      const cfg = cryptoConfig();
      if (!cfg.enabled) {
        return {
          ok: false,
          code: "crypto_not_configured",
          message: "Crypto payments are not enabled on this deployment."
        };
      }

      const networkId = input.cryptoNetwork || pickDefaultNetwork();
      if (!networkId) {
        return {
          ok: false,
          code: "crypto_no_network",
          message: "No crypto network is configured on this deployment."
        };
      }
      const network = getNetwork(networkId);
      if (!network || !network.enabled) {
        return {
          ok: false,
          code: "crypto_network_unavailable",
          message: `Network ${networkId} is not currently accepted.`
        };
      }

      // Founder cap.
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
        mode: "crypto_manual_invoice",
        status: "pending",
        plan: input.plan,
        identityKey: input.identityKey,
        email: input.email,
        amount: { value: price.usd, currency: "USD" },
        crypto: {
          network: network.id,
          address: network.address
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await store.put(record);

      const instructions: ManualInstructions = {
        network: network.id,
        networkLabel: network.label,
        networkWarning: network.warning,
        address: network.address,
        amount: record.amount,
        reference: record.reference,
        expiresAt: Date.now() + EXPIRES_AFTER_MS,
        notes: [
          `Send the USD-equivalent of ${price.label} in ${network.asset}.`,
          `Use the reference ${record.reference} in your wallet's memo / note when supported.`,
          `Submit your transaction hash on the confirmation page below.`,
          network.confirmationHint,
          "Manual verification required. Access is granted after payment confirmation."
        ],
        submissionUrl: `/api/payments/crypto/submit`
      };

      return {
        ok: true,
        provider: PROVIDER_ID,
        mode: "crypto_manual_invoice",
        paymentId: record.id,
        manualInstructions: instructions
      };
    }
  };
}
