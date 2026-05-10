/**
 * Output exports — pure client-side formatters that wrap the rendered
 * execution-ready prompt in the requested deliverable shape. No backend
 * call, no AI inference.
 */

import { renderPrompt } from "./engine";
import type { FixResponse } from "./types";

export type ExportFormat =
  | "claude-prompt"
  | "chatgpt-prompt"
  | "gemini-prompt"
  | "cursor-task"
  | "markdown-spec"
  | "prd"
  | "technical-plan"
  | "terminal-script"
  | "terminal-safe-command"
  | "jira-ticket"
  | "github-issue";

export interface ExportDef {
  id: ExportFormat;
  label: string;
  blurb: string;
  filename: (r: FixResponse) => string;
  format: (r: FixResponse) => string;
}

export const EXPORT_DEFS: ExportDef[] = [
  {
    id: "claude-prompt",
    label: "Claude Prompt",
    blurb: "Optimised for Anthropic Claude — XML blocks, assumptions, no filler.",
    filename: () => "claude-prompt.md",
    format: (r) => {
      // Rebuild in Claude's preferred XML shape regardless of the source mode,
      // so a "Claude Prompt" export is always Claude-shaped output.
      const xml = renderPrompt(r.sections, "claude");
      return [
        "<!-- Claude-optimised prompt. Paste into Claude. -->",
        "",
        xml,
        "",
        "<assumptions>",
        "Before producing the deliverable, list the assumptions you made (≤5 bullets) instead of asking clarifying questions. Only flag genuine ambiguities; don't restate the prompt.",
        "</assumptions>",
        "",
        "<thinking>",
        "Use this block only when reasoning is non-trivial. Keep it short and structured.",
        "</thinking>",
        "",
        "Produce the deliverable inside <answer>...</answer>. Lead with the answer; justify after."
      ].join("\n");
    }
  },
  {
    id: "chatgpt-prompt",
    label: "ChatGPT Prompt",
    blurb: "Optimised for OpenAI ChatGPT — markdown, action-first.",
    filename: () => "chatgpt-prompt.md",
    format: (r) => {
      const md = renderPrompt(r.sections, "chatgpt");
      return [
        md,
        "",
        "# Assumptions",
        "List explicit assumptions before answering. Don't stall on ambiguity — pick a reasonable call and note it here.",
        "",
        "When ready, produce the deliverable. End with a single 'Next Steps' bullet list (max 3 items)."
      ].join("\n");
    }
  },
  {
    id: "gemini-prompt",
    label: "Gemini Prompt",
    blurb: "Optimised for Google Gemini — headings + JSON / YAML structure.",
    filename: () => "gemini-prompt.md",
    format: (r) => {
      const md = renderPrompt(r.sections, "gemini");
      return [
        md,
        "",
        "## Assumptions",
        "List the assumptions you made before answering. Mark estimates as estimates and cite sources where applicable.",
        "",
        "Embed any structured deliverable inside fenced ```json or ```yaml blocks."
      ].join("\n");
    }
  },
  {
    id: "cursor-task",
    label: "Cursor Task",
    blurb: "Hand to Cursor as a focused task description.",
    filename: () => "cursor-task.md",
    format: (r) =>
      [
        "# Cursor Task",
        "",
        "**Objective:** " + oneLine(r.sections.task),
        "",
        "## Context",
        r.sections.context,
        "",
        "## Constraints",
        ...r.sections.constraints.map((c) => `- ${c}`),
        "",
        "## Output expectation",
        r.sections.outputFormat,
        "",
        "## Full prompt (paste into the agent)",
        "```",
        r.prompt,
        "```"
      ].join("\n")
  },
  {
    id: "markdown-spec",
    label: "Markdown Spec",
    blurb: "Tidy markdown with the prompt body.",
    filename: () => "spec.md",
    format: (r) => [`# Spec`, ``, `_Mode: ${r.mode}_`, ``, r.prompt].join("\n")
  },
  {
    id: "prd",
    label: "PRD",
    blurb: "Product requirements doc skeleton wrapping the prompt.",
    filename: () => "prd.md",
    format: (r) =>
      [
        "# Product Requirements Document",
        "",
        "## Problem",
        oneLine(r.sections.context),
        "",
        "## Solution",
        oneLine(r.sections.task),
        "",
        "## Constraints",
        ...r.sections.constraints.map((c) => `- ${c}`),
        "",
        "## Success Metrics",
        "- TBD — quantify via Output Format below.",
        "",
        "## Output Format",
        r.sections.outputFormat,
        "",
        "## Execution-ready prompt",
        "```",
        r.prompt,
        "```"
      ].join("\n")
  },
  {
    id: "technical-plan",
    label: "Technical Plan",
    blurb: "Engineering plan with role + risks framing.",
    filename: () => "technical-plan.md",
    format: (r) =>
      [
        "# Technical Plan",
        "",
        "## Role",
        r.sections.role,
        "",
        "## Plan",
        r.sections.task,
        "",
        "## Constraints",
        ...r.sections.constraints.map((c) => `- ${c}`),
        "",
        "## Risks & Mitigations",
        "- TBD — review against Constraints above.",
        "",
        "## Verification",
        r.sections.outputFormat
      ].join("\n")
  },
  {
    id: "terminal-safe-command",
    label: "Terminal Safe Command",
    blurb:
      "Shell-safe deliverable. Refuses if the prompt contains destructive ops or wasn't built in Terminal mode.",
    filename: () => "safe-command.sh",
    format: (r) => formatTerminalSafeCommand(r)
  },
  {
    id: "terminal-script",
    label: "Terminal Script",
    blurb: "Shell-ready script (commented, with rollback section).",
    filename: () => "run.sh",
    format: (r) =>
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "",
        "# ---- " + oneLine(r.sections.task),
        "# Mode: " + r.mode,
        "# Generated by PromptFixer · AI Command Center",
        "",
        "# Constraints:",
        ...r.sections.constraints.map((c) => `# - ${c}`),
        "",
        "# Execution-ready prompt:",
        ...r.prompt.split("\n").map((l) => "# " + l),
        "",
        "echo 'Edit this script before running.'"
      ].join("\n")
  },
  {
    id: "jira-ticket",
    label: "Jira Ticket",
    blurb: "Description body for a Jira issue.",
    filename: () => "jira-ticket.txt",
    format: (r) =>
      [
        `Summary: ${oneLine(r.sections.task).slice(0, 80)}`,
        "",
        "Description:",
        r.sections.context,
        "",
        "Acceptance Criteria:",
        ...r.sections.constraints.map((c, i) => `${i + 1}. ${c}`),
        "",
        "Definition of Done:",
        r.sections.outputFormat,
        "",
        "Execution-ready prompt:",
        r.prompt
      ].join("\n")
  },
  {
    id: "github-issue",
    label: "GitHub Issue",
    blurb: "Issue body with checklist.",
    filename: () => "github-issue.md",
    format: (r) =>
      [
        `### ${oneLine(r.sections.task).slice(0, 90)}`,
        "",
        "**Context**",
        r.sections.context,
        "",
        "**Acceptance criteria**",
        ...r.sections.constraints.map((c) => `- [ ] ${c}`),
        "",
        "**Output expectation**",
        r.sections.outputFormat,
        "",
        "<details><summary>Execution-ready prompt</summary>",
        "",
        "```",
        r.prompt,
        "```",
        "",
        "</details>"
      ].join("\n")
  }
];

