/**
 * Operator memory · dev/demo seed data.
 *
 * NEVER imported by services/operator/voice.ts and NEVER spliced into
 * the global Operator system prompt. This file exists only to
 * populate sample founder context for the demo experience (?demo=1)
 * and for local development.
 *
 * Real founder profiles live in the user memory store (per-account,
 * encrypted at rest later, never checked in to source). When that
 * store ships, the briefing / drafting layers will read from it and
 * — when present — splice a short "Founder profile" block into the
 * user message of each AI call. The global voice prompt stays
 * universal regardless.
 */

export interface FounderMemorySeed {
  firstName: string;
  fullName?: string;
  companies: string[];
  markets?: string[];
  customerSegments?: string[];
}

/**
 * Seed used by demo mode only. Loaders MUST gate on the demo flag.
 * Never pass this directly into the system prompt — it belongs in
 * the user-turn context, scoped to the call being made.
 */
export const DEMO_FOUNDER_SEED: FounderMemorySeed = {
  firstName: "Tunç",
  companies: [
    "Habitat VIP Travel",
    "Erguvan Turizm",
    "Avanos Halı",
    "Perge Jewels"
  ],
  markets: ["European luxury", "Tourism", "Carpets", "Jewelry"],
  customerSegments: ["Luxury customers", "AI products"]
};

/**
 * Render a founder profile block suitable for inclusion in the user
 * message of an Operator AI call. Returns "" when the seed is null
 * so callers can interpolate unconditionally without polluting the
 * prompt with placeholder text.
 */
export function renderFounderProfile(seed: FounderMemorySeed | null): string {
  if (!seed) return "";
  const lines: string[] = [];
  lines.push("Founder profile (from memory):");
  lines.push(`  Name: ${seed.firstName}${seed.fullName ? ` (${seed.fullName})` : ""}`);
  if (seed.companies.length > 0) {
    lines.push(`  Companies: ${seed.companies.join(", ")}`);
  }
  if (seed.markets && seed.markets.length > 0) {
    lines.push(`  Markets: ${seed.markets.join(", ")}`);
  }
  if (seed.customerSegments && seed.customerSegments.length > 0) {
    lines.push(`  Customer segments: ${seed.customerSegments.join(", ")}`);
  }
  return lines.join("\n");
}
