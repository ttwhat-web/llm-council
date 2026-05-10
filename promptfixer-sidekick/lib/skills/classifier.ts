/**
 * Live skill classifier.
 *
 * Pure-JS scoring over the input text. Runs client-side on every
 * keystroke (debounced by the caller) and ranks the registry's shipped
 * skills by how well the input fits each one.
 *
 * Signals:
 *   - trigger token matches    (skill.meta.triggers)
 *   - input length             (long inputs bias toward fixer + architect)
 *   - code / fenced blocks
 *   - error / stack trace
 *   - markdown / document
 *   - shell / terminal cues
 *   - architecture / build cues
 *   - prompt-engineering keywords
 *
 * Returns the top-N suggestions whose score crosses MIN_SCORE so the UI
 * never renders junk recommendations.
 */

import type { Skill, SkillId } from "./types";
import { listShippedSkills } from "./registry";

const MIN_SCORE = 12;

export interface ClassifierFeatures {
  length: number;
  hasFencedCode: boolean;
  hasInlineCode: boolean;
  hasStackTrace: boolean;
  hasMarkdown: boolean;
  hasShellCommand: boolean;
  isQuestion: boolean;
  hasArchitectureCues: boolean;
  hasCleanCues: boolean;
  hasZeroWidth: boolean;
  hasSmartQuotes: boolean;
  hasPromptKeywords: number;
  hasModelMentions: number;
}

export interface SkillSuggestion {
  skillId: SkillId;
  score: number; // 0..100
  reasons: string[];
}

const RX = {
  fencedCode: /```/,
  inlineCode: /`[^`\n]+`/,
  stackTrace:
    /(at\s+\w+\s*\(.+?:\d+:\d+\))|(^TypeError|^ReferenceError|^SyntaxError|^Error)|(^\s*Traceback \(most recent call last\))|(\bstack ?trace\b)/im,
  markdown: /^(#{1,6}\s|\*\s|-\s|\d+\.\s)/m,
  shell:
    /\b(sudo|npm|yarn|pnpm|git|curl|wget|chmod|chown|brew|apt-get|systemctl|docker|kubectl|terraform|psql|mysql)\b/,
  architecture:
    /\b(build|create|design|architect(?:ure)?|system|app|backend|frontend|infra(?:structure)?|pipeline|microservice|api|database|schema|deploy|stack)\b/i,
  cleanCues:
    /\b(clean|cleanup|messy|paste|strip|sanitize|smart ?quotes?|fix\s+formatting)\b/i,
  zeroWidth: /[​-‏‪-‮⁠﻿]/,
  smartQuotes: /[‘’“”]/,
  promptKeywords:
    /\b(prompt|llm|tokens?|context|system\s+message|few[- ]?shot|chain[- ]?of[- ]?thought|optimi[sz]e\s+prompt)\b/gi,
  modelMentions: /\b(claude|chatgpt|gpt-?\d|openai|gemini|cursor|kimi|ollama)\b/gi
} as const;

export function extractFeatures(input: string): ClassifierFeatures {
  const text = input || "";
  return {
    length: text.length,
    hasFencedCode: RX.fencedCode.test(text),
    hasInlineCode: RX.inlineCode.test(text),
    hasStackTrace: RX.stackTrace.test(text),
    hasMarkdown: RX.markdown.test(text),
    hasShellCommand: RX.shell.test(text),
    isQuestion: /\?\s*$/.test(text.trim()),
    hasArchitectureCues: RX.architecture.test(text),
    hasCleanCues: RX.cleanCues.test(text),
    hasZeroWidth: RX.zeroWidth.test(text),
    hasSmartQuotes: RX.smartQuotes.test(text),
    hasPromptKeywords: countMatches(text, RX.promptKeywords),
    hasModelMentions: countMatches(text, RX.modelMentions)
  };
}

export function classifyInput(
  input: string,
  opts: { topN?: number } = {}
): SkillSuggestion[] {
  const text = (input || "").trim();
  if (text.length < 6) return [];

  const features = extractFeatures(text);
  const topN = opts.topN ?? 3;

  const ranked = listShippedSkills()
    .map((s) => scoreSkill(s, features, text))
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, topN);
}

// ---------- per-skill scoring --------------------------------------------

function scoreSkill(skill: Skill, f: ClassifierFeatures, text: string): SkillSuggestion {
  const lower = text.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // Trigger matches — universal across skills.
  for (const trig of skill.meta.triggers) {
    if (lower.includes(trig)) {
      score += 30;
      reasons.push(`mentions “${trig}”`);
      break; // multiple triggers from the same skill don't compound
    }
  }

  switch (skill.meta.id) {
    case "prompt-fixer": {
      // The default "always something useful here" recommendation —
      // baseline + bumps for any prompt-shaped signal.
      score += 8;
      if (f.length >= 30) {
        score += 12;
      }
      if (f.length >= 200) {
        score += 8;
        reasons.push("long input — structure helps");
      }
      if (f.hasPromptKeywords > 0) {
        score += Math.min(20, f.hasPromptKeywords * 6);
        reasons.push("prompt-engineering wording");
      }
      if (f.hasModelMentions > 0) {
        score += Math.min(12, f.hasModelMentions * 4);
        reasons.push("targets a specific model");
      }
      if (f.isQuestion) {
        score += 6;
      }
      break;
    }

    case "prompt-cleaner": {
      // Cleaner wins on noisy paste signals.
      if (f.hasZeroWidth) {
        score += 28;
        reasons.push("zero-width characters detected");
      }
      if (f.hasSmartQuotes) {
        score += 16;
        reasons.push("smart quotes detected");
      }
      if (f.hasCleanCues) {
        score += 18;
        reasons.push("explicit cleanup wording");
      }
      // Trailing whitespace + double blank-line runs are classic paste artefacts.
      if (/[ \t]+$/m.test(text) || /\n{3,}/.test(text)) {
        score += 12;
        reasons.push("paste artefacts");
      }
      break;
    }

    case "architect": {
      if (f.hasArchitectureCues) {
        score += 32;
        reasons.push("architecture / build language");
      }
      // Bigger inputs with arch cues → more confident.
      if (f.hasArchitectureCues && f.length >= 80) {
        score += 12;
      }
      // Stack-trace inputs are emphatically *not* architect.
      if (f.hasStackTrace) {
        score = Math.max(0, score - 30);
      }
      break;
    }

    default:
      break;
  }

  return {
    skillId: skill.meta.id,
    score: Math.min(100, Math.round(score)),
    reasons
  };
}

function countMatches(text: string, rx: RegExp): number {
  if (!rx.global) return text.search(rx) >= 0 ? 1 : 0;
  let n = 0;
  rx.lastIndex = 0;
  while (rx.exec(text)) n++;
  return n;
}
