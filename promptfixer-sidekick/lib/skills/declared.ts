/**
 * Declared-but-not-yet-shipped skills.
 *
 * Each entry has a real meta (so the Operations Dashboard, command
 * palette, and `/api/skills` endpoint surface it), and a runner that
 * deliberately fails fast with `error: "not_implemented"`. The runner
 * is honest — no fake outputs, no mock data, no placeholder content.
 *
 * Ship path for each skill is documented in PROMPTOS.md; we promote
 * one declared skill at a time as its dependencies land (tools,
 * providers, memory backends).
 */

import { failed, type Skill, type SkillId, type SkillMeta } from "./types";

type DeclaredSkillSpec = SkillMeta;

const PLANNED_SKILLS: DeclaredSkillSpec[] = [
  {
    id: "code-debugger",
    name: "Code Debugger",
    description:
      "Stack trace + repro → root cause + minimal patched version. Reuses the prompt-fixer engine in dev mode plus a code-analysis tool when the file system is exposed.",
    tags: ["dev", "debug", "code"],
    triggers: ["debug", "fix-bug", "stacktrace"],
    status: "planned",
    risk: "safe",
    executionMode: "pipeline",
    requiresTools: ["files.read"],
    modelPreference: { quality: "code", bias: ["code", "reasoning"] },
    memorySupport: { read: true, write: false, namespace: "skill:code-debugger" }
  },
  {
    id: "ai-researcher",
    name: "AI Researcher",
    description:
      "Multi-source research synthesizer. Plans → fetches → synthesizes citations into a structured brief.",
    tags: ["research", "synthesis", "citations"],
    triggers: ["research", "investigate", "deep-dive"],
    status: "planned",
    risk: "safe",
    executionMode: "agent",
    requiresTools: ["http.fetch"],
    modelPreference: { quality: "expert", bias: ["research", "long-context"] },
    memorySupport: { read: true, write: true, namespace: "skill:ai-researcher" }
  },
  {
    id: "crypto-analyst",
    name: "Crypto Analyst",
    description:
      "On-chain + market data → trade thesis with explicit invalidation levels. Pure analysis; never executes orders.",
    tags: ["finance", "crypto", "analysis"],
    triggers: ["analyse", "thesis", "market"],
    status: "planned",
    risk: "safe",
    executionMode: "agent",
    requiresTools: ["http.fetch"],
    modelPreference: { quality: "expert", bias: ["reasoning"] }
  },
  {
    id: "screenshot-analyzer",
    name: "Screenshot Analyzer",
    description:
      "Vision-capable model reads a screenshot and extracts UI patterns, copy, layout decisions, and inferred user flows.",
    tags: ["vision", "ux", "design"],
    triggers: ["screenshot", "ui", "analyze-image"],
    status: "planned",
    risk: "safe",
    executionMode: "single-shot",
    requiresTools: ["files.read"],
    modelPreference: { quality: "expert", bias: ["reasoning"] }
  },
  {
    id: "terminal-assistant",
    name: "Terminal Assistant",
    description:
      "Shell automation with the safety screen + dry-run gate. The actual `terminal.exec` tool is approval-tier and never runs without explicit consent.",
    tags: ["ops", "shell", "terminal"],
    triggers: ["terminal", "shell", "ops"],
    status: "planned",
    risk: "approval",
    executionMode: "agent",
    requiresTools: ["terminal.exec"],
    modelPreference: { quality: "code" }
  },
  {
    id: "deployment-assistant",
    name: "Deployment Assistant",
    description:
      "Walks a deploy: pre-checks, rollout steps, validation, rollback. Triggers via `deploy.trigger` (approval-tier) only with explicit consent per call.",
    tags: ["ops", "deploy"],
    triggers: ["deploy", "ship", "release"],
    status: "planned",
    risk: "approval",
    executionMode: "agent",
    requiresTools: ["deploy.trigger", "github.create-pr"],
    modelPreference: { quality: "code" }
  },
  {
    id: "marketing-generator",
    name: "Marketing Generator",
    description:
      "Brand-tone-aware launch copy: landing hero, email sequence, social variants. Pulls brand context from project memory.",
    tags: ["marketing", "copy"],
    triggers: ["marketing", "copy", "launch"],
    status: "planned",
    risk: "safe",
    executionMode: "pipeline",
    requiresTools: [],
    modelPreference: { quality: "smart", bias: ["fast"] },
    memorySupport: { read: true, write: false, namespace: "project" }
  },
  {
    id: "outreach-agent",
    name: "Outreach Agent",
    description:
      "Personalised cold-outreach drafts. Reads research memory; never sends — drafts only.",
    tags: ["sales", "outreach"],
    triggers: ["outreach", "cold-email"],
    status: "planned",
    risk: "safe",
    executionMode: "single-shot",
    requiresTools: [],
    modelPreference: { quality: "smart" },
    memorySupport: { read: true, write: false, namespace: "project" }
  },
  {
    id: "vision-analyzer",
    name: "Vision Analyzer",
    description:
      "General-purpose image understanding: charts, diagrams, photos. Output structure depends on detected content type.",
    tags: ["vision", "analysis"],
    triggers: ["vision", "image", "analyze"],
    status: "planned",
    risk: "safe",
    executionMode: "single-shot",
    requiresTools: ["files.read"],
    modelPreference: { quality: "expert" }
  },
  {
    id: "workflow-builder",
    name: "Workflow Builder",
    description:
      "Conversational composer for Workflow definitions. Outputs a typed WorkflowDefinition the runner can execute.",
    tags: ["meta", "workflow", "composer"],
    triggers: ["workflow", "build-flow", "compose"],
    status: "planned",
    risk: "safe",
    executionMode: "single-shot",
    requiresTools: [],
    modelPreference: { quality: "smart", bias: ["reasoning"] },
    memorySupport: { read: true, write: true, namespace: "stacks" }
  }
];

export function plannedSkills(): Skill<unknown, unknown>[] {
  return PLANNED_SKILLS.map((meta) => ({
    meta,
    async run(): Promise<ReturnType<typeof failed>> {
      return failed("not_implemented", { elapsedMs: 0 });
    }
  }));
}

export function isShippedSkillId(id: SkillId): boolean {
  return id === "prompt-fixer" || id === "prompt-cleaner" || id === "architect";
}
