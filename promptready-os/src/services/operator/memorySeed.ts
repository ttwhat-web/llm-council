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

/**
 * The shape of editable founder memory. Every field is optional;
 * empty memory means Operator stays generic.
 *
 * Stored locally in the user memory store (operatorMemory). Demo
 * mode loads DEMO_FOUNDER_SEED into this same shape when ?demo=1.
 */
export interface FounderMemory {
  firstName?: string;
  fullName?: string;
  preferredLanguage?: string;
  tonePreference?: string;
  companies: string[];
  keyCustomers: string[];
  projects: string[];
  importantMarkets: string[];
  communicationRules: string;
  rememberThese: string;
  avoidThese: string;
}

export const EMPTY_MEMORY: FounderMemory = {
  firstName: undefined,
  fullName: undefined,
  preferredLanguage: undefined,
  tonePreference: undefined,
  companies: [],
  keyCustomers: [],
  projects: [],
  importantMarkets: [],
  communicationRules: "",
  rememberThese: "",
  avoidThese: ""
};

/** True when memory contains at least one usable field. */
export function isMemoryPopulated(m: FounderMemory): boolean {
  if (m.firstName?.trim()) return true;
  if (m.fullName?.trim()) return true;
  if (m.preferredLanguage?.trim()) return true;
  if (m.tonePreference?.trim()) return true;
  if (m.companies.length > 0) return true;
  if (m.keyCustomers.length > 0) return true;
  if (m.projects.length > 0) return true;
  if (m.importantMarkets.length > 0) return true;
  if (m.communicationRules.trim()) return true;
  if (m.rememberThese.trim()) return true;
  if (m.avoidThese.trim()) return true;
  return false;
}

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

/**
 * Render the editable FounderMemory as a profile block for AI calls.
 * Returns "" when memory is empty so the prompt stays clean.
 */
export function renderMemoryForPrompt(m: FounderMemory | null): string {
  if (!m || !isMemoryPopulated(m)) return "";
  const lines: string[] = ["Founder profile (from memory):"];
  if (m.firstName?.trim()) {
    lines.push(`  Name: ${m.firstName.trim()}${m.fullName?.trim() ? ` (${m.fullName.trim()})` : ""}`);
  }
  if (m.preferredLanguage?.trim()) {
    lines.push(`  Preferred language: ${m.preferredLanguage.trim()}`);
  }
  if (m.tonePreference?.trim()) {
    lines.push(`  Tone preference: ${m.tonePreference.trim()}`);
  }
  if (m.companies.length > 0) {
    lines.push(`  Companies: ${m.companies.join(", ")}`);
  }
  if (m.keyCustomers.length > 0) {
    lines.push(`  Key customers: ${m.keyCustomers.join(", ")}`);
  }
  if (m.projects.length > 0) {
    lines.push(`  Projects: ${m.projects.join(", ")}`);
  }
  if (m.importantMarkets.length > 0) {
    lines.push(`  Important markets: ${m.importantMarkets.join(", ")}`);
  }
  if (m.communicationRules.trim()) {
    lines.push(`  Communication rules: ${m.communicationRules.trim()}`);
  }
  if (m.rememberThese.trim()) {
    lines.push(`  Remember: ${m.rememberThese.trim()}`);
  }
  if (m.avoidThese.trim()) {
    lines.push(`  Avoid: ${m.avoidThese.trim()}`);
  }
  return lines.join("\n");
}
