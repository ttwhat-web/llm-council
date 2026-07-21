/**
 * Output transformation actions.
 *
 * Each action is either a content transform (shorter / stronger / safer /
 * split-steps) or a target-mode conversion (to-claude / to-chatgpt /
 * to-cursor / to-terminal). The action is applied to a previous result,
 * not to raw input.
 *
 * Two execution paths:
 *   1. AI path — the supervisor receives the previous sections plus a
 *      transform instruction and returns a new sections JSON.
 *   2. Deterministic path — when no AI engine is reachable, a pure JS
 *      transform mutates sections enough to be useful (e.g. trim
 *      constraints, append a constraint, swap mode).
 */

import type { Mode, OutputAction, PromptSections } from "./types";

export interface ActionDef {
  id: OutputAction;
  label: string;
  short: string;
  group: "transform" | "convert";
  /** Extra instruction appended to the supervisor's system message. */
  instruction: string;
  /** Optional mode swap. When set, the prompt is re-rendered in this mode. */
  modeOverride?: Mode;
  /** Pure-JS fallback used when the AI path is unavailable. */
  deterministic: (sections: PromptSections) => PromptSections;
}

const appendConstraint =
  (line: string) =>
  (s: PromptSections): PromptSections => ({
    ...s,
    constraints: [...s.constraints, line]
  });

const overrideOutput =
  (line: string) =>
  (s: PromptSections): PromptSections => ({
    ...s,
    outputFormat: line
  });

export const ACTIONS: Record<OutputAction, ActionDef> = {
  shorter: {
    id: "shorter",
    label: "Make shorter",
    short: "Shorter",
    group: "transform",
    instruction:
      "Compress this prompt by ~40%. Cut filler, redundancy, weak adverbs, and any constraint that overlaps another. Preserve every distinct requirement.",
    deterministic: (s) => ({
      ...s,
      task: trimSentence(s.task),
      context: trimSentence(s.context),
      constraints: dedupeConstraints(s.constraints).slice(0, 4),
      outputFormat: trimSentence(s.outputFormat)
    })
  },
  stronger: {
    id: "stronger",
    label: "Make stronger",
    short: "Stronger",
    group: "transform",
    instruction:
      "Strengthen this prompt: add precise success criteria, demand evidence/citations where applicable, forbid hedging and filler, replace vague verbs with measurable ones. Do not introduce new scope.",
    deterministic: appendConstraint(
      "Be specific and quantitative. Replace 'good', 'better', 'clean' with measurable criteria. No hedging."
    )
  },
  safer: {
    id: "safer",
    label: "Make safer",
    short: "Safer",
    group: "transform",
    instruction:
      "Add explicit safety constraints: refuse on dangerous output, require clarification for ambiguous requests, demand reversibility / dry-run for destructive operations, surface assumptions before acting.",
    deterministic: appendConstraint(
      "Refuse anything destructive without an explicit confirmation step. Surface assumptions before acting. Provide a rollback for any state-changing operation."
    )
  },
  "split-steps": {
    id: "split-steps",
    label: "Split into steps",
    short: "Steps",
    group: "transform",
    instruction:
      "Restructure this prompt as a numbered, ordered procedure. Each step has a single objective and a measurable outcome. Keep the same constraints.",
    deterministic: overrideOutput(
      "Numbered procedure. Each step: (1) objective, (2) action, (3) measurable outcome. Maximum 7 steps."
    )
  },
  "to-claude": {
    id: "to-claude",
    label: "Convert to Claude",
    short: "→ Claude",
    group: "convert",
    instruction:
      "Reformat this prompt for Anthropic Claude — XML tagged sections (<role>, <task>, <context>, <constraints>, <output_format>), calm tone, request <thinking> only when reasoning is non-trivial.",
    modeOverride: "claude",
    deterministic: (s) => s
  },
  "to-chatgpt": {
    id: "to-chatgpt",
    label: "Convert to ChatGPT",
    short: "→ ChatGPT",
    group: "convert",
    instruction:
      "Reformat this prompt for OpenAI ChatGPT — markdown headings, action-first wording, concise bullets, no XML.",
    modeOverride: "chatgpt",
    deterministic: (s) => s
  },
  "to-cursor": {
    id: "to-cursor",
    label: "Convert to Cursor",
    short: "→ Cursor",
    group: "convert",
    instruction:
      "Reformat this prompt for the Cursor IDE agent — lead with file paths, demand minimal unified-diff edits, forbid prose preamble, end with a single 'Verify' command.",
    modeOverride: "cursor",
    deterministic: (s) => s
  },
  "to-terminal": {
    id: "to-terminal",
    label: "Convert to Terminal",
    short: "→ Terminal",
    group: "convert",
    instruction:
      "Reformat this prompt for shell automation — annotated commands, dry-run first, explicit rollback section, refuse destructive commands without confirmation.",
    modeOverride: "terminal",
    deterministic: (s) => s
  }
};

export const ACTION_LIST: ActionDef[] = Object.values(ACTIONS);

export function isOutputAction(value: unknown): value is OutputAction {
  return typeof value === "string" && value in ACTIONS;
}

// ---------- helpers ----------

function trimSentence(text: string): string {
  if (!text) return text;
  // Keep the first 1-2 sentences; cap at ~280 chars.
  const match = text.trim().match(/^[\s\S]{0,280}?(?:[.!?](?:\s|$)|$)/);
  return (match?.[0] || text.slice(0, 280)).trim();
}

function dedupeConstraints(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of items) {
    const key = c.toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}
