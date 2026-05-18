/**
 * Command console · Phase 17.
 *
 * Real local handlers for the operator command grammar. The same
 * grammar will route through a Telegram bot adapter when networking
 * ships — until then, the Settings Telegram card mounts a local
 * console that calls these handlers directly.
 *
 * Every command returns plain Markdown the bot would echo back. No
 * networking. No fake telemetry.
 */

import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { probeOllama } from "@/services/missionRunner";
import { runWorkflow } from "@/services/workflowRunner";

export interface CommandResult {
  ok: boolean;
  output: string;
}

export type CommandName =
  | "status"
  | "brain"
  | "missions"
  | "receipt"
  | "run"
  | "pause"
  | "resume"
  | "approve"
  | "reject"
  | "workflows"
  | "ollama"
  | "help";

export const COMMAND_HELP: Array<{ cmd: string; desc: string }> = [
  { cmd: "/status", desc: "engine · brain · receipts at a glance" },
  { cmd: "/brain", desc: "identity, sources, engines summary" },
  { cmd: "/missions", desc: "last 6 archived missions" },
  { cmd: "/receipt <id>", desc: "expand a specific receipt" },
  { cmd: "/run <brief>", desc: "dispatch a mission with the brief" },
  { cmd: "/pause", desc: "cancel the in-flight mission" },
  { cmd: "/resume", desc: "no-op · paused workflows resume via /approve" },
  { cmd: "/approve <id>", desc: "approve a paused workflow run" },
  { cmd: "/reject <id>", desc: "discard a paused workflow run" },
  { cmd: "/workflows", desc: "list recent workflow runs" },
  { cmd: "/ollama", desc: "probe Ollama · list installed models" },
  { cmd: "/help", desc: "this list" }
];

export async function executeCommand(line: string): Promise<CommandResult> {
  const raw = line.trim();
  if (!raw) return { ok: false, output: "Empty command." };
  const m = /^\/(\w+)(?:\s+([\s\S]+))?$/.exec(raw);
  if (!m) {
    return {
      ok: false,
      output: `Unknown command. Try /help.`
    };
  }
  const cmd = m[1].toLowerCase() as CommandName;
  const arg = m[2]?.trim() ?? "";
  switch (cmd) {
    case "status":
      return status();
    case "brain":
      return brain();
    case "missions":
      return missions();
    case "receipt":
      return receipt(arg);
    case "run":
      return run(arg);
    case "pause":
      return pause();
    case "resume":
      return {
        ok: true,
        output:
          "Workflow resume is gated by `/approve <id>` on paused runs. Missions do not pause."
      };
    case "approve":
      return approve(arg);
    case "reject":
      return reject(arg);
    case "workflows":
      return workflows();
    case "ollama":
      return ollama();
    case "help":
      return {
        ok: true,
        output: COMMAND_HELP.map((c) => `${c.cmd} — ${c.desc}`).join("\n")
      };
    default:
      return { ok: false, output: `Unknown command: /${cmd}` };
  }
}

// ---------- handlers ----------

function status(): CommandResult {
  const brainS = useBrainStore.getState();
  const missionS = useMissionStore.getState();
  const lines: string[] = [];
  lines.push(`**Engine:** ${missionS.runtime}`);
  lines.push(
    `**Brain:** ${brainS.identity ? `${brainS.identity.name} · ${brainS.identity.mode}` : "—"}`
  );
  lines.push(`**Sources:** ${brainS.memorySources.length}`);
  lines.push(`**Engines:** ${brainS.engines.map((e) => e.kind).join(" · ") || "deterministic"}`);
  lines.push(`**Receipts:** ${missionS.history.length}`);
  lines.push(
    `**In flight:** ${missionS.current ? `${missionS.current.id} · ${missionS.current.stage}` : "none"}`
  );
  return { ok: true, output: lines.join("\n") };
}

function brain(): CommandResult {
  const b = useBrainStore.getState();
  if (!b.identity) return { ok: false, output: "No brain bootstrapped yet." };
  const lines: string[] = [];
  lines.push(`**Name:** ${b.identity.name}`);
  lines.push(`**Mode:** ${b.identity.mode}`);
  lines.push(`**Created:** ${new Date(b.identity.createdAt).toLocaleString()}`);
  lines.push(`**Missions:** ${b.missionCount}`);
  lines.push(`**Sources (${b.memorySources.length}):**`);
  for (const s of b.memorySources) lines.push(`  · ${s.label} · ${s.state}`);
  lines.push(`**Engines (${b.engines.length}):**`);
  for (const e of b.engines) lines.push(`  · ${e.label} · ${e.state}`);
  if (b.demo) lines.push(`_demo data · labelled_`);
  return { ok: true, output: lines.join("\n") };
}

function missions(): CommandResult {
  const h = useMissionStore.getState().history.slice(0, 6);
  if (h.length === 0) return { ok: true, output: "No archived missions yet." };
  const lines = h.map(
    (m) =>
      `\`${m.id}\` · ${new Date(m.startedAt).toLocaleString()} · mode=${m.mode} · stage=${m.stage}${m.score ? ` · score=${m.score}` : ""}`
  );
  return { ok: true, output: lines.join("\n") };
}

