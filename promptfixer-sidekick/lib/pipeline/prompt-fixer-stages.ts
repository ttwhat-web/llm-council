/**
 * Prompt Fixer pipeline — the existing fixPrompt() flow recomposed as
 * six typed Stages emitting real events.
 *
 *   1. clean       — cleanInput()                  → cleaned text + stripped artefacts
 *   2. intent      — detectMode (when autoMode)    → resolved Mode
 *   3. structure   — buildSections()               → Role · Task · Context · Output Format
 *   4. constraints — surfaces the constraint set   → guardrails count + sample
 *   5. generate    — route + supervisor + render   → final prompt string
 *   6. validate    — safety + score + insights     → readiness score + safety status
 *
 * Each Stage emits a real StageEvent the Mission Control HUD consumes.
 * Existing Skill / Workflow / Agent surfaces see no behaviour change —
 * the FixResponse shape gains an optional `events` array but is otherwise
 * byte-identical to the prior fixPrompt return value.
 */

import { ACTIONS } from "../actions";
import { cleanInput } from "../cleaner";
import { runSupervisor, runTransform } from "../controller";
import { buildSections, detectMode, renderPrompt } from "../engine";
import { buildInsights } from "../insights";
import type { InsightReport } from "../insights";
import { route } from "../providers";
import type { RouteResult } from "../providers";
import { getQuality, resolveCloudModel, resolveOllamaModel } from "../quality";
import { screenForDanger } from "../safety";
import { scorePrompt } from "../score";
import type {
  ClientContext,
  Engine,
  FixRequest,
  FixResponse,
  Mode,
  ModelQuality,
  PromptSections,
  SafetyReport,
  ScoreCard,
  SupervisorReview,
  Tier,
  UsageSnapshot
} from "../types";
import { runPipeline, type Stage, type StageEvent } from "./types";

interface PromptFixerRun {
  // ---- inputs ----
  req: FixRequest;
  tier: Tier;
  usage?: UsageSnapshot;
  clientContext: ClientContext;
  modelQuality: ModelQuality;
  engine: Engine | undefined;
  allowCloudFallback: boolean;
  isTransform: boolean;

  // ---- intermediates ----
  cleaned: string;
  removed: string[];
  detected?: Mode;
  mode: Mode;
  draft: PromptSections;
  routed?: RouteResult;
  modelOverride?: string;
  supervisor?: SupervisorReview;
  finalSections?: PromptSections;
  renderedRaw?: string;
  safety?: SafetyReport;

  // ---- outputs (built up across stages) ----
  prompt?: string;
  score?: ScoreCard;
  insights?: InsightReport;
}

export interface PromptFixerOptions {
  tier?: Tier;
  usage?: UsageSnapshot;
}

// ============================================================================
// Stages
// ============================================================================

const cleanStage: Stage<PromptFixerRun> = {
  id: "clean",
  label: "Clean Input",
  description: "Strip noise, smart quotes, zero-width chars and filler.",
  async run({ run, emit }) {
    if (run.isTransform) {
      // No raw input to clean on a transform — synthesize the bypass event.
      emit({ stage: "clean", status: "complete", detail: "skipped (transform)" });
      return run;
    }
    const result = cleanInput(run.req.input || "");
    emit({
      stage: "clean",
      status: "complete",
      detail: result.removed.length
        ? `stripped ${result.removed.join(", ")}`
        : "input clean"
    });
    return { ...run, cleaned: result.cleaned, removed: result.removed };
  }
};

const intentStage: Stage<PromptFixerRun> = {
  id: "intent",
  label: "Detect Intent",
  description: "Resolve the prompt mode from input or caller override.",
  async run({ run, emit }) {
    if (run.isTransform) {
      const def = ACTIONS[run.req.action!];
      const mode = def.modeOverride ?? run.req.mode ?? "general";
      emit({ stage: "intent", status: "complete", detail: `mode=${mode} (from action)` });
      return { ...run, mode };
    }
    const detected = run.req.autoMode ? detectMode(run.cleaned) : undefined;
    const mode = run.req.mode || detected || "general";
    emit({
      stage: "intent",
      status: detected ? "complete" : "complete",
      detail: detected ? `auto → ${detected}` : `mode=${mode}`
    });
    return { ...run, detected, mode };
  }
};