export const EXPORT_BY_ID: Record<ExportFormat, ExportDef> = EXPORT_DEFS.reduce(
  (acc, def) => {
    acc[def.id] = def;
    return acc;
  },
  {} as Record<ExportFormat, ExportDef>
);

function oneLine(text: string): string {
  return (text || "").trim().replace(/\s+/g, " ");
}

/**
 * Conservative shell-safety screen for the Terminal Safe Command export.
 * The intent is *refuse, don't transform*: if anything in the rendered
 * prompt looks destructive, we hand the user a refusal note, not an
 * "auto-cleaned" command they might paste into a real shell.
 */
const TERMINAL_DESTRUCTIVE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\brm\s+-rf?\b/i, reason: "rm -rf detected" },
  { pattern: /\bsudo\s+rm\b/i, reason: "sudo rm detected" },
  { pattern: /\bmkfs(?:\.\w+)?\b/i, reason: "filesystem format command" },
  { pattern: /\bdd\s+if=/i, reason: "raw dd write" },
  { pattern: />\s*\/dev\/sd[a-z]/i, reason: "redirect to raw block device" },
  { pattern: /\bshutdown\b|\breboot\b|\bhalt\b|\bpoweroff\b/i, reason: "system power command" },
  { pattern: /\bchmod\s+(?:777|-R\s+777)\b/i, reason: "world-writable chmod" },
  { pattern: /:\(\)\s*{\s*:\|:&\s*}/, reason: "fork-bomb signature" },
  { pattern: /\bcurl\b[^|\n]*\|\s*sh\b/i, reason: "curl | sh remote-execute" },
  { pattern: /\bwget\b[^|\n]*\|\s*sh\b/i, reason: "wget | sh remote-execute" },
  { pattern: /\bDROP\s+(?:TABLE|DATABASE)\b/i, reason: "destructive SQL drop" },
  { pattern: /\bTRUNCATE\s+TABLE\b/i, reason: "destructive SQL truncate" }
];

