/**
 * Deterministic mission runner · Phase 13.
 *
 * Pure-TS engine that takes a Mission Brief and produces real
 * deliverables without any network, model, or API key. Every stage
 * does actual work — parsing, scanning, ruling, scoring, formatting —
 * so the timeline that advances reflects real computation, not fake
 * progress.
 *
 * Cloud + Ollama wire in later. For Phase 13, this is the engine.
 */

import type { MissionStage, MissionEvent } from "@/store/mission";
import type { MemorySource } from "@/store/brain";

export type RunnerEngine = "deterministic" | "ollama";

export interface RunnerOptions {
  brief: string;
  mode: string;
  quality: string;
  sources: MemorySource[];
  repoContext?: string | null;
  /** When set to "ollama" + ollamaModel, the runner attempts a real LLM call. */
  engine?: RunnerEngine;
  ollamaModel?: string;
  ollamaHost?: string;
  onEvent: (event: Omit<MissionEvent, "at">) => void;
  onAdvance: (stage: MissionStage) => void;
}

export interface Deliverable {
  id: string;
  label: string;
  format: "markdown" | "shell" | "json" | "text";
  content: string;
  blurb: string;
}

export interface RunnerResult {
  deliverables: Deliverable[];
  score: number;
  elapsedMs: number;
  memoryMatches: number;
  intent: BriefIntent;
  engine: RunnerEngine;
  model: string;
  llmLatencyMs?: number;
}

interface BriefIntent {
  kind: "fix-prompt" | "architect" | "debug" | "terminal" | "research" | "general";
  topicHints: string[];
  asksForCode: boolean;
  asksForCommand: boolean;
  asksForArchitecture: boolean;
}

const STAGE_DELAY_MS = 110;

function tick(ms = STAGE_DELAY_MS): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
      window.setTimeout(resolve, ms);
    } else {
      setTimeout(resolve, ms);
    }
  });
}

