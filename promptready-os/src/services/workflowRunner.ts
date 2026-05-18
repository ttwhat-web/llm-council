/**
 * Workflow runner · Phase 16 + 18 (approval resume).
 *
 * Walks a graph of nodes starting at the first `mission` node, then
 * follows outgoing edges in insertion order. Per node kind:
 *
 *   mission  · dispatch through the mission engine, optionally seeded
 *              with the previous deliverable as context.
 *   memory   · attach an indexed memory doc summary to the current
 *              context (read-only).
 *   repo     · attach the brain's repo source label to context.
 *   export   · download the last deliverable as Markdown.
 *   approval · pause the run; status flips to "awaiting-approval";
 *              the runner records `pausedNodeId` + `resumeCursor` so
 *              `/approve` can resume cleanly.
 *
 * The runner never invents data. If a downstream node has no input
 * available, the step is recorded as "blocked" with an honest reason.
 */

import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import {
  useAtlasStore,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowRun,
  type WorkflowRunStep,
  type WorkflowResumeContext
} from "@/store/atlas";
import type { Deliverable } from "@/services/missionRunner";
import { sendTelegramApprovalRequest, getTelegramBridgeStatus } from "@/services/telegramLive";
import { sendNotification } from "@/services/telegramBridge";

interface Ctx {
  lastDeliverable?: Deliverable;
  brief?: string;
  steps: WorkflowRunStep[];
}

const MAX_NODES = 20;

export interface RunOptions {
  initialBrief?: string;
  /** Resume a previously paused run by id. */
  resumeRunId?: string;
}

export async function runWorkflow(opts: RunOptions = {}): Promise<WorkflowRun> {
  const { workflowNodes: nodes, workflowEdges: edges } = useAtlasStore.getState();

  // ---------- Resume path ----------
  if (opts.resumeRunId) {
    const prior = useAtlasStore
      .getState()
      .workflowRuns.find((r) => r.id === opts.resumeRunId);
    if (!prior) {
      return finish({
        id: runId(),
        startedAt: Date.now(),
        endedAt: Date.now(),
        steps: [
          {
            at: Date.now(),
            nodeId: "",
            kind: "mission",
            state: "blocked",
            message: `No paused run ${opts.resumeRunId}`
          }
        ],
        status: "blocked"
      });
    }
    return resumeRun(prior, nodes, edges);
  }

  // ---------- Fresh run ----------
  const id = runId();
  const startedAt = Date.now();
  const ctx: Ctx = { steps: [] };
  const seen = new Set<string>();

  const start = nodes.find((n) => n.kind === "mission") ?? nodes[0] ?? null;
  if (!start) {
    return finish({
      id,
      startedAt,
      endedAt: Date.now(),
      steps: [
        {
          at: Date.now(),
          nodeId: "",
          kind: "mission",
          state: "blocked",
          message: "Canvas empty · add at least one node to run."
        }
      ],
      status: "blocked"
    });
  }

  return walk(id, startedAt, start, ctx, seen, nodes, edges, opts);
}

async function walk(
  id: string,
  startedAt: number,
  start: WorkflowNode,
  ctx: Ctx,
  seen: Set<string>,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  opts: RunOptions
): Promise<WorkflowRun> {
  let cursor: WorkflowNode | null = start;
  let status: WorkflowRun["status"] = "running";
  let pausedNodeId: string | undefined;
  let resumeCursor: string | undefined;

  while (cursor && seen.size < MAX_NODES) {
    if (seen.has(cursor.id)) {
      ctx.steps.push({
        at: Date.now(),
        nodeId: cursor.id,
        kind: cursor.kind,
        state: "skipped",
        message: "cycle detected · stopping at repeated node"
      });
      break;
    }
    seen.add(cursor.id);

    const result = await executeNode(cursor, ctx, opts);
    ctx.steps.push(result);

    if (result.state === "approval-required") {
      status = "awaiting-approval";
      pausedNodeId = cursor.id;
      // resumeCursor is the next node AFTER the approval node.
      const next = nextNode(cursor, nodes, edges);
      resumeCursor = next?.id;
      break;
    }
    if (result.state === "blocked") {
      status = "blocked";
      break;
    }

    cursor = nextNode(cursor, nodes, edges);
  }

  if (status === "running") status = "completed";

  const resumeContext: WorkflowResumeContext | undefined =
    status === "awaiting-approval"
      ? {
          lastDeliverableContent: ctx.lastDeliverable?.content,
          lastDeliverableLabel: ctx.lastDeliverable?.label,
          briefAccumulator: ctx.brief
        }
      : undefined;

  return finish({
    id,
    startedAt,
    endedAt: status === "awaiting-approval" ? undefined : Date.now(),
    steps: ctx.steps,
    status,
    pausedNodeId,
    resumeCursor,
    resumeContext
  });
}