const structureStage: Stage<PromptFixerRun> = {
  id: "structure",
  label: "Structure Prompt",
  description: "Build Role / Task / Context / Output Format sections.",
  async run({ run, emit }) {
    let draft: PromptSections;
    if (run.isTransform) {
      draft = run.req.previousSections!;
      emit({ stage: "structure", status: "complete", detail: "reused (transform)" });
    } else {
      draft = buildSections({ cleanedInput: run.cleaned, mode: run.mode });
      emit({
        stage: "structure",
        status: "complete",
        detail: `${draft.constraints.length} constraint${draft.constraints.length === 1 ? "" : "s"} drafted`
      });
    }
    return { ...run, draft };
  }
};

const constraintsStage: Stage<PromptFixerRun> = {
  id: "constraints",
  label: "Inject Constraints",
  description: "Surface mode-specific guardrails and output-format rules.",
  async run({ run, emit }) {
    const count = run.draft.constraints.length;
    emit({
      stage: "constraints",
      status: "complete",
      detail: `${count} constraint${count === 1 ? "" : "s"} active · output=${run.draft.outputFormat
        .split("\n")[0]
        .slice(0, 60)}`
    });
    return run;
  }
};

const generateStage: Stage<PromptFixerRun> = {
  id: "generate",
  label: "Generate Mission Output",
  description: "Route to a provider, run the supervisor, render the final prompt.",
  async run({ run, emit }) {
    const routed = route(run.engine, run.clientContext, {
      allowCloudFallback: run.allowCloudFallback
    });
    const modelOverride =
      routed.resolved === "cloud"
        ? resolveCloudModel(run.modelQuality)
        : routed.resolved === "ollama"
          ? resolveOllamaModel(run.modelQuality)
          : undefined;

    const supervisor = run.isTransform
      ? await runTransform({
          provider: routed.provider,
          requestedEngine: routed.requested,
          resolvedEngine: routed.resolved,
          clientContext: run.clientContext,
          allowCloudFallback: routed.allowCloudFallback,
          fallbackUsed: routed.fallbackUsed,
          sections: run.draft,
          mode: run.mode,
          tier: run.tier,
          modelOverride,
          action: run.req.action!
        })
      : await runSupervisor({
          provider: routed.provider,
          requestedEngine: routed.requested,
          resolvedEngine: routed.resolved,
          clientContext: run.clientContext,
          allowCloudFallback: routed.allowCloudFallback,
          fallbackUsed: routed.fallbackUsed,
          sections: run.draft,
          mode: run.mode,
          tier: run.tier,
          modelOverride,
          rawInput: run.cleaned
        });

    const finalSections = supervisor.improved || run.draft;
    const renderedRaw = renderPrompt(finalSections, run.mode);

    const status = supervisor.error
      ? ("warning" as const)
      : routed.fallbackUsed
        ? ("fallback" as const)
        : ("complete" as const);
    const detail = [
      `route=${routed.resolved}`,
      supervisor.model ? `model=${supervisor.model}` : null,
      typeof supervisor.latencyMs === "number" ? `${supervisor.latencyMs}ms` : null,
      supervisor.error ? `(${supervisor.error.slice(0, 80)})` : null
    ]
      .filter(Boolean)
      .join(" · ");

    emit({ stage: "generate", status, detail });

    return {
      ...run,
      routed,
      modelOverride,
      supervisor,
      finalSections,
      renderedRaw
    };
  }
};

