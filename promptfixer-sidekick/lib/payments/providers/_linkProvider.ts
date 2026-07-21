/**
 * Shared scaffold for Turkey-friendly hosted-link payment providers.
 *
 *   Shopier · iyzico · PayTR · generic manual link
 *
 * All four share the same shape:
 *
 *   1. Operator configures an env-level "default payment URL"
 *      (`*_DEFAULT_PAYMENT_URL`). This is the link the customer is sent
 *      to. Provider-API link creation is left as a TODO inside each
 *      provider file — the operator can wire it without touching the
 *      runtime.
 *   2. On checkout, we generate a `PaymentRecord{status:"pending"}` with
 *      a short reference (`OC-XXXXXX`) and return both:
 *         - a redirectUrl (the default payment URL plus reference)
 *         - manual instructions (so the customer sees the reference +
 *           a "manual verification required" note in the modal even
 *           after the redirect lands).
 *   3. Payment lifecycle:
 *         - If the provider POSTs a signed callback to
 *           `/api/payments/<provider>/callback` and we have the right
 *           secret to verify it, the route can auto-grant the plan.
 *         - Otherwise the record sits in `pending` / `submitted` and an
 *           admin verifies via `/admin/payments`. NEVER auto-grant on
 *           an unsigned callback.
 *
 * Founder cap is re-checked at every entry point.
 */

import {
  getPaymentStore,
  newPaymentId,
  newPaymentReference
} from "../store";
import { countFounderSeats } from "../../billing/founder";
import { priceHintFor } from "../crypto";
import { founderLaunchEnabled } from "../../launchMode";
import type {
  CreateCheckoutInput,
  ManualInstructions,
  PaymentCheckoutResult,
  PaymentMode,
  PaymentPlanKey,
  PaymentProviderId,
  PaymentRecord,
  ProviderInfo
} from "../types";

export interface LinkProviderConfig {
  id: PaymentProviderId;
  label: string;
  description: string;
  mode: PaymentMode;
  /** Env name housing the public default payment URL. */
  defaultUrlEnv: string;
  /** Env flag that flips the provider on (e.g. SHOPIER_ENABLED). */
  enabledEnv: string;
  /** Optional env flag — true once the provider's API + callback secret
   *  are wired. Drives the "manual verification required" copy and
   *  whether the callback route will auto-grant. */
  callbackConfiguredCheck: () => boolean;
  /** Defensive: plans this provider is allowed to charge. */
  supportedPlans?: PaymentPlanKey[];
  /** Extra instructions appended to the manual-notes list. */
  extraNotes?: string[];
  /** Build the redirect URL. Default: append `?ref=<reference>` to the
   *  configured default URL. Providers with a real API override. */
  buildRedirectUrl?: (defaultUrl: string, reference: string, input: CreateCheckoutInput) => string;
}

const DEFAULT_SUPPORTED_PLANS: PaymentPlanKey[] = [
  "pro_monthly",
  "pro_annual",
  "team_monthly",
  "team_annual",
  "founder_lifetime"
];

function envEnabled(name: string): boolean {
  return (process.env[name] || "").toLowerCase() === "true";
}

function envValue(name: string): string {
  return (process.env[name] || "").trim();
}

function appendReferenceParam(url: string, reference: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("ref", reference);
    return u.toString();
  } catch {
    // Operator pasted a non-URL or relative path. Best-effort string append.
    return url.includes("?")
      ? `${url}&ref=${encodeURIComponent(reference)}`
      : `${url}?ref=${encodeURIComponent(reference)}`;
  }
}

/**
 * Factory shared by Shopier / iyzico / PayTR / manual-link. Each
 * provider supplies its own `LinkProviderConfig`; the factory wires
 * everything else.
 */
export function createLinkProvider(cfg: LinkProviderConfig) {
  return {
    id: cfg.id,
    info(): ProviderInfo {
      const enabled = envEnabled(cfg.enabledEnv);
      const url = envValue(cfg.defaultUrlEnv);
      const ready = enabled && url.length > 0;
      const plans = ready ? cfg.supportedPlans ?? DEFAULT_SUPPORTED_PLANS : [];
      return {
        id: cfg.id,
        label: cfg.label,
        description: cfg.description,
        enabled: ready,
        plans,
        modes: [cfg.mode],
        // Manual verification is always TRUE for these providers until
        // the operator wires a signed callback. The callback route
        // checks `cfg.callbackConfiguredCheck()` at runtime.
        manualVerification: true,
        unavailableReason: ready
          ? undefined
          : !enabled
            ? `${cfg.enabledEnv}=true required to enable.`
            : `${cfg.defaultUrlEnv} must point at the hosted payment link.`
      };
    },
    async createCheckout(input: CreateCheckoutInput): Promise<PaymentCheckoutResult> {
      const enabled = envEnabled(cfg.enabledEnv);
      const defaultUrl = envValue(cfg.defaultUrlEnv);
      if (!enabled || !defaultUrl) {
        return {
          ok: false,
          code: `${cfg.id}_not_configured`,
          message: `${cfg.label} isn't configured on this deployment.`
        };
      }

      // Founder gates — both `FOUNDER_LAUNCH_ENABLED` and the cap.
      if (input.plan === "founder_lifetime") {
        if (!founderLaunchEnabled()) {
          return {
            ok: false,
            code: "founder_launch_disabled",
            message: "Founder lifetime is not available right now."
          };
        }
        const seats = await countFounderSeats();
        if (seats.soldOut) {
          return {
            ok: false,
            code: "founder_sold_out",
            message: "Founder lifetime is fully claimed."
          };
        }
      }

      const plans = cfg.supportedPlans ?? DEFAULT_SUPPORTED_PLANS;
      if (!plans.includes(input.plan)) {
        return {
          ok: false,
          code: `${cfg.id}_plan_unsupported`,
          message: `${cfg.label} doesn't currently sell ${input.plan}.`
        };
      }

      const price = priceHintFor(input.plan);
      const store = await getPaymentStore();
      const reference = newPaymentReference();

      const record: PaymentRecord = {
        id: newPaymentId(),
        reference,
        provider: cfg.id,
        mode: cfg.mode,
        status: "pending",
        plan: input.plan,
        identityKey: input.identityKey,
        email: input.email,
        amount: { value: price.usd, currency: "USD" },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await store.put(record);

      const redirectUrl = cfg.buildRedirectUrl
        ? cfg.buildRedirectUrl(defaultUrl, reference, input)
        : appendReferenceParam(defaultUrl, reference);

      const callbackReady = cfg.callbackConfiguredCheck();
      const notes: string[] = [
        `Send ${price.label} via ${cfg.label}.`,
        `Use the reference ${reference} on the payment page if the provider asks for an order id.`,
        callbackReady
          ? "If the provider confirms automatically, your plan activates within minutes."
          : "Payment may require manual verification. Access is granted after payment confirmation.",
        ...(cfg.extraNotes ?? [])
      ];

      const instructions: ManualInstructions = {
        reference,
        amount: record.amount,
        notes,
        submissionUrl: "/api/payments/crypto/submit",
        address: redirectUrl
      };

      return {
        ok: true,
        provider: cfg.id,
        mode: cfg.mode,
        paymentId: record.id,
        redirectUrl,
        manualInstructions: instructions
      };
    }
  };
}
