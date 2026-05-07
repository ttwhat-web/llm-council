/**
 * Operator-tier "Agent Actions" — high-leverage starting points that
 * load a specialised template into the input and pin the right mode.
 *
 * No backend changes; each action is just a curated template + mode.
 * The chips render in PromptFixer's secondary control row, badged
 * "Operator" because they're aimed at users running real ops.
 */

import type { Mode } from "./types";

export interface AgentAction {
  id: string;
  label: string;
  blurb: string;
  body: string;
  mode: Mode;
}

export const AGENT_ACTIONS: AgentAction[] = [
  {
    id: "fix-repo",
    label: "Fix repo",
    blurb: "Audit a repo, fix what's broken, leave the rest.",
    mode: "dev",
    body: [
      "Repo:",
      "[paste tree or paths]",
      "",
      "Symptom:",
      "[failing tests / error / regression]",
      "",
      "Constraints:",
      "- Touch the minimum number of files.",
      "- Preserve public API and existing tests.",
      "- Add a regression test for the failure.",
      "",
      "Produce a unified diff and a short rationale per file."
    ].join("\n")
  },
  {
    id: "review-diff",
    label: "Review diff",
    blurb: "Senior-level review of a diff with severity ranking.",
    mode: "dev",
    body: [
      "Review the diff below as a senior engineer.",
      "",
      "```diff",
      "[paste diff]",
      "```",
      "",
      "Return findings grouped by severity (Critical / Important / Nit).",
      "Each finding: file, line, the problem, the concrete fix.",
      "Skip style nits unless they hide a real bug."
    ].join("\n")
  },
  {
    id: "explain-error",
    label: "Explain error",
    blurb: "Stack trace → root cause + minimal fix.",
    mode: "dev",
    body: [
      "Error / stack trace:",
      "```",
      "[paste]",
      "```",
      "",
      "Surrounding code:",
      "```",
      "[paste]",
      "```",
      "",
      "Identify the root cause (one short paragraph), then the smallest correct fix as a code block."
    ].join("\n")
  },
  {
    id: "pr-description",
    label: "PR description",
    blurb: "Diff → PR description ready to paste into GitHub.",
    mode: "business",
    body: [
      "Diff summary:",
      "[paste `git diff --stat` or a brief description]",
      "",
      "Context the reviewer needs:",
      "- Why this change",
      "- What it doesn't do",
      "- How to verify",
      "",
      "Produce a PR description with: Summary, Why, How to verify, Risks. Keep it concise."
    ].join("\n")
  },
  {
    id: "deploy-checklist",
    label: "Deploy checklist",
    blurb: "Pre-deploy checks for the change at hand.",
    mode: "terminal",
    body: [
      "Service: [name]",
      "Change: [one-line description]",
      "Environment: [staging / production]",
      "",
      "Produce a deployment checklist:",
      "1. Pre-deploy verifications (commands + expected output)",
      "2. Deploy steps (with rollback for each)",
      "3. Post-deploy validation",
      "4. Rollback procedure if validation fails"
    ].join("\n")
  },
  {
    id: "cursor-task",
    label: "Cursor task",
    blurb: "Convert intent into a Cursor-ready edit task.",
    mode: "cursor",
    body: [
      "What I want changed:",
      "[describe the edit]",
      "",
      "Affected files (if known):",
      "- src/...",
      "",
      "Produce a Cursor-friendly task: file paths first, unified-diff blocks per file, single 'Verify' command at the end."
    ].join("\n")
  },
  {
    id: "debug-strategy",
    label: "Debug strategy",
    blurb: "Plan the bisect — not the fix, the strategy.",
    mode: "dev",
    body: [
      "Bug: [one-line]",
      "Last known good: [version / commit / date]",
      "Currently broken in: [version / commit / branch]",
      "Repro:",
      "1. ...",
      "",
      "Produce a debugging strategy: hypotheses ranked by likelihood, evidence to gather, bisect plan, escape hatch if it can't be reproduced."
    ].join("\n")
  }
];
