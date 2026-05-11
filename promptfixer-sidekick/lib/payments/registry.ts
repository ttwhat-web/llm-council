/**
 * Provider registry — the single entry point for the unified payments
 * surface. Routes call `listProviders()` to surface availability and
 * `getProvider(id)` to dispatch a checkout.
 *
 * Adding a new provider is a single import + push into REGISTRY. The
 * UpgradeModal renders whatever the registry says is enabled.
 */

import { createCryptoManualProvider } from "./providers/crypto-manual";
import { createLemonSqueezyProvider } from "./providers/lemon-squeezy";
import { createLocalManualProvider } from "./providers/local-manual";
import { createPaddleProvider } from "./providers/paddle";
import { createStripeProvider } from "./providers/stripe";
import { createStubProvider } from "./providers/stub";
import type {
  PaymentProvider,
  PaymentProviderId,
  ProviderInfo
} from "./types";

let CACHED: PaymentProvider[] | null = null;

function buildRegistry(): PaymentProvider[] {
  return [
    createStripeProvider(),
    createPaddleProvider(),
    createLemonSqueezyProvider(),
    createCryptoManualProvider(),
    createLocalManualProvider(),
    createStubProvider()
  ];
}

function registry(): PaymentProvider[] {
  if (!CACHED) CACHED = buildRegistry();
  return CACHED;
}

export function listProviders(): PaymentProvider[] {
  return registry().slice();
}

export function listProviderInfo(): ProviderInfo[] {
  return registry().map((p) => p.info());
}

export function getProvider(id: PaymentProviderId): PaymentProvider | null {
  return registry().find((p) => p.id === id) ?? null;
}

/** Test hook. */
export function __resetPaymentRegistry(): void {
  CACHED = null;
}
