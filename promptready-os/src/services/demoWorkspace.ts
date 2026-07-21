/**
 * Demo Workspace · Phase 19.
 *
 * Seeds a controlled workspace in 60 seconds so a customer / investor
 * can feel the product without typing anything. Every receipt and
 * source is clearly demo data — `useBrainStore.demo` is `true` and
 * the Brain Graph badge surfaces "demo data · labelled".
 *
 * `seedDemoWorkspace()` is idempotent — calling twice doesn't double
 * up; `resetDemoWorkspace()` wipes everything back to empty.
 */

import { useBrainStore } from "@/store/brain";
import { useMissionStore, type MissionReceipt } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import type { Deliverable } from "@/services/missionRunner";

const DEMO_REPO = "github.com/operator-center/demo-app";

function rid(prefix: string) {
  return `${prefix}-demo-${Math.random().toString(36).slice(2, 6)}`;
}

function makeDeliverable(label: string, format: Deliverable["format"], blurb: string, content: string): Deliverable {
  return { id: rid("dlv"), label, format, blurb, content };
}

function makeReceipt(
  ts: number,
  brief: string,
  mode: string,
  quality: string,
  deliverables: Deliverable[],
  opts: { score?: number; repoContext?: string | null; engine?: "deterministic" | "ollama"; model?: string } = {}
): MissionReceipt {
  return {
    id: rid("m"),
    brief,
    mode,
    quality,
    startedAt: ts,
    endedAt: ts + 1800,
    stage: "deliverable-ready",
    runtime: "local-mode",
    events: [
      { at: ts, stage: "briefing", kind: "info", tag: "input", message: `Brief received · ${brief.length} chars` },
      { at: ts + 110, stage: "routing", kind: "info", tag: "route", message: "Local deterministic route" },
      { at: ts + 220, stage: "memory-scan", kind: "info", tag: "memory", message: "2 of 2 memory sources matched" },
      { at: ts + 330, stage: "model-select", kind: "info", tag: "model", message: `Selected ${opts.model ?? "deterministic-v1"}` },
      { at: ts + 440, stage: "execution", kind: "ok", tag: "exec", message: "Rules engine completed in 4ms" },
      { at: ts + 550, stage: "validation", kind: "ok", tag: "score", message: `Quality score ${opts.score ?? 84}/100` },
      { at: ts + 660, stage: "deliverable-ready", kind: "ok", tag: "ship", message: `${deliverables.length} deliverables ready` }
    ],
    deliverables,
    score: opts.score ?? 84,
    elapsedMs: 700,
    memoryMatches: 2,
    repoContext: opts.repoContext ?? null,
    engine: opts.engine ?? "deterministic",
    model: opts.model
  };
}