function screenTerminalShell(text: string): { safe: boolean; reasons: string[] } {
  const reasons: string[] = [];
  for (const { pattern, reason } of TERMINAL_DESTRUCTIVE_PATTERNS) {
    if (pattern.test(text)) reasons.push(reason);
  }
  return { safe: reasons.length === 0, reasons: dedupeStrings(reasons) };
}

function dedupeStrings(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of list) if (!seen.has(s)) (seen.add(s), out.push(s));
  return out;
}

function formatTerminalSafeCommand(r: FixResponse): string {
  const refusal = (notes: string[]): string =>
    [
      "# Refused — Terminal Safe Command",
      "#",
      ...notes.map((n) => `# - ${n}`),
      "#",
      "# Nothing was generated. Re-run in Terminal mode and remove",
      "# destructive operations before exporting again."
    ].join("\n");

  // Hard refusal — the safety screen on the server flagged the prompt.
  if (r.safety.blocked) {
    return refusal([
      "Server-side safety screen blocked the prompt.",
      ...r.safety.findings.map((f) => `${f.severity.toUpperCase()}: ${f.reason}`)
    ]);
  }

  // Mode gate — only Terminal mode should be exported as a shell deliverable.
  // Transforming a "claude" or "general" prompt into shell would be a
  // foot-gun. Refuse instead.
  if (r.mode !== "terminal") {
    return refusal([
      `Prompt was built in "${r.mode}" mode, not "terminal".`,
      "Terminal Safe Command refuses to coerce non-shell prompts into shell."
    ]);
  }

  const screen = screenTerminalShell(r.prompt);
  if (!screen.safe) {
    return refusal([
      "Destructive shell pattern detected in the rendered prompt:",
      ...screen.reasons
    ]);
  }

  // Passed all gates — emit a commented, non-executing shell deliverable.
  // We never produce an auto-runnable script; the user must read it,
  // adapt it, and run it themselves.
  return [
    "#!/usr/bin/env bash",
    "# ---- Terminal Safe Command",
    "# Mode: terminal",
    "# Generated by PromptFixer · safety-screened",
    "#",
    "# This file is intentionally NOT auto-executable. Read it,",
    "# adapt paths and inputs to your environment, then run it",
    "# yourself in a sandbox first.",
    "set -euo pipefail",
    "",
    "# Constraints from the optimised prompt:",
    ...r.sections.constraints.map((c) => `# - ${c}`),
    "",
    "# Execution-ready prompt (commented for review):",
    ...r.prompt.split("\n").map((l) => "# " + l),
    "",
    "echo 'Review the constraints and prompt above. Replace this echo",
    "      with the command you actually want to run.'"
  ].join("\n");
}