const validateStage: Stage<PromptFixerRun> = {
  id: "validate",
  label: "Validate Execution Readiness",
  description: "Run the safety screen, compute the score and insights.",
  async run({ run, emit }) {
    const safety: SafetyReport =
      run.mode === "terminal"
        ? screenForDanger(run.renderedRaw!)
        : { blocked: false, requiresConfirmation: false, findings: [] };
    const renderedFinal = safety.rewritten || run.renderedRaw!;
    const score = scorePrompt(renderedFinal, run.finalSections!, run.mode, safety);
    const insights = buildInsights(run.cleaned, run.finalSections!, run.mode, safety);

    const safetyStatus = safety.blocked
      ? ("warning" as const)
      : safety.findings.length > 0
        ? ("warning" as const)
        : ("complete" as const);

    emit({
      stage: "validate",
      status: safetyStatus,
      detail: [
        `clarity=${score.clarity}`,
        `spec=${score.specificity}`,
        `fit=${score.modelFit}`,
        safety.findings.length > 0 ? `safety:${safety.findings.length}` : null
      ]
        .filter(Boolean)
        .join(" · ")
    });

    return { ...run, safety, prompt: renderedFinal, score, insights };
  }
};

// ============================================================================
// Runner
// ============================================================================

export const PROMPT_FIXER_STAGES: Stage<PromptFixerRun>[] = [
  cleanStage,
  intentStage,
  structureStage,
  constraintsStage,
  generateStage,
  validateStage
];

export interface PromptFixerPipelineResult {
  response: FixResponse;
  events: StageEvent[];
}

/** Run the prompt-fixer pipeline. Equivalent to lib/ai.ts → fixPrompt. */
export async function runPromptFixerPipeline(
  req: FixRequest,
  options: PromptFixerOptions = {}
): Promise<PromptFixerPipelineResult> {
  const t0 = Date.now();
  const tier = options.tier ?? "free";
  const clientContext: ClientContext = req.clientContext ?? "web";
  const modelQuality: ModelQuality = req.modelQuality ?? "fast";
  const qualityProfile = getQuality(modelQuality);
  const engine: Engine | undefined = req.engine ?? qualityProfile.engine;
  const allowCloudFallback = Boolean(req.allowCloudFallback);
  const isTransform = Boolean(req.action) && Boolean(req.previousSections);

  const initial: PromptFixerRun = {
    req,
    tier,
    usage: options.usage,
    clientContext,
    modelQuality,
    engine,
    allowCloudFallback,
    isTransform,
    cleaned: "",
    removed: [],
    mode: req.mode ?? "general",
    draft: {
      role: "",
      task: "",
      context: "",
      constraints: [],
      outputFormat: ""
    }
  };

  const pipelineRun = await runPipeline(PROMPT_FIXER_STAGES, initial);

  // Even on stage failure we ship whatever we built — the route layer
  // already tolerates partial states (ok stays true; supervisor.error
  // surfaces the failure). Mirror the original fixPrompt contract.
  const r = pipelineRun.result;

  const response: FixResponse = {
    ok: true,
    mode: r.mode,
    detectedMode: r.detected,
    cleaned: r.cleaned,
    prompt: r.prompt ?? "",
    sections: r.finalSections ?? r.draft,
    safety:
      r.safety ?? { blocked: false, requiresConfirmation: false, findings: [] },
    supervisor: r.supervisor ?? {
      used: false,
      engine: "deterministic",
      requestedEngine: "deterministic",
      resolved: "deterministic",
      clientContext: r.clientContext,
      allowCloudFallback: r.allowCloudFallback,
      fallbackUsed: false,
      error: pipelineRun.error
    },
    usage: options.usage,
    score:
      r.score ??
      { clarity: 0, specificity: 0, safety: 0, modelFit: 0 },
    insights:
      r.insights ?? {
        changes: [],
        summary: "Pipeline did not produce insights."
      },
    modelQuality,
    action: req.action,
    elapsedMs: Date.now() - t0,
    events: pipelineRun.events
  };

  return { response, events: pipelineRun.events };
}
