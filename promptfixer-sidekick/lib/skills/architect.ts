/**
 * Skill: Architect — wraps lib/architect.ts → runArchitect().
 *
 * Pure runtime call; no HTTP. Workflows + Agents invoke this skill the
 * same way they invoke Prompt Fixer. The route handler still owns
 * metering + Mission Alerts; the Skill is the unmetered call path
 * (callers that need quota enforcement use the route).
 */

import { runArchitect, type ArchitectRunInput, type ArchitectRunResult } from "../architect";
import { failed, type Skill } from "./types";

export type ArchitectSkillInput = ArchitectRunInput;
export type ArchitectSkillOutput = ArchitectRunResult;

export const architectSkill: Skill<ArchitectSkillInput, ArchitectSkillOutput> = {
  meta: {
    id: "architect",
    name: "Architect",
    description:
      "Translates a brief idea into a structured implementation plan: architecture, stack, file tree, execution-ready prompt, roadmap, deployment checklist, risks.",
    tags: ["planning", "architecture", "scaffold", "operator"],
    triggers: ["architect", "plan", "scaffold"],
    status: "shipped",
    risk: "safe",
    executionMode: "single-shot",
    requiresTools: [],
    modelPreference: { quality: "smart", bias: ["reasoning", "long-context"] },
    memorySupport: { read: true, write: true, namespace: "skill:architect" }
  },
  async run(input) {
    const start = Date.now();
    try {
      const out = await runArchitect(input);
      return {
        ok: true,
        output: out,
        resolved: out.resolved,
        model: out.model,
        elapsedMs: out.elapsedMs ?? Date.now() - start
      };
    } catch (err) {
      return failed<ArchitectSkillOutput>((err as Error).message, {
        elapsedMs: Date.now() - start
      });
    }
  }
};
