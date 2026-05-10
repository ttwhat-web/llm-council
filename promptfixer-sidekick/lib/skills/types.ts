/**
 * Skill — the unit of capability in PromptFixer.
 *
 * A Skill takes typed input, runs through the Pipeline (a sequence of
 * Stages), and produces a typed output. The Skill registry is the
 * surface area the UI, agents, and the command palette discover
 * capabilities through.
 *
 * Skills are server-side. They may invoke Tools (lib/tools), read /
 * write Memory (lib/memory), and route to specific models via the
 * MultiModelRouter (lib/router).
 *
 * Naming is intentional: a Skill is *what we can do*; a Tool is *what
 * we have access to*; an Agent is *a skill bound to memory + tools*.
 */

import type { Mode, ModelQuality, ProviderId } from "../types";

export type SkillId =
  | "prompt-fixer"
  | "prompt-cleaner"
  | "architect"
  // Declared but not yet shipped — see PROMPTOS.md.
  | "code-debugger"
  | "ai-researcher"
  | "crypto-analyst"
  | "screenshot-analyzer"
  | "terminal-assistant"
  | "deployment-assistant"
  | "marketing-generator"
  | "outreach-agent"
  | "vision-analyzer"
  | "workflow-builder";

export type SkillStatus = "shipped" | "planned" | "experimental";

export type RiskLevel = "safe" | "approval" | "dangerous";

export type ExecutionMode =
  /** Pure deterministic — never calls a model. */
  | "deterministic"
  /** One round-trip to a model. */
  | "single-shot"
  /** Multi-stage pipeline with intermediate model calls. */
  | "pipeline"
  /** Plans + executes tools; needs lib/agents runtime. */
  | "agent";

export interface SkillMeta {
  id: SkillId;
  name: string;
  description: string;
  /** Free-form tags for filtering / search. */
  tags: string[];
  /**
   * Trigger phrases the command palette / `/foo` slash UI use to surface
   * this skill. Lowercase, no leading slash.
   */
  triggers: string[];
  status: SkillStatus;
  risk: RiskLevel;
  executionMode: ExecutionMode;
  /** Required tools by id. Empty for self-contained skills. */
  requiresTools: string[];
  /** Default model preference. The router still has final say. */
  modelPreference?: {
    quality?: ModelQuality;
    bias?: Array<"long-context" | "code" | "reasoning" | "fast" | "research">;
  };
  /** Whether the skill should look at / write to project memory. */
  memorySupport?: {
    read?: boolean;
    write?: boolean;
    /** Memory namespace key (defaults to the skill id). */
    namespace?: string;
  };
}

/**
 * A `SkillRunner<I, O>` is the function-shaped runtime of a skill.
 * Inputs and outputs are owned by the skill module so each can be
 * type-rich without forcing a god-shape in this file.
 */
export type SkillRunner<I, O> = (input: I, ctx: SkillContext) => Promise<SkillResult<O>>;

export interface SkillContext {
  /** Stable identifier for the caller — IP / session / userEmail. */
  clientKey: string;
  /** Optional user identifier (for memory + alerts). */
  user?: string;
  /** When true, the skill should bias toward speed over depth. */
  fast?: boolean;
  /** When true, the skill must not call the network (deterministic only). */
  offline?: boolean;
  /**
   * AbortSignal so long-running skills can be cancelled by the caller.
   * Implementations should propagate to fetch() etc.
   */
  signal?: AbortSignal;
}

export interface SkillResult<O> {
  ok: boolean;
  output?: O;
  /** Stable error code when ok=false. UI maps to copy. */
  error?: string;
  /** Provider that ran the heavy lifting, when applicable. */
  resolved?: ProviderId;
  /** Model id (vendor-specific) when applicable. */
  model?: string;
  /** Total wall time ms for the skill run. */
  elapsedMs: number;
  /** Mode the engine resolved (Mode union). */
  mode?: Mode;
}

/**
 * Full Skill = meta + runner. Modules that aren't shipped yet expose
 * just the meta with `status: "planned"` and a runner that resolves
 * with `error: "not_implemented"` so the registry stays uniform.
 */
export interface Skill<I = unknown, O = unknown> {
  meta: SkillMeta;
  run: SkillRunner<I, O>;
}

/** Convenience: wrap a thrown error as a structured result. */
export function failed<T>(error: string, partial: Partial<SkillResult<T>> = {}): SkillResult<T> {
  return {
    ok: false,
    error,
    elapsedMs: 0,
    ...partial
  };
}
