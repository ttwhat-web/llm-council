/**
 * Top-level pipeline orchestrator.
 *
 * Phase-2 refactor: `fixPrompt` delegates to the typed Stage<R> pipeline
 * in `lib/pipeline/prompt-fixer-stages.ts`. Behaviour is byte-identical
 * with the previous implementation; the response gains an optional
 * `events: StageEvent[]` array the Mission Control HUD consumes for
 * real per-stage telemetry.
 *
 * Routing summary (handled inside the pipeline):
 *   web / mobile auto:                     cloud → deterministic
 *   desktop      auto:                     ollama → cloud → deterministic
 *   explicit ollama:                       ollama → deterministic            (STRICT — never cloud)
 *   explicit ollama + allowCloudFallback:  ollama → cloud → deterministic
 *   explicit cloud:                        cloud → deterministic
 *   explicit rules:                        deterministic
 *
 * Cloud calls are metered. Ollama and deterministic are never metered.
 */

import { runPromptFixerPipeline } from "./pipeline/prompt-fixer-stages";
import type { FixRequest, FixResponse, Tier, UsageSnapshot } from "./types";

interface FixOptions {
  tier?: Tier;
  usage?: UsageSnapshot;
}

export async function fixPrompt(
  req: FixRequest,
  options: FixOptions = {}
): Promise<FixResponse> {
  const { response } = await runPromptFixerPipeline(req, options);
  return response;
}
