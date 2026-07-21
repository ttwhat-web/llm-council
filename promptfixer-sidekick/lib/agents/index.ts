/**
 * Agent registry.
 *
 * v1 ships zero shipped agents. The contract is fixed and the
 * registration shape is identical to skills/tools — the runtime that
 * actually plans + tool-calls + iterates lands per PROMPTOS.md §Agent
 * Runtime. Importing this module is safe; calling `runAgent` throws a
 * structured `not_implemented` error so misuse is loud.
 */

import type { AgentContext, AgentDefinition, AgentRunResult } from "./types";

const AGENTS = new Map<string, AgentDefinition>();

export function listAgents(): AgentDefinition[] {
  return Array.from(AGENTS.values());
}

export function getAgent(id: string): AgentDefinition | null {
  return AGENTS.get(id) ?? null;
}

export function registerAgent(def: AgentDefinition): void {
  AGENTS.set(def.id, def);
}

export async function runAgent(
  _id: string,
  _input: unknown,
  _ctx: AgentContext
): Promise<AgentRunResult> {
  return {
    ok: false,
    trace: [
      {
        ts: Date.now(),
        kind: "error",
        detail: "agent runtime not implemented — see PROMPTOS.md §Agent Runtime",
        elapsedMs: 0
      }
    ],
    elapsedMs: 0,
    error: "not_implemented"
  };
}

export type { AgentContext, AgentDefinition, AgentRunResult, AgentTraceEntry } from "./types";
