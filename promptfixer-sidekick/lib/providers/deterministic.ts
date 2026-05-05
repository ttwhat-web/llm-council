/**
 * Deterministic "provider". No LLM call — used as the universal fallback.
 * The deterministic engine in lib/engine.ts has already produced the rendered
 * prompt by the time this is asked to generate, so generate() is a no-op
 * sentinel: callers know to skip the supervisor pass when this is selected.
 */

import type { ProviderHealth, ProviderResult } from "../types";
import type { GenerateOptions, Provider } from "./types";

export const deterministicProvider: Provider = {
  id: "deterministic",
  label: "Rules Only",

  isConfigured() {
    return true;
  },

  async health(): Promise<ProviderHealth> {
    return {
      id: "cloud",
      configured: true,
      reachable: true,
      model: "rules-only"
    };
  },

  async generate(_prompt: string, _options?: GenerateOptions): Promise<ProviderResult> {
    return {
      ok: true,
      providerId: "deterministic",
      model: "rules-only",
      content: "",
      latencyMs: 0
    };
  }
};
