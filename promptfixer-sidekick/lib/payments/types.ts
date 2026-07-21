/**
 * Provider-neutral payments abstraction — Phase 8 + Phase 11.
 *
 * operator.center accepts payment through multiple providers:
 *
 *   stripe              — card subscriptions where Stripe is allowed
 *                         (optional Link by Stripe accelerated checkout
 *                          surfaces as a capability of this provider)
 *   paddle              — merchant-of-record (global / TR-friendly fallback)
 *   lemon_squeezy       — merchant-of-record (TR-friendly default)
 *   shopier             — Turkey-first hosted payment link / form
 *   iyzico              — Turkey-first hosted payment link (Link / Fastlink)
 *   paytr               — Turkey-first hosted payment link
 *   manual_payment_link — generic static payment URL (any local provider)
 *   crypto_manual       — BTC / USDT / USDC / SOL via on-chain transfer +
 *                         human verification
 *   local_manual        — Turkish bank-transfer / IBAN manual flow
 *   stub                — dev override, no charge
 *
 * The existing `/api/billing/checkout` keeps working for Stripe — this
 * abstraction layers on top through `/api/payments/checkout` and routes
 * to the same Stripe helper internally.
 */

export type PaymentProviderId =
  | "stripe"
  | "paddle"
  | "lemon_squeezy"
  | "shopier"
  | "iyzico"
  | "paytr"
  | "manual_payment_link"
  | "crypto_manual"
  | "local_manual"
  | "stub";

export type PaymentMode =
  | "stripe_checkout"
  | "paddle_checkout"
  | "lemon_squeezy_checkout"
  | "shopier_payment_link"
  | "iyzico_payment_link"
  | "paytr_payment_link"
  | "manual_payment_link"
  | "crypto_manual_invoice"
  | "local_bank_transfer_manual"
  | "stub_dev_override";

export type PaymentStatus =
  | "pending"
  | "submitted"
  | "verified"
  | "rejected"
  | "expired"
  | "cancelled";

export type PaymentPlanKey =
  | "pro_monthly"
  | "pro_annual"
  | "team_monthly"
  | "team_annual"
  | "founder_lifetime";

/**
 * Optional capabilities a provider can advertise alongside its base
 * info. Today only `stripeLink` is meaningful — Link by Stripe is an
 * accelerated checkout layer *inside* Stripe, not a separate provider.
 */
export interface ProviderCapabilities {
  /** Stripe Link autofill enabled (STRIPE_LINK_ENABLED=true + Stripe configured). */
  stripeLink?: boolean;
}

export interface ProviderInfo {
  id: PaymentProviderId;
  label: string;
  description: string;
  /** Whether the provider has the env it needs to actually transact. */
  enabled: boolean;
  /** Plans the provider can accept (filtered by env price-id presence). */
  plans: PaymentPlanKey[];
  /** Modes the UI should expect (redirect / manual / dev). */
  modes: PaymentMode[];
  /** True for manual flows (crypto / local bank / local link without callback). */
  manualVerification: boolean;
  /** Disabled when sold out or otherwise unavailable, with a reason. */
  unavailableReason?: string;
  /** Optional capability flags (e.g. Stripe Link). */
  capabilities?: ProviderCapabilities;
}

export interface ManualInstructions {
  /** Network identifier; e.g. `usdt-trc20`. */
  network?: string;
  /** Human-readable network label; e.g. "USDT · TRC-20 (Tron)". */
  networkLabel?: string;
  /** Strict-network warning surfaced near the address. */
  networkWarning?: string;
  /** Public receiving address (or bank account / IBAN). */
  address?: string;
  amount?: { value: number; currency: string };
  /** Short user-visible reference; rendered as `OC-…`. */
  reference: string;
  expiresAt?: number;
  /** Bullet list shown above the "I sent the payment" form. */
  notes: string[];
  /** Where the UI POSTs the tx hash / receipt note. */
  submissionUrl: string;
}

