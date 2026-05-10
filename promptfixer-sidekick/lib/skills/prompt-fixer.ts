/**
 * Skill: Prompt Fixer
 *
 * Wraps the existing lib/ai.ts → fixPrompt() pipeline as a Skill so the
 * registry, the workflow runner, and the future agent runtime all see
 * it through the same lens.
 *
 * This is intentionally a thin adapter: the substrate is already
 * production-grade (cleaner → mode → engine → router → supervisor →
 * safety → score → insights). Refactoring it into per-stage Stage<R>
 * primitives is a follow-up — see PROMPTOS.md §Pipeline migration.
 */

import { fixPrompt } from "../ai";
import type { FixRequest, FixResponse } from "../types";
import { failed, type Skill } from "./types";

export interface PromptFixerInput extends FixRequest {}
export type PromptFixerOutput = FixResponse;

export const promptFixerSkill: Skill<PromptFixerInput, PromptFixerOutput> = {
  meta: {
    id: "prompt-fixer",
    name: "Prompt Fixer",
    description:
      "Cleans, structures, and supervises a messy prompt into an execution-ready form. Mode-aware, safety-screened, scored.",
    tags: ["prompt", "cleanup", "structure", "supervisor", "safety"],
    triggers: ["fix", "fixer", "improve", "polish"],
    status: "shipped",
    risk: "safe",
    executionMode: "pipeline",
    requiresTools: [],
    modelPreference: { quality: "fast", bias: ["fast"] },
    memorySupport: { read: false, write: false }
  },
  async run(input, ctx) {
    const start = Date.now();
    try {
      const result = await fixPrompt(input);
      return {
        ok: result.ok,
        output: result,
        resolved: result.supervisor?.resolved,
        model: result.supervisor?.model,
        mode: result.mode,
        elapsedMs: result.elapsedMs ?? Date.now() - start
      };
    } catch (err) {
      return failed<PromptFixerOutput>((err as Error).message, {
        elapsedMs: Date.now() - start
      });
    }
  }
};