async function resumeRun(
  prior: WorkflowRun,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Promise<WorkflowRun> {
  if (prior.status !== "awaiting-approval") {
    return finish({
      ...prior,
      steps: [
        ...prior.steps,
        {
          at: Date.now(),
          nodeId: prior.pausedNodeId ?? "",
          kind: "approval",
          state: "blocked",
          message: `Cannot resume · run is ${prior.status}`
        }
      ]
    });
  }
  const cursor = prior.resumeCursor
    ? nodes.find((n) => n.id === prior.resumeCursor)
    : undefined;

  // Restore the runner context from what we recorded at pause.
  const ctx: Ctx = {
    steps: [...prior.steps],
    brief: prior.resumeContext?.briefAccumulator,
    lastDeliverable: prior.resumeContext?.lastDeliverableContent
      ? {
          id: "resume-" + Math.random().toString(36).slice(2, 8),
          label: prior.resumeContext.lastDeliverableLabel ?? "Prior deliverable",
          format: "markdown",
          blurb: "restored at approval",
          content: prior.resumeContext.lastDeliverableContent
        }
      : undefined
  };

  // Add an approval-cleared marker so the timeline reads honestly.
  ctx.steps.push({
    at: Date.now(),
    nodeId: prior.pausedNodeId ?? "",
    kind: "approval",
    state: "ok",
    message: "approval cleared · resuming downstream nodes"
  });

  if (!cursor) {
    // Nothing left to walk — the approval was the last node.
    return finish({
      ...prior,
      status: "completed",
      endedAt: Date.now(),
      steps: ctx.steps,
      pausedNodeId: undefined,
      resumeCursor: undefined,
      resumeContext: undefined
    });
  }

  const seen = new Set<string>(prior.steps.map((s) => s.nodeId).filter(Boolean));
  // Allow the resumed cursor to run even if its id appears in seen
  // (it may be the next node after approval which hasn't run yet).
  seen.delete(cursor.id);

  return walk(prior.id, prior.startedAt, cursor, ctx, seen, nodes, edges, {});
}

function finish(r: WorkflowRun): WorkflowRun {
  useAtlasStore.getState().recordWorkflowRun(r);
  // Push events on terminal states. Local notification always · Telegram
  // only when live · the workflow runner never depends on the network.
  if (r.status === "awaiting-approval") {
    sendNotification(
      `🟡 Workflow awaiting approval · ${r.id} · /approve ${r.id} or /reject ${r.id}`
    );
    const tg = getTelegramBridgeStatus();
    if (tg.live === "live-ready" || tg.live === "live-connected") {
      void sendTelegramApprovalRequest(r);
    }
  } else if (r.status === "completed") {
    sendNotification(`✅ Workflow completed · ${r.id} · ${r.steps.length} step(s)`);
  } else if (r.status === "blocked") {
    sendNotification(`🔴 Workflow blocked · ${r.id}`);
  }
  return r;
}

async function executeNode(
  node: WorkflowNode,
  ctx: Ctx,
  opts: RunOptions
): Promise<WorkflowRunStep> {
  const base = { at: Date.now(), nodeId: node.id, kind: node.kind };
  switch (node.kind) {
    case "mission": {
      const brief = buildMissionBrief(ctx, opts);
      const ms = useMissionStore.getState();
      if (ms.current) {
        return {
          ...base,
          state: "blocked",
          message: "another mission in flight · cancel it first"
        };
      }
      const receipt = await ms.dispatch(brief, "auto", "fast", null);
      if (!receipt || receipt.deliverables.length === 0) {
        return {
          ...base,
          state: "blocked",
          message: "mission failed to produce deliverables"
        };
      }
      ctx.lastDeliverable = receipt.deliverables[0];
      ctx.brief = receipt.brief;
      return {
        ...base,
        state: "ok",
        message: `dispatched ${receipt.id} · ${receipt.deliverables.length} deliverables · score ${receipt.score ?? "?"}`
      };
    }

    case "repo": {
      const repo = useBrainStore
        .getState()
        .memorySources.find((s) => s.kind === "github");
      if (!repo) {
        return {
          ...base,
          state: "blocked",
          message: "no repo attached · add one in the Repo Layer panel"
        };
      }
      ctx.brief = `${ctx.brief ?? ""}\n\nRepo context: ${repo.label}`;
      return { ...base, state: "ok", message: `repo context attached · ${repo.label}` };
    }

    case "memory": {
      const docs = useAtlasStore.getState().memoryDocs;
      if (docs.length === 0) {
        return {
          ...base,
          state: "blocked",
          message: "no imported memory docs · import some in the Memory Vault"
        };
      }
      const top = docs.slice(0, 3);
      const summary = top.map((d) => `- ${d.name} (${d.ext})`).join("\n");
      ctx.brief = `${ctx.brief ?? ""}\n\nMemory context:\n${summary}`;
      return {
        ...base,
        state: "ok",
        message: `memory attached · ${top.length} doc(s)`
      };
    }

    case "export": {
      if (!ctx.lastDeliverable) {
        return {
          ...base,
          state: "blocked",
          message: "no deliverable to export yet · place after a mission node"
        };
      }
      downloadDeliverable(ctx.lastDeliverable);
      return {
        ...base,
        state: "ok",
        message: `exported ${ctx.lastDeliverable.label}`
      };
    }

    case "approval": {
      return {
        ...base,
        state: "approval-required",
        message: "awaiting operator approval · run paused"
      };
    }

    case "agent": {
      return {
        ...base,
        state: "blocked",
        message: "agent runtime is planned · not executable yet"
      };
    }
  }
}

function buildMissionBrief(ctx: Ctx, opts: RunOptions): string {
  if (!ctx.lastDeliverable) {
    return opts.initialBrief?.trim() || "Run the next operator step for this workflow.";
  }
  const quoted = ctx.lastDeliverable.content.replace(/\n+/g, "\n").slice(0, 300);
  return `Iterate on this ${ctx.lastDeliverable.label}:\n\n"""\n${quoted}\n"""\n\nProduce a refined version.${
    ctx.brief ? `\n\n${ctx.brief}` : ""
  }`;
}

function nextNode(
  current: WorkflowNode,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode | null {
  const outgoing = edges.filter((e) => e.from === current.id);
  if (outgoing.length === 0) return null;
  const target = nodes.find((n) => n.id === outgoing[0].to);
  return target ?? null;
}

function downloadDeliverable(d: Deliverable) {
  if (typeof window === "undefined") return;
  const ext =
    d.format === "shell"
      ? "sh"
      : d.format === "json"
        ? "json"
        : d.format === "markdown"
          ? "md"
          : "txt";
  const blob = new Blob([d.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${d.label.toLowerCase().replace(/\s+/g, "-")}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function runId() {
  return `w-${Math.random().toString(36).slice(2, 10)}`;
}

/** Public resume entrypoint used by /approve + Resume button. */
export async function resumeWorkflowRun(runId: string): Promise<WorkflowRun> {
  return runWorkflow({ resumeRunId: runId });
}
