/**
 * Top-level pipeline orchestrator.
 *
 * Two paths:
 *
 *   1. Fresh fix (req.action absent)
 *      INPUT
 *        → cleaner.ts          (strip noise)
 *        → mode detection      (auto if requested)
 *        → engine.ts           (build deterministic prompt sections)
 *        → providers/index.ts  (route by quality + clientContext)
 *        → controller.runSupervisor (JSON-contract review; deterministic skips it)
 *        → safety.ts           (terminal-mode danger screen)
 *        → score.ts            (4-axis card)
 *      OUTPUT
 *
 *   2. Output transform (req.action set, req.previousSections required)
 *      Reuses the previous sections, runs controller.runTransform, then
 *      flows through safety + score. Cleaner + engine are skipped.
 *
 * Quality drives both engine choice and the cloud model id. Local quality
 * routes to Ollama (strict by default); fast/smart/expert/code route to cloud.
 *
 * Cloud calls are metered. Ollama and deterministic are never metered.
 */

import { ACTIONS } from "./actions";
import { cleanInput } from "./cleaner";
import { buildSections, detectMode, renderPrompt } from "./engine";
import { runSupervisor, runTransform } from "./controller";
import { route } from "./providers";
import { getQuality, modelIdFor } from "./quality";
import { screenForDanger } from "./safety";
import { scorePrompt } from "./score";
import type {
  ClientContext,
  Engine,
  FixRequest,
  FixResponse,
  ModelQuality,
  Tier,
  UsageSnapshot
} from "./types";

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
  const clientContext: ClientContext = req.clientContext ?? "web";
  const modelQuality: ModelQuality = req.modelQuality ?? "fast";
  const qualityProfile = getQuality(modelQuality);

  // Quality drives engine when the caller didn't already pin one explicitly.
  const engine: Engine | undefined = req.engine ?? qualityProfile.engine;
  const allowCloudFallback = Boolean(req.allowCloudFallback);

  const isTransform = Boolean(req.action) && Boolean(req.previousSections);

  // ---- choose mode + sections ----
  let cleaned: string;
  let detected: ReturnType<typeof detectMode> | undefined;
  let mode: FixResponse["mode"];
  let draft: ReturnType<typeof buildSections>;

  if (isTransform) {
    // Action transforms reuse the prior sections; bypass cleaner + engine.
    cleaned = "";
    const def = ACTIONS[req.action!];
    mode = def.modeOverride ?? req.mode ?? "general";
    draft = req.previousSections!;
  } else {
    cleaned = cleanInput(req.input || "").cleaned;
    detected = req.autoMode ? detectMode(cleaned) : undefined;
    mode = req.mode || detected || "general";
    draft = buildSections({ cleanedInput: cleaned, mode });
  }

  // ---- route to a provider ----
  const routed = route(engine, clientContext, { allowCloudFallback });
  const modelOverride = routed.resolved === "cloud" ? resolveCloudModel(modelQuality) : undefined;

  // ---- supervisor / transform ----
  const supervisor = isTransform
    ? await runTransform({
        provider: routed.provider,
        requestedEngine: routed.requested,
        resolvedEngine: routed.resolved,
        clientContext,
        allowCloudFallback: routed.allowCloudFallback,
        fallbackUsed: routed.fallbackUsed,
        sections: draft,
        mode,
        tier,
        modelOverride,
        action: req.action!
      })
    : await runSupervisor({
        provider: routed.provider,
        requestedEngine: routed.requested,
        resolvedEngine: routed.resolved,
        clientContext,
        allowCloudFallback: routed.allowCloudFallback,
        fallbackUsed: routed.fallbackUsed,
        sections: draft,
        mode,
        tier,
        modelOverride,
        rawInput: cleaned
      });

  const finalSections = supervisor.improved || draft;
  const renderedRaw = renderPrompt(finalSections, mode);

  const safety =
    mode === "terminal"
      ? screenForDanger(renderedRaw)
      : { blocked: false, requiresConfirmation: false, findings: [] };

  const renderedFinal = safety.rewritten || renderedRaw;
  const score = scorePrompt(renderedFinal, finalSections, mode, safety);

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
    score,
    modelQuality,
    action: req.action,
    elapsedMs: Date.now() - t0
  };
}

/**
 * Map a user-facing quality to a vendor-specific cloud model id.
 *
 * The cloud provider picks vendor by which API key is set; we can't know
 * here without re-reading env. So we return the Anthropic id; the cloud
 * provider transparently uses it for Anthropic and falls back to its own
 * tier default for OpenAI when this id isn't a valid OpenAI model.
 *
 * The cleaner architecture (provider-aware quality lookup) lives in
 * lib/quality.ts → modelIdFor; we re-use it inside cloud.ts via the
 * options.model override.
 */
function resolveCloudModel(quality: ModelQuality): string | undefined {
  // Prefer Anthropic id when ANTHROPIC_API_KEY is configured; otherwise
  // OpenAI id. The cloud provider checks env to decide vendor — replicate
  // that here so the model id matches the vendor it'll route to.
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  if (hasAnthropic) {
    const id = modelIdFor(quality, "anthropic");
    return id || undefined;
  }
  if (hasOpenAI) {
    const id = modelIdFor(quality, "openai");
    return id || undefined;
  }
  return undefined;
}
