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
