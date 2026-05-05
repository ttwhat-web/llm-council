/**
 * Top-level pipeline orchestrator.
 *
 * INPUT
 *   -> cleaner.ts          (strip noise)
 *   -> mode detection      (auto if requested)
 *   -> engine.ts           (build deterministic prompt sections)
 *   -> safety.ts           (terminal-mode danger screen)
 *   -> controller.ts       (optional Gemma supervisor pass)
 * OUTPUT
 */

import { cleanInput } from "./cleaner";
import { buildSections, detectMode, renderPrompt } from "./engine";
import { runSupervisor } from "./controller";
import { screenForDanger } from "./safety";
import type { FixRequest, FixResponse } from "./types";

export async function fixPrompt(req: FixRequest): Promise<FixResponse> {
  const t0 = Date.now();
  const { cleaned, removed: _removed } = cleanInput(req.input || "");

  const detected = req.autoMode ? detectMode(cleaned) : undefined;
  const mode = req.mode || detected || "general";

  const draft = buildSections({ cleanedInput: cleaned, mode });

  const supervisor = req.useLocalAI
    ? await runSupervisor({ sections: draft, mode, rawInput: cleaned })
    : { used: false };

  const finalSections = supervisor.improved || draft;
  const renderedRaw = renderPrompt(finalSections, mode);

  const safety =
    mode === "terminal" ? screenForDanger(renderedRaw) : { blocked: false, requiresConfirmation: false, findings: [] };

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
    elapsedMs: Date.now() - t0
  };
}