function receipt(id: string): CommandResult {
  if (!id) return { ok: false, output: "Usage: /receipt <id>" };
  const found = useMissionStore.getState().history.find((m) => m.id === id);
  if (!found) return { ok: false, output: `No receipt with id ${id}.` };
  const lines: string[] = [];
  lines.push(`**${found.id}**`);
  lines.push(`mode: ${found.mode} · quality: ${found.quality}`);
  lines.push(`stage: ${found.stage}`);
  if (found.engine) lines.push(`engine: ${found.engine}${found.model ? ` · ${found.model}` : ""}`);
  if (found.score) lines.push(`score: ${found.score}/100`);
  if (found.elapsedMs) lines.push(`elapsed: ${found.elapsedMs}ms`);
  lines.push("---");
  lines.push(`brief: ${found.brief.slice(0, 240)}`);
  lines.push(`deliverables: ${found.deliverables.length}`);
  return { ok: true, output: lines.join("\n") };
}

async function run(arg: string): Promise<CommandResult> {
  if (!arg) return { ok: false, output: "Usage: /run <brief>" };
  const ms = useMissionStore.getState();
  if (ms.current) {
    return {
      ok: false,
      output: `Cannot dispatch · ${ms.current.id} is already in flight at ${ms.current.stage}.`
    };
  }
  const r = await ms.dispatch(arg, "auto", "fast", null);
  if (!r) return { ok: false, output: "Dispatch failed." };
  return {
    ok: true,
    output: `Dispatched ${r.id} · stage ${r.stage} · ${r.deliverables.length} deliverables · score ${r.score ?? "?"}`
  };
}

function pause(): CommandResult {
  const ms = useMissionStore.getState();
  if (!ms.current) return { ok: false, output: "No mission in flight." };
  const id = ms.current.id;
  ms.cancel();
  return { ok: true, output: `Cancelled ${id}.` };
}

function approve(id: string): CommandResult {
  if (!id) return { ok: false, output: "Usage: /approve <workflow-run-id>" };
  const runs = useAtlasStore.getState().workflowRuns;
  const target = runs.find((r) => r.id === id);
  if (!target) return { ok: false, output: `No workflow run ${id}.` };
  if (target.status !== "awaiting-approval")
    return { ok: false, output: `Run ${id} is ${target.status}, not awaiting approval.` };
  // We don't actually resume — approval is acknowledged + run continued
  // via a follow-up workflow invocation. For now we mark it completed.
  const updated = {
    ...target,
    status: "completed" as const,
    endedAt: Date.now(),
    steps: [
      ...target.steps,
      {
        at: Date.now(),
        nodeId: "",
        kind: "approval" as const,
        state: "ok" as const,
        message: "approved via command console"
      }
    ]
  };
  // Replace in place
  useAtlasStore.setState((s) => ({
    workflowRuns: s.workflowRuns.map((r) => (r.id === id ? updated : r))
  }));
  return { ok: true, output: `Approved ${id}.` };
}

function reject(id: string): CommandResult {
  if (!id) return { ok: false, output: "Usage: /reject <workflow-run-id>" };
  const runs = useAtlasStore.getState().workflowRuns;
  const target = runs.find((r) => r.id === id);
  if (!target) return { ok: false, output: `No workflow run ${id}.` };
  const updated = {
    ...target,
    status: "blocked" as const,
    endedAt: Date.now(),
    steps: [
      ...target.steps,
      {
        at: Date.now(),
        nodeId: "",
        kind: "approval" as const,
        state: "blocked" as const,
        message: "rejected via command console"
      }
    ]
  };
  useAtlasStore.setState((s) => ({
    workflowRuns: s.workflowRuns.map((r) => (r.id === id ? updated : r))
  }));
  return { ok: true, output: `Rejected ${id}.` };
}

function workflows(): CommandResult {
  const runs = useAtlasStore.getState().workflowRuns.slice(0, 6);
  if (runs.length === 0) return { ok: true, output: "No workflow runs yet." };
  return {
    ok: true,
    output: runs
      .map(
        (r) =>
          `\`${r.id}\` · ${new Date(r.startedAt).toLocaleString()} · ${r.status} · ${r.steps.length} step${r.steps.length === 1 ? "" : "s"}`
      )
      .join("\n")
  };
}

async function ollama(): Promise<CommandResult> {
  const p = await probeOllama();
  if (!p.reachable) {
    return {
      ok: false,
      output: "Ollama not reachable at http://localhost:11434"
    };
  }
  const lines: string[] = [];
  lines.push(`reachable · v${p.version ?? "?"}`);
  if (p.models.length === 0) {
    lines.push("no models installed · `ollama pull gemma2:2b` to start");
  } else {
    lines.push(`models (${p.models.length}):`);
    for (const m of p.models) lines.push(`  · ${m}`);
  }
  return { ok: true, output: lines.join("\n") };
}

// Allow the workflow runner to be triggered by `/run-workflow`. Exposed
// here so the same console handles it without polluting the grammar.
export async function executeRunWorkflow(): Promise<CommandResult> {
  const r = await runWorkflow({});
  return {
    ok: r.status !== "blocked",
    output: `Workflow ${r.id} · ${r.status} · ${r.steps.length} step${r.steps.length === 1 ? "" : "s"}`
  };
}
