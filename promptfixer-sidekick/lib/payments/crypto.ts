/**
 * Crypto payment configuration.
 *
 * Reads only PUBLIC receiving addresses from env. We never store, derive
 * or generate private keys server-side; the only crypto material that
 * touches this codebase is the deposit address operator.center publishes
 * to the user.
 *
 * Networks supported:
 *   - BTC (mainnet)
 *   - USDT TRC-20 (Tron)
 *   - USDT ERC-20 (Ethereum)
 *   - USDC ERC-20 (Ethereum)
 *   - SOL (Solana, optional)
 *
 * Each entry has a strict-network warning the UI MUST render alongside
 * the address. Sending the wrong asset on the wrong chain commonly
 * results in permanent loss, and that's on the user — but we make the
 * warning unmissable.
 */

import type { PaymentPlanKey } from "./types";

export type CryptoNetworkId =
  | "btc"
  | "usdt-trc20"
  | "usdt-erc20"
  | "usdc-erc20"
  | "sol";

export interface CryptoNetwork {
  id: CryptoNetworkId;
  label: string;
  asset: string;
  /** Address present in env. Empty when not configured. */
  address: string;
  enabled: boolean;
  /** Mandatory network-mismatch warning shown next to the address. */
  warning: string;
  /** Approximate confirmation expectation surfaced in the UI. */
  confirmationHint: string;
}

export interface CryptoConfig {
  /** Master env flag. */
  enabled: boolean;
  networks: CryptoNetwork[];
}

function env(name: string): string {
  return (process.env[name] || "").trim();
}

export function cryptoConfig(): CryptoConfig {
  const masterEnabled =
    (process.env.ENABLE_CRYPTO_PAYMENTS || "").toLowerCase() === "true";

  const raw: CryptoNetwork[] = [
    {
      id: "btc",
      label: "Bitcoin · BTC",
      asset: "BTC",
      address: env("CRYPTO_BTC_ADDRESS"),
      enabled: false,
      warning:
        "Send BTC on the Bitcoin mainnet only. Lightning and wrapped-BTC will be lost.",
      confirmationHint: "Typical confirmation: 10–60 minutes."
    },
    {
      id: "usdt-trc20",
      label: "USDT · TRC-20 (Tron)",
      asset: "USDT",
      address: env("CRYPTO_USDT_TRC20_ADDRESS"),
      enabled: false,
      warning:
        "Send only TRC-20 USDT on the Tron network. ERC-20 or BEP-20 USDT will be permanently lost.",
      confirmationHint: "Typical confirmation: < 1 minute."
    },
    {
      id: "usdt-erc20",
      label: "USDT · ERC-20 (Ethereum)",
      asset: "USDT",
      address: env("CRYPTO_USDT_ERC20_ADDRESS"),
      enabled: false,
      warning:
        "Send only ERC-20 USDT on Ethereum mainnet. TRC-20 or BEP-20 USDT will be permanently lost.",
      confirmationHint: "Typical confirmation: 1–5 minutes."
    },
    {
      id: "usdc-erc20",
      label: "USDC · ERC-20 (Ethereum)",
      asset: "USDC",
      address: env("CRYPTO_USDC_ERC20_ADDRESS"),
      enabled: false,
      warning:
        "Send only ERC-20 USDC on Ethereum mainnet. Other chains will be lost.",
      confirmationHint: "Typical confirmation: 1–5 minutes."
    },
    {
      id: "sol",
      label: "Solana · SOL / USDC-SOL",
      asset: "SOL",
      address: env("CRYPTO_SOL_ADDRESS"),
      enabled: false,
      warning: "Send only on the Solana mainnet. Cross-chain sends will be lost.",
      confirmationHint: "Typical confirmation: < 30 seconds."
    }
  ];

  const networks = raw.map((n) => ({
    ...n,
    enabled: masterEnabled && n.address.length > 0
  }));

  return {
    enabled: masterEnabled && networks.some((n) => n.enabled),
    networks
  };
}

export function getNetwork(id: string): CryptoNetwork | null {
  return cryptoConfig().networks.find((n) => n.id === id) ?? null;
}

/**
 * Suggest amounts shown to the user. We don't quote live FX here; the
 * authoritative invoice is the USD price + a short note that the user
 * should wire "equivalent value at the time of send". An admin
 * verifies the actual amount before granting the plan.
 */
export interface PlanPriceHint {
  usd: number;
  label: string;
}

export function priceHintFor(plan: PaymentPlanKey): PlanPriceHint {
  switch (plan) {
    case "pro_monthly":
      return { usd: 19, label: "$19 / month" };
    case "pro_annual":
      return { usd: 190, label: "$190 / year (2 months free)" };
    case "team_monthly":
      return { usd: 39, label: "$39 / seat / month" };
    case "team_annual":
      return { usd: 390, label: "$390 / seat / year" };
    case "founder_lifetime":
      return { usd: 99, label: "$99 one-time · Pro for life" };
  }
}