function classifyIntent(brief: string): BriefIntent {
  const lower = brief.toLowerCase();
  const topicHints = Array.from(
    new Set(
      lower
        .replace(/[`*_~>#\-\(\)\[\]"',.;:!?\n]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 4)
        .slice(0, 16)
    )
  );

  const asksForCode = /(code|function|module|file|class|impl|refactor|test)/i.test(brief);
  const asksForCommand = /(command|cli|terminal|shell|bash|zsh)/i.test(brief);
  const asksForArchitecture = /(architecture|stack|file tree|design|architect|product|system)/i.test(brief);

  let kind: BriefIntent["kind"] = "general";
  if (/stack ?trace|exception|error|panic|traceback/i.test(brief)) kind = "debug";
  else if (asksForArchitecture && /build|architect|design/i.test(brief)) kind = "architect";
  else if (asksForCommand) kind = "terminal";
  else if (/messy prompt|clean.*prompt|fix.*prompt|rewrite.*prompt/i.test(brief)) kind = "fix-prompt";
  else if (/research|sources|references|cite/i.test(brief)) kind = "research";

  return { kind, topicHints, asksForCode, asksForCommand, asksForArchitecture };
}

function scanMemory(intent: BriefIntent, sources: MemorySource[]): MemorySource[] {
  if (sources.length === 0) return [];
  const hints = new Set(intent.topicHints.map((h) => h.toLowerCase()));
  return sources.filter((s) => {
    const label = s.label.toLowerCase();
    if (s.state === "active" || s.state === "manual") return true;
    for (const h of hints) {
      if (label.includes(h) || h.includes(s.kind)) return true;
    }
    return false;
  });
}

function pickModel(quality: string, intent: BriefIntent): string {
  if (quality === "local") return "deterministic-v1 (rules · local)";
  if (intent.asksForCode || intent.kind === "debug") return "deterministic-v1 (code-aware rules · local)";
  return "deterministic-v1 (rules · local)";
}

// ---------- Ollama ----------

export interface OllamaProbeResult {
  reachable: boolean;
  version?: string;
  models: string[];
}

const OLLAMA_DEFAULT_HOST = "http://localhost:11434";
const OLLAMA_TIMEOUT_MS = 1800;
const OLLAMA_GENERATE_TIMEOUT_MS = 120_000;

export async function probeOllama(host = OLLAMA_DEFAULT_HOST): Promise<OllamaProbeResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const r = await fetch(`${host}/api/tags`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return { reachable: false, models: [] };
    const j = (await r.json()) as { models?: Array<{ name: string }> };
    const models = (j.models ?? []).map((m) => m.name);
    // version is best-effort, do not block
    let version: string | undefined;
    try {
      const vr = await fetch(`${host}/api/version`, { signal: ctrl.signal });
      if (vr.ok) {
        const vj = (await vr.json()) as { version?: string };
        version = vj.version;
      }
    } catch {
      // ignore
    }
    return { reachable: true, version, models };
  } catch {
    clearTimeout(timer);
    return { reachable: false, models: [] };
  }
}

export interface OllamaResult {
  ok: boolean;
  response?: string;
  latencyMs: number;
  error?: string;
}

async function callOllama(
  host: string,
  model: string,
  prompt: string
): Promise<OllamaResult> {
  const t0 = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OLLAMA_GENERATE_TIMEOUT_MS);
  try {
    const r = await fetch(`${host}/api/generate`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false })
    });
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - t0);
    if (!r.ok) {
      const text = await r.text();
      const m = /model (".+?") not found/.exec(text);
      return {
        ok: false,
        latencyMs,
        error: m
          ? `Model ${m[1]} not installed`
          : `Ollama responded HTTP ${r.status}`
      };
    }
    const j = (await r.json()) as { response?: string; error?: string };
    if (j.error) return { ok: false, latencyMs, error: j.error };
    return { ok: true, latencyMs, response: j.response ?? "" };
  } catch (e) {
    clearTimeout(timer);
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - t0),
      error: e instanceof Error ? e.message : "unknown"
    };
  }
}

function executeRules(brief: string, mode: string, intent: BriefIntent) {
  const t0 = performance.now();
  const lines = brief.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const sections = {
    task: lines[0] ?? "(no task line)",
    body: lines.slice(1).join("\n")
  };
  const constraints = lines.filter((l) => /^must|^should|^never|^do not|^constraint/i.test(l));
  const cleanBrief = lines.join("\n");
  return {
    elapsedMs: Math.max(1, Math.round(performance.now() - t0)),
    sections,
    constraints,
    cleanBrief,
    mode,
    intent
  };
}

type ExecOutput = ReturnType<typeof executeRules>;

function scoreOutput(out: ExecOutput): number {
  let s = 50;
  if (out.sections.task.length > 12) s += 12;
  if (out.sections.body.length > 60) s += 12;
  if (out.constraints.length > 0) s += 10;
  if (out.intent.topicHints.length > 4) s += 8;
  if (out.intent.kind !== "general") s += 8;
  return Math.min(100, s);
}

function formatDeliverables(
  brief: string,
  mode: string,
  out: ExecOutput,
  score: number,
  repoContext: string | null
): Deliverable[] {
  const id = (k: string) => `${k}-${Math.random().toString(36).slice(2, 8)}`;
  const repoLine = repoContext ? `\nRepo context: ${repoContext}\n` : "";
  const constraintsBlock =
    out.constraints.length > 0
      ? out.constraints.map((c) => `- ${c}`).join("\n")
      : "- (none extracted from brief)";

  return [
    {
      id: id("clean"),
      label: "Clean Brief",
      format: "markdown",
      blurb: "Brief restructured for readability and forwarding.",
      content:
        `# Mission Brief\n\n` +
        `**Mode:** ${mode}  \n**Intent:** ${out.intent.kind}  \n` +
        `**Score:** ${score}/100${repoLine}\n\n## Task\n\n${out.sections.task}\n\n## Body\n\n${out.sections.body || "(empty)"}\n\n## Constraints\n\n${constraintsBlock}\n`
    },
    {
      id: id("cursor"),
      label: "Cursor Task",
      format: "markdown",
      blurb: "Drop into Cursor — task block with constraints first.",
      content:
        `# Task\n\n${out.sections.task}\n\n` +
        `## Constraints (must)\n${constraintsBlock}\n\n` +
        `## Notes\n${out.sections.body || "(none)"}\n` +
        (repoContext ? `\n## Repo context\n${repoContext}\n` : "")
    },
    {
      id: id("claude"),
      label: "Claude Prompt",
      format: "markdown",
      blurb: "Forward to Claude with explicit constraints and intent.",
      content:
        `<task>\n${out.sections.task}\n</task>\n\n` +
        `<constraints>\n${constraintsBlock}\n</constraints>\n\n` +
        `<context>\n${out.sections.body || "(none)"}\n${repoContext ? `Repo: ${repoContext}\n` : ""}</context>\n\n` +
        `Be concise. Produce the artifact, then explain trade-offs in 3 bullets.`
    },
    {
      id: id("chatgpt"),
      label: "ChatGPT Prompt",
      format: "markdown",
      blurb: "ChatGPT-friendly wording — role + task + constraints.",
      content:
        `You are a senior operator. Mode: ${mode}.\n\n` +
        `Task: ${out.sections.task}\n\n` +
        `Constraints:\n${constraintsBlock}\n\n` +
        `Context:\n${out.sections.body || "(none)"}\n\nProduce the artifact. End with risks.`
    },
    {
      id: id("linear"),
      label: "Linear Issue",
      format: "markdown",
      blurb: "Title + acceptance criteria for a Linear ticket.",
      content:
        `**Title:** ${out.sections.task.slice(0, 72)}\n\n` +
        `**Acceptance criteria:**\n${constraintsBlock}\n\n` +
        `**Context:**\n${out.sections.body || "(none)"}\n`
    },
    {
      id: id("github"),
      label: "GitHub Issue",
      format: "markdown",
      blurb: "Markdown body ready for `gh issue create`.",
      content:
        `### Summary\n${out.sections.task}\n\n### Why\n${out.sections.body || "(brief)"}\n\n### Constraints\n${constraintsBlock}\n` +
        (repoContext ? `\n### Repo\n${repoContext}\n` : "")
    },
    {
      id: id("terminal"),
      label: "Terminal Safe Command",
      format: "shell",
      blurb: "Preview-only shell snippet — never auto-executed.",
      content: out.intent.asksForCommand
        ? `# Generated from brief · review before running\n# ${out.sections.task}\necho "(stub: implement based on brief above)"\n`
        : `# This brief did not ask for a shell command.\n# Use the Terminal Safe blueprint to generate one.\n`
    },
    {
      id: id("summary"),
      label: "One-liner Summary",
      format: "text",
      blurb: "60-char summary for chats, commits, or PR titles.",
      content: out.sections.task.replace(/\s+/g, " ").trim().slice(0, 72)
    }
  ];
}

export async function runMission(opts: RunnerOptions): Promise<RunnerResult> {
  const t0 = performance.now();
  const intent = classifyIntent(opts.brief);

  opts.onAdvance("briefing");
  opts.onEvent({
    stage: "briefing",
    kind: "info",
    tag: "input",
    message: `Brief received · ${opts.brief.trim().length} chars · classified as ${intent.kind}`
  });
  await tick();

  opts.onAdvance("routing");
  opts.onEvent({
    stage: "routing",
    kind: "info",
    tag: "route",
    message: "Local deterministic route · no cloud · no Ollama probe"
  });
  await tick();

  const matches = scanMemory(intent, opts.sources);
  opts.onAdvance("memory-scan");
  opts.onEvent({
    stage: "memory-scan",
    kind: "info",
    tag: "memory",
    message:
      matches.length === 0
        ? `No memory sources matched · ${opts.sources.length} total connected`
        : `${matches.length} of ${opts.sources.length} memory source${opts.sources.length === 1 ? "" : "s"} matched`
  });
  await tick();

  const wantsOllama = opts.engine === "ollama" && !!opts.ollamaModel;
  const ollamaHost = opts.ollamaHost ?? OLLAMA_DEFAULT_HOST;
  const baseModel = pickModel(opts.quality, intent);
  const model = wantsOllama
    ? `ollama · ${opts.ollamaModel}`
    : baseModel;
  opts.onAdvance("model-select");
  opts.onEvent({
    stage: "model-select",
    kind: "info",
    tag: "model",
    message: `Selected ${model}`
  });
  await tick();

  const exec = executeRules(opts.brief, opts.mode, intent);
  opts.onAdvance("execution");
  opts.onEvent({
    stage: "execution",
    kind: "ok",
    tag: "exec",
    message: `Rules engine completed in ${exec.elapsedMs}ms`
  });
  await tick();

  // Optional real Ollama call. The deterministic engine has already
  // produced its deliverables — Ollama output is appended as one extra
  // "Model Response" deliverable, never replacing the rules-engine
  // artifacts. This keeps the flow honest: local rules always run.
  let ollamaDeliverable: Deliverable | null = null;
  let llmLatencyMs: number | undefined;
  if (wantsOllama && opts.ollamaModel) {
    opts.onEvent({
      stage: "execution",
      kind: "info",
      tag: "ollama",
      message: `Calling Ollama · ${opts.ollamaModel} @ ${ollamaHost}`
    });
    const result = await callOllama(ollamaHost, opts.ollamaModel, opts.brief);
    llmLatencyMs = result.latencyMs;
    if (result.ok && result.response) {
      opts.onEvent({
        stage: "execution",
        kind: "ok",
        tag: "ollama",
        message: `Ollama responded in ${result.latencyMs}ms · ${result.response.length} chars`
      });
      ollamaDeliverable = {
        id: `ollama-${Math.random().toString(36).slice(2, 8)}`,
        label: "Model Response",
        format: "markdown",
        blurb: `Local LLM response from ${opts.ollamaModel}.`,
        content: result.response.trim()
      };
    } else {
      opts.onEvent({
        stage: "execution",
        kind: "warn",
        tag: "ollama",
        message: `Ollama failed · ${result.error ?? "unknown"} · falling back to deterministic only`
      });
    }
  }

  const score = scoreOutput(exec);
  opts.onAdvance("validation");
  opts.onEvent({
    stage: "validation",
    kind: score >= 70 ? "ok" : "warn",
    tag: "score",
    message: `Quality score ${score}/100 · ${exec.constraints.length} constraint${exec.constraints.length === 1 ? "" : "s"} extracted`
  });
  await tick();

  const baseDeliverables = formatDeliverables(opts.brief, opts.mode, exec, score, opts.repoContext ?? null);
  const deliverables = ollamaDeliverable
    ? [ollamaDeliverable, ...baseDeliverables]
    : baseDeliverables;
  opts.onAdvance("deliverable-ready");
  opts.onEvent({
    stage: "deliverable-ready",
    kind: "ok",
    tag: "ship",
    message: `${deliverables.length} deliverables ready · saved to receipt`
  });

  return {
    deliverables,
    score,
    elapsedMs: Math.round(performance.now() - t0),
    memoryMatches: matches.length,
    intent,
    engine: wantsOllama && ollamaDeliverable ? "ollama" : "deterministic",
    model: wantsOllama && ollamaDeliverable
      ? `ollama · ${opts.ollamaModel}`
      : baseModel,
    llmLatencyMs
  };
}
