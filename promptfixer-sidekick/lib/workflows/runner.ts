/**
 * Sequential workflow runner.
 *
 * Walks `WorkflowDefinition.nodes` in order. Each node resolves its
 * input via `WorkflowInputBinding` (literal, ref to a previous node's
 * output, or compose), invokes the bound Skill or Tool, and stashes the
 * output for downstream refs.
 *
 * Branching, parallel fan-out, conditional edges, retries, and a
 * persisted run log all land in subsequent passes. The current shape is
 * intentionally minimal but real: a Workflow with two skill nodes runs
 * end-to-end today.
 */

import { getSkill } from "../skills/registry";
import type { SkillContext } from "../skills/types";
import { getTool } from "../tools/registry";
import type { ToolCallContext } from "../tools/types";
import type {
  WorkflowDefinition,
  WorkflowEvent,
  WorkflowInputBinding,
  WorkflowResult
} from "./types";

export interface WorkflowRunOptions {
  /** Per-skill / per-tool context. */
  ctx: SkillContext & ToolCallContext;
  /** Cancel the entire run. */
  signal?: AbortSignal;
}

export async function runWorkflow(
  def: WorkflowDefinition,
  options: WorkflowRunOptions
): Promise<WorkflowResult> {
  const start = Date.now();
  const events: WorkflowEvent[] = [];
  const outputs: Record<string, unknown> = {};
  const emit = (kind: WorkflowEvent["kind"], extra?: Partial<WorkflowEvent>) => {
    events.push({
      kind,
      ts: Date.now(),
      elapsedMs: Date.now() - start,
      ...extra
    });
  };

  emit("started");

  for (const node of def.nodes) {
    if (options.signal?.aborted) {
      emit("aborted", { nodeId: node.id });
      return {
        ok: false,
        outputs,
        events,
        elapsedMs: Date.now() - start,
        error: "aborted"
      };
    }

    emit("node-started", { nodeId: node.id });

    let nodeInput: unknown = {};
    try {
      nodeInput = resolveInput(node.input, outputs);
    } catch (err) {
      emit("node-failed", {
        nodeId: node.id,
        data: { reason: (err as Error).message }
      });
      emit("failed", { nodeId: node.id });
      return {
        ok: false,
        outputs,
        events,
        elapsedMs: Date.now() - start,
        error: `input resolution failed at node ${node.id}: ${(err as Error).message}`
      };
    }

    let nodeOutput: unknown;
    let nodeOk = false;
    let nodeError: string | undefined;

    if (node.kind === "skill") {
      const skill = getSkill(node.ref as Parameters<typeof getSkill>[0]);
      if (!skill) {
        nodeError = `unknown skill: ${node.ref}`;
      } else {
        const res = await skill.run(nodeInput, options.ctx);
        nodeOk = res.ok;
        nodeOutput = res.output;
        nodeError = res.error;
      }
    } else {
      const tool = getTool(node.ref as Parameters<typeof getTool>[0]);
      if (!tool) {
        nodeError = `unknown tool: ${node.ref}`;
      } else {
        const res = await tool.run(nodeInput, options.ctx);
        nodeOk = res.ok;
        nodeOutput = res.output;
        nodeError = res.error;
      }
    }

    if (!nodeOk) {
      emit("node-failed", { nodeId: node.id, data: { error: nodeError } });
      emit("failed", { nodeId: node.id });
      return {
        ok: false,
        outputs,
        events,
        elapsedMs: Date.now() - start,
        error: nodeError ?? "node_failed"
      };
    }

    outputs[node.id] = nodeOutput;
    emit("node-completed", { nodeId: node.id });
  }

  emit("completed");
  return {
    ok: true,
    outputs,
    events,
    elapsedMs: Date.now() - start
  };
}

// ---------- input binding resolver ----------------------------------------

function resolveInput(
  binding: WorkflowInputBinding | undefined,
  outputs: Record<string, unknown>
): unknown {
  if (!binding) return {};
  switch (binding.kind) {
    case "literal":
      return binding.value;
    case "ref":
      return readPath(outputs[binding.from], binding.path);
    case "compose": {
      const merged: Record<string, unknown> = {};
      for (const part of binding.parts) {
        const value = resolveInput(part, outputs);
        if (part.as) {
          merged[part.as] = value;
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
          Object.assign(merged, value as Record<string, unknown>);
        }
      }
      return merged;
    }
  }
}

function readPath(root: unknown, path?: string): unknown {
  if (!path) return root;
  const parts = path.split(".").filter(Boolean);
  let cursor: unknown = root;
  for (const p of parts) {
    if (cursor == null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[p];
  }
  return cursor;
}
