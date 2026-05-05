/**
 * User-facing model quality selector.
 *
 * Raw provider model identifiers are NEVER exposed to normal users — the UI
 * shows "Fast / Smart / Expert / Code / Local" and this module resolves the
 * actual model id server-side.
 *
 * Engine routing is also derived from quality:
 *   local                        → ollama (strict; falls to deterministic)
 *   fast / smart / expert / code → cloud  (or deterministic if cloud is down)
 *
 * Pricing tier (set later by auth/billing): Free can pick fast + local;
 * Pro can pick everything. v1 doesn't enforce — the pricing copy on the
 * landing page calls it out and the badge is rendered accordingly.
 */

import type { Engine, ModelQuality, Tier } from "./types";

export interface QualityProfile {
  id: ModelQuality;
  label: string;
  blurb: string;
  /** Routing decision derived from the quality choice. */
  engine: Engine;
  /** Required pricing tier (informational — not enforced in v1). */
  requiresTier: Tier;
  /** Internal-only model resolution, per cloud vendor. */
  models: { anthropic: string; openai: string };
}

const ANTHROPIC_HAIKU = "claude-haiku-4-5-20251001";
const ANTHROPIC_SONNET = "claude-sonnet-4-6";
const ANTHROPIC_OPUS = "claude-opus-4-7";
const OPENAI_MINI = "gpt-4o-mini";
const OPENAI_FULL = "gpt-4o";

export const QUALITY: Record<ModelQuality, QualityProfile> = {
  fast: {
    id: "fast",
    label: "Fast",
    blurb: "Quick answers. Good enough for cleanup, drafts, simple rewrites.",
    engine: "cloud",
    requiresTier: "free",
    models: { anthropic: ANTHROPIC_HAIKU, openai: OPENAI_MINI }
  },
  smart: {
    id: "smart",
    label: "Smart",
    blurb: "Stronger general reasoning. The right default for most prompts.",
    engine: "cloud",
    requiresTier: "pro",
    models: { anthropic: ANTHROPIC_SONNET, openai: OPENAI_FULL }
  },
  expert: {
    id: "expert",
    label: "Expert",
    blurb: "Highest-quality model. Use it when correctness matters.",
    engine: "cloud",
    requiresTier: "pro",
    models: { anthropic: ANTHROPIC_OPUS, openai: OPENAI_FULL }
  },
  code: {
    id: "code",
    label: "Code",
    blurb: "Tuned for refactors, diffs, and IDE-style edits.",
    engine: "cloud",
    requiresTier: "pro",
    models: { anthropic: ANTHROPIC_SONNET, openai: OPENAI_FULL }
  },
  local: {
    id: "local",
    label: "Local",
    blurb: "Runs on your own Mac via Ollama. Private and unlimited.",
    engine: "ollama",
    requiresTier: "free",
    models: { anthropic: "", openai: "" }
  }
};

export const QUALITY_LIST: QualityProfile[] = Object.values(QUALITY);

export function isModelQuality(value: unknown): value is ModelQuality {
  return typeof value === "string" && value in QUALITY;
}

export function getQuality(quality?: ModelQuality): QualityProfile {
  if (quality && quality in QUALITY) return QUALITY[quality];
  return QUALITY.fast;
}

/**
 * Resolve the cloud model id for a (quality, vendor) pair. Returns "" when
 * the quality isn't a cloud quality (e.g. "local"); callers should fall back
 * to the vendor's tier default in that case.
 */
export function modelIdFor(quality: ModelQuality, vendor: "anthropic" | "openai"): string {
  return QUALITY[quality]?.models[vendor] || "";
}
