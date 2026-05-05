/**
 * Top-level pipeline orchestrator.
 *
 * INPUT
 *   → cleaner.ts          (strip noise)
 *   → mode detection      (auto if requested)
 *   → engine.ts           (build deterministic prompt sections)
 *   → providers/index.ts  (route to cloud / ollama / deterministic)
 *   → controller.ts       (supervisor pass — skipped for deterministic)
 *   → safety.ts           (terminal-mode danger screen)
 * OUTPUT
 *
 * Routing summary:
 *   user picks "Local Ollama" + OLLAMA_BASE_URL set → Ollama
 *   else cloud key set                              → Cloud
 *   else                                            → deterministic
 */

import { cleanInput } from "./cleaner";
import { buildSections, detectMode, renderPrompt } from "./engine";
import { runSupervisor } from "./controller";
import { route } from "./providers";
import { screenForDanger } from "./safety";
import type { FixRequest, FixResponse, Tier, UsageSnapshot } from "./types";

interface FixOptions {
  tier?: Tier;
  usage?: UsageSnapshot;
}

export async function fixPrompt(
  req: FixRequest,
  options: FixOptions = {}
): Promise<FixResponse> {
  const t0 = Date.now();
  const tier = options.tier ?? "free";

  const { cleaned } = cleanInput(req.input || "");
  const detected = req.autoMode ? detectMode(cleaned) : undefined;
  const mode = req.mode || detected || "general";

  const draft = buildSections({ cleanedInput: cleaned, mode });

  const routed = route(req.engine);
  const supervisor = await runSupervisor({
    provider: routed.provider,
    requestedEngine: routed.requested,
    resolvedEngine: routed.resolved,
    fallbackUsed: routed.fallbackUsed,
    sections: draft,
    mode,
    rawInput: cleaned,
    tier
  });

  const finalSections = supervisor.improved || draft;
  const renderedRaw = renderPrompt(finalSections, mode);

  const safety =
    mode === "terminal"
      ? screenForDanger(renderedRaw)
      : { blocked: false, requiresConfirmation: false, findings: [] };

  const renderedFinal = safety.rewritten || renderedRaw;

  return {
    ok: true,
    mode,
    detectedMode: detected,
    cleaned,
    prompt: renderedFinal,
    sections: finalSections,
    safety,
    supervisor,
    usage: options.usage,
    elapsedMs: Date.now() - t0
  };
}