export interface PaymentCheckoutResult {
  ok: boolean;
  paymentId?: string;
  provider?: PaymentProviderId;
  mode?: PaymentMode;
  /** Redirect targets (Stripe / Paddle / Lemon). */
  redirectUrl?: string;
  /** Manual flows (crypto, local bank). */
  manualInstructions?: ManualInstructions;
  /** Normalized error envelope. */
  code?: string;
  message?: string;
}

export interface PaymentRecord {
  /** Internal id. Format: `pay_<48 hex>`. */
  id: string;
  /** Short user-visible reference: `OC-XXXXXX`. */
  reference: string;
  provider: PaymentProviderId;
  mode: PaymentMode;
  status: PaymentStatus;
  plan: PaymentPlanKey;
  identityKey: string;
  email?: string;
  amount?: { value: number; currency: string };
  /** Crypto-only metadata. */
  crypto?: {
    network: string;
    address: string;
    /** Submitted by the user. */
    txHash?: string;
    /** Redacted free-form note from the user. */
    txNote?: string;
  };
  /** Foreign-provider ids (Stripe checkout session, Paddle / Lemon order). */
  external?: {
    sessionId?: string;
    eventId?: string;
  };
  createdAt: number;
  updatedAt: number;
  /** Filled when an admin verifies the payment. */
  verifiedAt?: number;
  verifiedBy?: string;
  rejectedAt?: number;
  rejectedReason?: string;
}

export interface CreateCheckoutInput {
  plan: PaymentPlanKey;
  identityKey: string;
  email?: string;
  /** Override the success URL. Defaults to `${APP_URL}/app?billing=success`. */
  successUrl?: string;
  cancelUrl?: string;
  /** For crypto: caller-supplied network (e.g. `usdt-trc20`). Optional. */
  cryptoNetwork?: string;
}

export interface PaymentProvider {
  id: PaymentProviderId;
  info(): ProviderInfo;
  createCheckout(input: CreateCheckoutInput): Promise<PaymentCheckoutResult>;
}

export function isPaymentPlanKey(value: unknown): value is PaymentPlanKey {
  return (
    value === "pro_monthly" ||
    value === "pro_annual" ||
    value === "team_monthly" ||
    value === "team_annual" ||
    value === "founder_lifetime"
  );
}

export function isPaymentProviderId(value: unknown): value is PaymentProviderId {
  return (
    value === "stripe" ||
    value === "paddle" ||
    value === "lemon_squeezy" ||
    value === "shopier" ||
    value === "iyzico" ||
    value === "paytr" ||
    value === "manual_payment_link" ||
    value === "crypto_manual" ||
    value === "local_manual" ||
    value === "stub"
  );
}

/** True for providers whose payments require an admin verify before
 *  the plan is granted (no auto-grant on unsigned events). */
export function isManualVerificationProvider(id: PaymentProviderId): boolean {
  return (
    id === "crypto_manual" ||
    id === "local_manual" ||
    id === "shopier" ||
    id === "iyzico" ||
    id === "paytr" ||
    id === "manual_payment_link"
  );
}

/** Public projection — what /api/payments/[id] returns to non-admin callers. */
export interface PublicPaymentView {
  id: string;
  reference: string;
  provider: PaymentProviderId;
  mode: PaymentMode;
  status: PaymentStatus;
  plan: PaymentPlanKey;
  amount?: PaymentRecord["amount"];
  crypto?: {
    network: string;
    address: string;
    /** Hash is echoed back so the user can verify what they submitted. */
    txHash?: string;
  };
  createdAt: number;
  updatedAt: number;
  verifiedAt?: number;
  rejectedAt?: number;
  rejectedReason?: string;
}

export function toPublicPayment(record: PaymentRecord): PublicPaymentView {
  return {
    id: record.id,
    reference: record.reference,
    provider: record.provider,
    mode: record.mode,
    status: record.status,
    plan: record.plan,
    amount: record.amount,
    crypto: record.crypto
      ? {
          network: record.crypto.network,
          address: record.crypto.address,
          txHash: record.crypto.txHash
        }
      : undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    verifiedAt: record.verifiedAt,
    rejectedAt: record.rejectedAt,
    rejectedReason: record.rejectedReason
  };
}
