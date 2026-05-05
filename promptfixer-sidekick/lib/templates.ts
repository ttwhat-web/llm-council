/**
 * Prompt template library.
 *
 * Each template is a starter input + best-fit mode. Click → fills the
 * input, sets the mode, and (in the UI) closes the picker. The pipeline
 * still runs cleaner → engine → supervisor, so templates compose with
 * the rest of the product.
 */

import type { Mode } from "./types";

export interface Template {
  id: string;
  category: string;
  title: string;
  blurb: string;
  body: string;
  mode: Mode;
}

export const TEMPLATES: Template[] = [
  {
    id: "app-builder",
    category: "App Builder",
    title: "Spec a new app",
    blurb: "From idea to a buildable spec the model can implement.",
    mode: "dev",
    body: [
      "I want to build [APP_NAME]: [ONE-LINE PITCH].",
      "",
      "Users: [WHO USES THIS]",
      "Core jobs to be done: [3 BULLETS]",
      "Hard requirements: [STACK / PLATFORMS / DEPLOYMENT]",
      "",
      "Produce a complete spec the model can implement: data model, key API",
      "endpoints, UI screens, and a dependency list. Flag anything ambiguous."
    ].join("\n")
  },
  {
    id: "debug",
    category: "Debug",
    title: "Diagnose & fix",
    blurb: "Stack trace + repro → root cause + patched code.",
    mode: "dev",
    body: [
      "Stack trace / error:",
      "```",
      "[PASTE ERROR]",
      "```",
      "",
      "Repro steps:",
      "1. [STEP]",
      "2. [STEP]",
      "",
      "Relevant code:",
      "```",
      "[PASTE CODE]",
      "```",
      "",
      "Identify the root cause, then return a minimal patched version with a 1-3 sentence explanation."
    ].join("\n")
  },
  {
    id: "terminal",
    category: "Terminal",
    title: "Safe shell automation",
    blurb: "Operational task → annotated, reversible shell block.",
    mode: "terminal",
    body: [
      "I need to: [DESCRIBE THE OPERATIONAL TASK]",
      "",
      "Target system: [OS / DISTRO / SHELL]",
      "Constraints: [WHAT MUST NOT BREAK]",
      "",
      "Produce annotated commands (one per line), a dry-run version first, then the live version, then an explicit rollback section."
    ].join("\n")
  },
  {
    id: "business-email",
    category: "Business Email",
    title: "Stakeholder email",
    blurb: "Quick, decisive email with a clear ask.",
    mode: "business",
    body: [
      "Audience: [WHO — role + relationship]",
      "Goal: [ONE-LINE OUTCOME]",
      "Context they need (≤3 bullets): [BULLETS]",
      "The ask: [ONE LINE]",
      "Tone: [DIRECT / FRIENDLY / FORMAL]",
      "",
      "Draft a short email. TL;DR up top. End with the explicit ask."
    ].join("\n")
  },
  {
    id: "startup-pitch",
    category: "Startup Pitch",
    title: "Investor one-pager",
    blurb: "Crisp pitch with the metric that matters.",
    mode: "business",
    body: [
      "Company: [NAME] — [ONE-LINE PITCH]",
      "Problem: [WHO FEELS THE PAIN, HOW BADLY]",
      "Solution: [WHAT YOU SHIP]",
      "Why now: [TAILWIND / UNLOCK]",
      "Traction: [METRIC + DATE]",
      "Ask: [$X for Y%, used for Z]",
      "",
      "Produce a one-page pitch. Every claim quantified or labelled an estimate."
    ].join("\n")
  },
  {
    id: "as400-modernization",
    category: "AS400 Modernization",
    title: "Legacy modernization plan",
    blurb: "RPG/COBOL → modern stack, audit-friendly.",
    mode: "as400",
    body: [
      "Current system: [LIBRARY/OBJECT — e.g., LEGACYLIB/PAYROLL]",
      "Object types in scope: [*PGM, *MODULE, *FILE, *DTAARA …]",
      "Source language: [RPGLE / RPG III / COBOL / CL]",
      "Target stack: [e.g., Node + Postgres on Linux]",
      "Constraints: change-control, journaling, library list, downtime window.",
      "",
      "Produce a phased modernization plan. Each phase: scope, backout, audit trail, success metric."
    ].join("\n")
  },
  {
    id: "legal-review",
    category: "Legal Review",
    title: "Contract clause review",
    blurb: "Risks + redlines a non-lawyer can act on.",
    mode: "business",
    body: [
      "Contract type: [MSA / SOW / NDA / EMPLOYMENT / …]",
      "Counter-party: [NAME + RELATIONSHIP]",
      "My priorities: [TOP 3 OUTCOMES]",
      "",
      "Clause to review:",
      "```",
      "[PASTE CLAUSE]",
      "```",
      "",
      "Surface the top 3 risks (severity-ranked), suggested redlines, and any deal-breaker. State that this is not legal advice."
    ].join("\n")
  },
  {
    id: "trading-note",
    category: "Trading Note",
    title: "Position rationale",
    blurb: "Thesis, levels, invalidation — concise.",
    mode: "business",
    body: [
      "Instrument: [TICKER / PAIR / CONTRACT]",
      "Direction: [LONG / SHORT]",
      "Thesis (≤3 bullets): [BULLETS]",
      "Entry / stop / target: [LEVELS]",
      "Time horizon: [INTRADAY / SWING / POSITION]",
      "Catalysts & risks: [LIST]",
      "",
      "Draft a trading note. State invalidation up front. No predictions without a level."
    ].join("\n")
  }
];

export function templatesByCategory(): Record<string, Template[]> {
  return TEMPLATES.reduce<Record<string, Template[]>>((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {});
}
