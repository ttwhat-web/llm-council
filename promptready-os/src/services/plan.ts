/**
 * Access tiers · Sprint I (pricing).
 *
 * Feature gates only — NO payments, NO Stripe. Early/existing users stay
 * fully unlocked: the current plan defaults to "elite" (grandfathered) so
 * nothing is ever locked out. The tiers + badges are informational: they
 * label which surfaces belong to CORE / DESK / ELITE and power a Plans
 * card. `hasAccess()` is a soft gate that returns true for grandfathered
 * users; it exists so a real gate can be switched on later without
 * touching call sites.
 */

export type PlanTier = "core" | "desk" | "elite";

export interface PlanDef {
  id: PlanTier;
  badge: string;
  name: string;
  priceMonthly: string;
  priceYearly: string;
  target: string;
  includes: string[];
}

export const PLANS: PlanDef[] = [
  {
    id: "core",
    badge: "CORE",
    name: "Core",
    priceMonthly: "$29 / mo",
    priceYearly: "$249 / yr",
    target: "builders · AI users · power users · curious market users",
    includes: [
      "Atlas",
      "Voice Console",
      "Telegram Runtime",
      "Ollama Runtime",
      "Intelligence Terminal",
      "Basic Market Lab",
      "CoinGecko feeds",
      "News feeds",
      "Bot Runtime",
      "Search Runtime",
      "Mission System",
      "Paste Intelligence",
      "Replay basics",
      "Market summary widgets",
      "Small watchlists"
    ]
  },
  {
    id: "desk",
    badge: "DESK",
    name: "Desk",
    priceMonthly: "$169 / mo",
    priceYearly: "$1499 / yr (launch)",
    target: "serious users · founders · traders · operators",
    includes: [
      "Terminal Pro",
      "Market Intelligence Center (full)",
      "TV Market Mode",
      "Multi-Chart Matrix",
      "Heatmaps",
      "Macro Board",
      "Signal Wall",
      "AI Analyst Stack",
      "Advanced Watchlists",
      "Market Memory",
      "Replay Intelligence",
      "Projection Mode",
      "News Room Advanced",
      "Polymarket Research",
      "Atlas Market Layer",
      "Priority local model orchestration"
    ]
  },
  {
    id: "elite",
    badge: "ELITE",
    name: "Elite",
    priceMonthly: "$399 / mo",
    priceYearly: "$2999 / yr",
    target: "companies · agencies · funds · operations teams",
    includes: [
      "Everything in Desk",
      "Teams",
      "Shared Brain",
      "Company Memory",
      "Private Ollama",
      "Connector Packs",
      "Approval Flows",
      "Automation Layer",
      "Multi-Operator Runtime",
      "Shared Watchlists",
      "Role access",
      "Future deployment options"
    ]
  }
];

const ORDER: PlanTier[] = ["core", "desk", "elite"];
const KEY = "promptready-os.plan";

/**
 * Current plan. Defaults to "elite" so early-access users are never
 * locked out (feature gates only · no payments yet).
 */
export function getCurrentPlan(): PlanTier {
  if (typeof window === "undefined") return "elite";
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "core" || raw === "desk" || raw === "elite") return raw;
  } catch {
    // ignore
  }
  return "elite";
}

export function setCurrentPlan(tier: PlanTier): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, tier);
  } catch {
    // ignore
  }
}

/** Soft gate · true when the current plan meets/exceeds the required tier. */
export function hasAccess(required: PlanTier): boolean {
  return ORDER.indexOf(getCurrentPlan()) >= ORDER.indexOf(required);
}

export function planDef(tier: PlanTier): PlanDef {
  return PLANS.find((p) => p.id === tier)!;
}
