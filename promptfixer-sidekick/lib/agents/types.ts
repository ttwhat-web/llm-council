/**
 * Agent — a Skill bound to a Memory namespace and a Tool whitelist.
 *
 * The Agent runtime (planned, not shipped in v1) plans, calls tools,
 * reads/writes memory, and produces a final answer. The whitelist
 * enforces that an Agent can only call `safe` tools by default; the
 * UI prompts the user to widen the whitelist for any approval-tier or
 * dangerous tool the plan needs.
 *
 * v1 contract is intentionally tight — multi-step planning loops, tool
 * routing heuristics, and self-correction are deferred per PROMPTOS.md
 * §Agent Runtime.
 */

import type { Skill, SkillContext } from "../skills/types";
import type { ToolId } from "../tools/types";

export interface AgentDefinition {
  id: string;
  name: string;
  description?: string;
  /** The skill the agent invokes. */
  skill: Skill["meta"]["id"];
  /** Permitted tools. Risk-tier checks still apply at call time. */
  tools: ToolId[];
  /** Memory namespace the agent reads + writes (defaults to skill id). */
  memoryNamespace?: string;
  /** Hard ceiling on planning iterations. v1 only single-shot — see seam. */
  maxIterations?: number;
}

/**
 * Per-run context passed to the agent runtime. Inherits from
 * SkillContext + carries an explicit consent map for any approval/
 * dangerous tools the plan touches.
 */
export interface AgentContext extends SkillContext {
  /** Tool-call consent map: { [toolId]: true } once the user approves. */
  approvals?: Record<ToolId, boolean>;
}

export interface AgentRunResult {
  ok: boolean;
  /** Final structured output from the bound skill. */
  output?: unknown;
  /** Trace: ordered tool / model calls. Powers the Operations Dashboard. */
  trace: AgentTraceEntry[];
  elapsedMs: number;
  error?: string;
}

export interface AgentTraceEntry {
  ts: number;
  kind: "skill-start" | "skill-end" | "tool-call" | "memory-read" | "memory-write" | "error";
  detail: string;
  /** ms relative to the agent run start. */
  elapsedMs: number;
}
