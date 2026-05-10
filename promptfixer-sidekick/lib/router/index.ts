/**
 * MultiModelRouter — the typed surface above lib/providers + lib/quality.
 *
 * The existing `route()` (lib/providers/index.ts) already does the heavy
 * lifting: it resolves engine + clientContext + allowCloudFallback into
 * a concrete provider. This module wraps that with a *task-bias* layer
 * so a Skill can say "I'm doing code work, prefer Sonnet" or "I want
 * long context, skip Haiku" without re-implementing the provider logic.
 *
 *   coding         → Claude Sonnet / OpenAI gpt-4o
 *   research       → Gemini / Claude Opus
 *   long-context   → Claude Sonnet / Opus
 *   fast / cleanup → Haiku / 4o-mini
 *   reasoning      → Opus
 *   low-cost       → Kimi (planned — see PROMPTOS.md)
 *
 * The router is advisory: it picks a `quality` tier the existing
 * provider stack already understands (`fast | smart | expert | code |
 * local`). No new wiring downstream.
 */

import { resolveCloudModel, resolveOllamaModel } from "../quality";
import type { ClientContext, Engine, ModelQuality } from "../types";

export type TaskBias =
  | "code"
  | "research"
  | "long-context"
  | "reasoning"
  | "fast"
  | "low-cost";

export interface RouteRequest {
  bias?: TaskBias[];
  /** Caller's explicit quality preference (wins if set). */
  forceQuality?: ModelQuality;
  /** Caller's explicit engine pin (wins if set). */
  forceEngine?: Engine;
  clientContext: ClientContext;
  allowCloudFallback?: boolean;
}

export interface RouteDecision {
  quality: ModelQuality;
  engine: Engine;
  /** Vendor-specific model id the cloud provider will use. */
  cloudModel?: string;
  /** Specific Ollama model id if the local engine is preferred. */
  ollamaModel?: string;
  /** Why we picked this combination — surfaced in the trace. */
  reason: string;
}

export function routeForTask(req: RouteRequest): RouteDecision {
  const quality = req.forceQuality ?? pickQualityForBias(req.bias);
  const engine = req.forceEngine ?? defaultEngineForQuality(quality);

  return {
    quality,
    engine,
    cloudModel: resolveCloudModel(quality),
    ollamaModel: resolveOllamaModel(quality),
    reason: req.forceQuality
      ? `forced quality=${quality}`
      : req.bias?.length
        ? `bias=[${req.bias.join(",")}] → quality=${quality}`
        : `default quality=${quality}`
  };
}

function pickQualityForBias(bias: TaskBias[] | undefined): ModelQuality {
  if (!bias?.length) return "smart";
  if (bias.includes("code")) return "code";
  if (bias.includes("reasoning") || bias.includes("research")) return "expert";
  if (bias.includes("long-context")) return "smart";
  if (bias.includes("fast") || bias.includes("low-cost")) return "fast";
  return "smart";
}

function defaultEngineForQuality(q: ModelQuality): Engine {
  return q === "local" ? "ollama" : "cloud";
}
