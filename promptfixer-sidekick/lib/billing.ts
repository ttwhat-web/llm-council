/**
 * Local-only billing simulation.
 *
 * Phase-3 stand-in for Stripe / Paddle: a localStorage-backed daily
 * counter + a tier flag that can be flipped to "pro" via the in-app
 * "Enable Pro Preview" dev toggle. No network, no payments.
 *
 * Server-side metering in lib/usage.ts is unchanged — that is the real
 * gate when we wire payments. This module only drives the *client* UI:
 *   - Usage chip in the header
 *   - Upgrade modal when the free quota is hit
 *   - Disabling the primary Fix button when at limit
 *
 * Storage layout (localStorage):
 *   pf.billing.v1.tier   = "free" | "pro"
 *   pf.billing.v1.usage  = { "<YYYY-MM-DD>": <count> }   (other days dropped)
 */

"use client";

export type BillingTier = "free" | "pro";

export interface BillingSnapshot {
  tier: BillingTier;
  /** Today's local-time count of billable client actions. */
  used: number;
  /** 0 means "unlimited" (pro). */
  limit: number;
  /** Math.max(0, limit - used) for free; Infinity for pro (rendered as "—"). */
  remaining: number;
  /** YYYY-MM-DD this counter is bound to (local time). */
  day: string;
  /** Convenience: free + used >= limit. Always false for pro. */
  atLimit: boolean;
}

export const FREE_DAILY_LIMIT_LOCAL = 10;

const KEY_TIER = "pf.billing.v1.tier";
const KEY_USAGE = "pf.billing.v1.usage";

function todayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function loadTier(): BillingTier {
  if (typeof window === "undefined") return "free";
  try {
    const raw = window.localStorage.getItem(KEY_TIER);
    return raw === "pro" ? "pro" : "free";
  } catch {
    return "free";
  }
}

export function saveTier(tier: BillingTier): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_TIER, tier);
  } catch {
    /* quota — ignore */
  }
}

function loadUsageMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY_USAGE);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

function saveUsageMap(map: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_USAGE, JSON.stringify(map));
  } catch {
    /* quota — ignore */
  }
}

/**
 * Read the current billing snapshot. Pure read; never mutates the count.
 */
export function readBilling(): BillingSnapshot {
  const tier = loadTier();
  const day = todayKey();
  const map = loadUsageMap();
  const used = Math.max(0, Number(map[day] || 0));
  if (tier === "pro") {
    return {
      tier,
      used,
      limit: 0,
      remaining: Number.POSITIVE_INFINITY,
      day,
      atLimit: false
    };
  }
  const limit = FREE_DAILY_LIMIT_LOCAL;
  return {
    tier,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    day,
    atLimit: used >= limit
  };
}

/**
 * Increment today's billable count and return the new snapshot. Pro
 * still increments — it's useful telemetry and lets us show "today's
 * runs" even on Pro — but `atLimit` stays false.
 *
 * Drops other days from the map so it doesn't grow unbounded.
 */
export function incrementBilling(): BillingSnapshot {
  const day = todayKey();
  const next: Record<string, number> = {};
  next[day] = (loadUsageMap()[day] || 0) + 1;
  saveUsageMap(next);
  return readBilling();
}

/**
 * Public, copy-ready feature lists. Source of truth for the UpgradeModal
 * card — keep in sync with components/Pricing.tsx when the legal /
 * marketing copy is finalised.
 */
export const BILLING_PLANS: Array<{
  id: BillingTier | "team";
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
}> = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    features: [
      "Local rules engine — unlimited",
      "10 cloud missions / day once connected",
      "Mission Archive — local",
      "Basic templates"
    ]
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19 / mo",
    highlight: true,
    features: [
      "Unlimited cloud missions",
      "Advanced exports + Architect",
      "Memory connectors (Obsidian + GitHub, rolling out)",
      "Local Ollama profiles",
      "Mission Alerts"
    ]
  },
  {
    id: "team",
    name: "Operator",
    price: "$39 / seat / mo",
    features: [
      "Everything in Pro",
      "Terminal workspace",
      "Agent actions",
      "Repo + market intelligence",
      "Scheduled missions",
      "Advanced telemetry",
      "Priority support"
    ]
  }
];
