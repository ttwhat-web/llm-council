/**
 * Tool — an external capability a skill or agent can call.
 *
 * Where a Skill is *something we can do* (typed input → typed output),
 * a Tool is *something we have access to in the world*: clipboard,
 * filesystem, HTTP, GitHub, terminal, browser, …
 *
 * Tools carry a risk classification:
 *   safe       — read-only or self-scoped (clipboard, exports, queries)
 *   approval   — observable side effects (PR comment, email draft)
 *   dangerous  — destructive / privileged (terminal exec, deploy)
 *
 * The Agent runtime (lib/agents) MUST honour `risk`:
 *   - safe        → execute freely
 *   - approval    → prompt the user; require explicit consent per call
 *   - dangerous   → require explicit consent + show full effect preview
 *
 * v1 ships only `safe` tools. The dangerous ones are declared with
 * `status: "planned"` so the contract is fixed but no execution is wired.
 */

import type { RiskLevel } from "../skills/types";

export type ToolId =
  // shipped (v1) — safe
  | "telegram.send-alert"
  | "alert-inbox.list"
  | "exports.format"
  // planned
  | "clipboard.write"
  | "files.read"
  | "files.write"
  | "http.fetch"
  | "github.create-issue"
  | "github.create-pr"
  | "terminal.exec"
  | "browser.open"
  | "deploy.trigger"
  | "webhook.send";

export type ToolStatus = "shipped" | "planned";

export interface ToolMeta {
  id: ToolId;
  name: string;
  description: string;
  status: ToolStatus;
  risk: RiskLevel;
  /**
   * Where the tool runs. Server-only tools (most of them) MUST NOT be
   * exposed to client agents; the agent runtime gates on this.
   */
  scope: "server" | "client";
  /**
   * Free-form schema hint. We deliberately don't pull in JSON-Schema
   * here — the input shape is owned by each tool module so tools stay
   * lightweight. Stronger validation lands when the tool-calling loop
   * is wired (see PROMPTOS.md §Tool Calling).
   */
  inputs?: Array<{ name: string; type: string; required?: boolean }>;
  outputs?: Array<{ name: string; type: string }>;
}

export interface ToolCallContext {
  clientKey: string;
  user?: string;
  /** True when the user has explicitly approved this specific call. */
  approved?: boolean;
  signal?: AbortSignal;
}

export interface ToolCallResult<T = unknown> {
  ok: boolean;
  output?: T;
  error?: string;
  /** ms to execute the tool, network included. */
  elapsedMs: number;
}

export type ToolRunner<I, O> = (
  input: I,
  ctx: ToolCallContext
) => Promise<ToolCallResult<O>>;

export interface Tool<I = unknown, O = unknown> {
  meta: ToolMeta;
  run: ToolRunner<I, O>;
}
