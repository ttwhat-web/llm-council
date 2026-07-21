/**
 * Workflow — an ordered chain of Skills + Tools that runs as one unit.
 *
 * Workflows are how power users automate multi-step missions: "clean →
 * fix → architect → export to Cursor task" lives as a single saved
 * Workflow. The Workflow runner steps through nodes, passes outputs
 * forward, and emits typed events the UI consumes.
 *
 * v1 ships the type contract + a sequential runner skeleton. Branching,
 * parallel fan-out, and conditional edges land per PROMPTOS.md §Workflow.
 */

import type { SkillId } from "../skills/types";
import type { ToolId } from "../tools/types";

export interface WorkflowNode {
  /** Stable id within the workflow (used for wiring outputs). */
  id: string;
  /** Either a skill or a tool node. */
  kind: "skill" | "tool";
  ref: SkillId | ToolId;
  /**
   * Input mapping: inline literal, or reference to a previous node's
   * output via `{ from: "<nodeId>", path: "output.foo.bar" }`. Path
   * uses dot notation; resolved by the runner.
   */
  input?: WorkflowInputBinding;
  /** Optional human-readable label for the UI. */
  label?: string;
}

export type WorkflowInputBinding =
  | { kind: "literal"; value: unknown }
  | { kind: "ref"; from: string; path?: string }
  | {
      kind: "compose";
      /** Each entry is shallow-merged into a single input object. */
      parts: Array<WorkflowInputBinding & { as?: string }>;
    };

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  /** Ordered nodes. Sequential runner walks them in order. */
  nodes: WorkflowNode[];
  createdAt?: number;
  updatedAt?: number;
}

export type WorkflowEventKind =
  | "started"
  | "node-started"
  | "node-completed"
  | "node-failed"
  | "completed"
  | "failed"
  | "aborted";

export interface WorkflowEvent {
  kind: WorkflowEventKind;
  ts: number;
  nodeId?: string;
  /** ms from workflow start. */
  elapsedMs: number;
  data?: unknown;
}

export interface WorkflowResult {
  ok: boolean;
  /** Map nodeId → typed result. */
  outputs: Record<string, unknown>;
  events: WorkflowEvent[];
  elapsedMs: number;
  error?: string;
}