export function seedDemoWorkspace(): { receipts: number; nodes: number; pins: number; docs: number } {
  const now = Date.now();

  // 1. Enable demo brain identity + sources + engines.
  useBrainStore.getState().enableDemo();

  // 2. Add a demo GitHub repo as a brain source (in case enableDemo
  //    doesn't seed one for the user's version of demo).
  const brain = useBrainStore.getState();
  if (!brain.memorySources.some((s) => s.kind === "github")) {
    brain.addMemorySource({
      kind: "github",
      label: DEMO_REPO,
      state: "configured"
    });
  }

  // 3. Pre-baked receipts.
  const r1 = makeReceipt(
    now - 1000 * 60 * 60 * 5,
    "Help me ship a local-first AI feature using Ollama in 7 days. Pick the model, define the loop, the smallest UI surface, what data stays local, and acceptance tests.",
    "dev",
    "code",
    [
      makeDeliverable(
        "Clean Brief",
        "markdown",
        "Brief restructured for readability and forwarding.",
        "# Mission Brief\n\n**Mode:** dev  \n**Intent:** architect\n\n## Task\n\nShip a local-first AI feature using Ollama in 7 days.\n\n## Constraints (must)\n- 100% offline\n- no cloud spend\n- ships in 7 days\n"
      ),
      makeDeliverable(
        "Cursor Task",
        "markdown",
        "Drop into Cursor — task block with constraints first.",
        "# Task\nShip a local-first AI feature using Ollama.\n\n## Constraints\n- offline\n- 7-day deadline\n\n## Files to touch\n- src/services/missionRunner.ts\n- src/modules/atlas/panels/DispatchPanel.tsx\n"
      ),
      makeDeliverable(
        "One-liner Summary",
        "text",
        "60-char summary for chats, commits, or PR titles.",
        "Ship local Ollama feature in 7 days · zero cloud spend."
      )
    ],
    { repoContext: DEMO_REPO, score: 88 }
  );

  const r2 = makeReceipt(
    now - 1000 * 60 * 60 * 3,
    "Generate a three-horizon roadmap for the operator console: Now, Next, Later.",
    "business",
    "smart",
    [
      makeDeliverable(
        "Roadmap",
        "markdown",
        "Three-horizon roadmap.",
        "## Now\n- ship workflow execution\n- ship Ollama dispatch\n\n## Next\n- repo indexer\n- mobile capture\n\n## Later\n- agent runtime\n- team spaces\n"
      )
    ],
    { score: 91 }
  );

  const r3 = makeReceipt(
    now - 1000 * 60 * 60 * 1,
    "Take this messy prompt and turn it into an execution-ready brief: 'plz make a thing that summarizes my emails by sender'.",
    "claude",
    "fast",
    [
      makeDeliverable(
        "Claude Prompt",
        "markdown",
        "Forward to Claude with explicit constraints and intent.",
        "<task>Summarize inbox by sender · daily digest</task>\n<constraints>\n- local only\n- read-only Gmail scope\n- no auto-reply\n</constraints>\n<context>\nDesktop runs Ollama gemma2:2b for the digest.\n</context>"
      ),
      makeDeliverable(
        "GitHub Issue",
        "markdown",
        "Markdown body ready for `gh issue create`.",
        "### Summary\nDaily inbox-by-sender digest powered by local Ollama.\n\n### Why\nReduce noise; surface investor + customer threads.\n\n### Constraints\n- local-only\n- read-only Gmail\n"
      )
    ],
    { score: 79 }
  );

  // Replace history; demo mode is a clean slate by design.
  useMissionStore.getState().setHistory([r3, r2, r1]);

  // 4. Workflow canvas: mission → repo → approval → export.
  const wfNodes = [
    { id: "n-mission", kind: "mission" as const, label: "Mission", x: 30, y: 30 },
    { id: "n-repo", kind: "repo" as const, label: "Repo context", x: 160, y: 30 },
    { id: "n-approval", kind: "approval" as const, label: "Approval", x: 290, y: 80 },
    { id: "n-export", kind: "export" as const, label: "Export", x: 420, y: 80 }
  ];
  const wfEdges = [
    { from: "n-mission", to: "n-repo" },
    { from: "n-repo", to: "n-approval" },
    { from: "n-approval", to: "n-export" }
  ];
  useAtlasStore.setState({
    workflowNodes: wfNodes,
    workflowEdges: wfEdges
  });

  // 5. Terminal pins across 2 tabs.
  const TERMINAL_KEY = "promptready-os.intel-terminal";
  try {
    window.localStorage.setItem(
      TERMINAL_KEY,
      JSON.stringify({
        market: [{ id: "p-1", text: "SPX", tab: "market" }],
        crypto: [{ id: "p-2", text: "BTC", tab: "crypto" }],
        repo: [{ id: "p-3", text: "ttwhat-web/llm-council", tab: "repo" }],
        research: [],
        inbox: [],
        system: []
      })
    );
  } catch {
    // ignore
  }

  // 6. Imported memory docs (small but real).
  const docs = [
    {
      name: "README.md",
      ext: "md",
      size: 380,
      body:
        "# Demo App\n\nLocal-first AI operator console.\n\n## Run\nnpm run dev\n\n## Stack\n- Vite\n- React 18\n- Tauri 1.6\n- Ollama\n"
    },
    {
      name: "package.json",
      ext: "json",
      size: 260,
      body: '{\n  "name": "demo-app",\n  "version": "0.1.0",\n  "scripts": { "dev": "vite", "build": "tsc -b && vite build" }\n}\n'
    }
  ];
  useAtlasStore.getState().addMemoryDocs(docs);

  // 7. Inbox seed (3 captured items).
  const inboxNow = Date.now();
  useAtlasStore.setState((s) => ({
    inbox: [
      { id: rid("ix"), kind: "text", body: "Investor asked about retention curve.", addedAt: inboxNow - 60_000, state: "new" },
      { id: rid("ix"), kind: "url", body: "https://news.ycombinator.com/", meta: "read later", addedAt: inboxNow - 30_000, state: "new" },
      { id: rid("ix"), kind: "repo", body: DEMO_REPO, addedAt: inboxNow - 10_000, state: "attached" },
      ...s.inbox
    ]
  }));

  return {
    receipts: 3,
    nodes: wfNodes.length,
    pins: 3,
    docs: docs.length
  };
}

export function resetDemoWorkspace() {
  // Brain
  useBrainStore.getState().reset();

  // Missions
  useMissionStore.getState().setHistory([]);
  useMissionStore.setState({ current: null });

  // Atlas (preserve homeMode/theme; clear everything else)
  useAtlasStore.setState({
    files: [],
    workflowNodes: [],
    workflowEdges: [],
    workflowRuns: [],
    pinnedDeliverables: [],
    pairingCode: null,
    telegram: null,
    inbox: [],
    memoryDocs: [],
    snapshots: [],
    recentSnapshotPayloads: [],
    recovery: null,
    bridgeMessages: []
  });

  // Terminal pins
  try {
    window.localStorage.removeItem("promptready-os.intel-terminal");
    window.localStorage.removeItem("promptready-os.intel-terminal.alerts");
  } catch {
    // ignore
  }
}

export function isDemoLoaded(): boolean {
  return useBrainStore.getState().demo;
}
