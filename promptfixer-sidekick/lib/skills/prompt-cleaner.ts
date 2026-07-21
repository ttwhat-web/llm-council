/**
 * Skill: Prompt Cleaner — the deterministic /clean path.
 *
 * Pure cleanup, no model call. Used as both a standalone skill and as
 * the first stage of the prompt-fixer pipeline.
 */

import { cleanInput } from "../cleaner";
import { failed, type Skill } from "./types";

export interface PromptCleanerInput {
  input: string;
}

export interface PromptCleanerOutput {
  cleaned: string;
  removed: string[];
}

export const promptCleanerSkill: Skill<PromptCleanerInput, PromptCleanerOutput> = {
  meta: {
    id: "prompt-cleaner",
    name: "Prompt Cleaner",
    description:
      "Deterministic noise / smart-quote / filler stripper. Same engine the prompt fixer's first stage uses.",
    tags: ["prompt", "cleanup", "deterministic"],
    triggers: ["clean", "cleaner", "strip"],
    status: "shipped",
    risk: "safe",
    executionMode: "deterministic",
    requiresTools: [],
    memorySupport: { read: false, write: false }
  },
  async run(input) {
    const start = Date.now();
    try {
      const out = cleanInput(input.input || "");
      return {
        ok: true,
        output: { cleaned: out.cleaned, removed: out.removed },
        elapsedMs: Date.now() - start
      };
    } catch (err) {
      return failed<PromptCleanerOutput>((err as Error).message, {
        elapsedMs: Date.now() - start
      });
    }
  }
};
