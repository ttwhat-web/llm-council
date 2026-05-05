/**
 * Lightweight, deterministic prompt scoring.
 *
 * Four 0-100 axes. The numbers are derived purely from the rendered prompt
 * + sections + safety report — no LLM call. Intent: a "premium feel" badge
 * that gives users confidence and surfaces obvious gaps. Not a benchmark.
 */

import type { Mode, PromptSections, SafetyReport, ScoreCard } from "./types";

const HEDGE_WORDS =
  /\b(maybe|perhaps|possibly|might|could|sort of|kind of|somewhat|generally|usually|likely|probably)\b/gi;
const STRONG_VERBS =
  /\b(produce|return|deliver|emit|enforce|forbid|require|verify|cite|prove|measure|reject|refuse)\b/gi;
const VAGUE_WORDS = /\b(good|nice|clean|better|optimal|efficient|robust|simple)\b/gi;
const NUMBER_OR_BOUND = /\b(\d+|n\/a|<=|>=|<|>|max|min|cap|limit|exactly|at most|at least)\b/i;

export function scorePrompt(
  prompt: string,
  sections: PromptSections,
  mode: Mode,
  safety: SafetyReport
): ScoreCard {
  return {
    clarity: clarity(prompt, sections),
    specificity: specificity(sections),
    safety: safetyScore(safety),
    modelFit: modelFit(prompt, sections, mode)
  };
}

// ---------- axes ----------

function clarity(prompt: string, s: PromptSections): number {
  let score = 0;

  // Has all five sections populated.
  const sectionsPresent = [s.role, s.task, s.context, s.outputFormat].filter(
    (x) => x && x.trim().length > 0
  ).length;
  score += (sectionsPresent / 4) * 35;
  if (s.constraints.length > 0) score += 5;

  // Average sentence length on the rendered prompt.
  const sentences = prompt.split(/[.!?]\s+/).filter((x) => x.trim().length > 0);
  if (sentences.length > 0) {
    const avgWords =
      sentences.reduce((acc, x) => acc + x.split(/\s+/).length, 0) / sentences.length;
    if (avgWords >= 8 && avgWords <= 28) score += 25;
    else if (avgWords >= 5 && avgWords <= 36) score += 15;
    else score += 5;
  }

  // Hedging penalty.
  const hedges = (prompt.match(HEDGE_WORDS) || []).length;
  score += Math.max(0, 20 - hedges * 4);

  // Strong verbs reward.
  const strongs = (prompt.match(STRONG_VERBS) || []).length;
  score += Math.min(15, strongs * 3);

  return clamp(score);
}

function specificity(s: PromptSections): number {
  let score = 0;

  // Constraint count + quality.
  const c = s.constraints.length;
  if (c >= 3) score += 25;
  else if (c >= 1) score += 15;

  const quantConstraints = s.constraints.filter((line) => NUMBER_OR_BOUND.test(line)).length;
  score += Math.min(20, quantConstraints * 7);

  // Output format detail.
  const ofmt = s.outputFormat || "";
  if (ofmt.length > 30) score += 15;
  if (NUMBER_OR_BOUND.test(ofmt)) score += 10;
  if (/(json|markdown|yaml|table|fenced|diff|xml|<\w)/i.test(ofmt)) score += 10;

  // Vague-word penalty across task + constraints.
  const hay = `${s.task}\n${s.constraints.join("\n")}`;
  const vague = (hay.match(VAGUE_WORDS) || []).length;
  score += Math.max(0, 20 - vague * 5);

  return clamp(score);
}

function safetyScore(report: SafetyReport): number {
  if (!report.findings.length) return 100;
  const worst = report.findings.reduce(
    (acc, f) => Math.max(acc, severityRank(f.severity)),
    0
  );
  // critical=4, high=3, medium=2, low=1
  switch (worst) {
    case 4:
      return 0;
    case 3:
      return 30;
    case 2:
      return 60;
    case 1:
      return 80;
    default:
      return 100;
  }
}

function modelFit(prompt: string, s: PromptSections, mode: Mode): number {
  let score = 40; // baseline — engine always renders the right shell

  switch (mode) {
    case "claude":
      if (/<role>[\s\S]*<\/role>/.test(prompt)) score += 30;
      if (/<output_format>[\s\S]*<\/output_format>/.test(prompt)) score += 15;
      if (/<thinking>|<answer>/i.test(prompt)) score += 15;
      break;
    case "chatgpt":
      if (/^#\s+Role/m.test(prompt)) score += 25;
      if (/^#\s+Output Format/m.test(prompt)) score += 15;
      if (/Next Steps/i.test(prompt)) score += 10;
      if (/```/.test(prompt)) score += 10;
      break;
    case "cursor":
      if (/(diff|file path|###\s+\S+\/)/i.test(prompt)) score += 30;
      if (/verify/i.test(prompt)) score += 15;
      if (/```diff|---|\+\+\+/.test(prompt)) score += 15;
      break;
    case "dev":
      if (/```/.test(prompt)) score += 20;
      if (/why|verify|edge cases?/i.test(prompt)) score += 20;
      if (/(typescript|python|node|rust|go|java)/i.test(prompt)) score += 10;
      break;
    case "terminal":
      if (/(rollback|dry[- ]run|annotated)/i.test(prompt)) score += 30;
      if (/```/.test(prompt)) score += 15;
      if (/(`#\s)/.test(prompt)) score += 15;
      break;
    case "business":
      if (/TL;DR/i.test(prompt)) score += 25;
      if (/recommendation/i.test(prompt)) score += 15;
      if (/(stakeholder|exec|board|quarter)/i.test(prompt)) score += 10;
      if (/open questions?/i.test(prompt)) score += 10;
      break;
    case "as400":
      if (/(library list|journaling|backout|audit)/i.test(prompt)) score += 30;
      if (/(\*PGM|\*MODULE|\*FILE|CL|RPG|DB2)/i.test(prompt)) score += 20;
      if (/numbered procedure/i.test(prompt)) score += 10;
      break;
    case "general":
    default:
      if (s.outputFormat.length > 20) score += 20;
      if (s.constraints.length >= 3) score += 20;
      break;
  }

  return clamp(score);
}

// ---------- helpers ----------

function severityRank(sev: string): number {
  switch (sev) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
