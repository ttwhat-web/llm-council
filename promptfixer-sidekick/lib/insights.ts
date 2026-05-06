/**
 * "Why It Works" — deterministic explanation of what the engine changed
 * between the user's raw input and the rendered execution-ready prompt.
 *
 * Pure heuristics. No AI call. Lives next to lib/score.ts as a sister
 * "premium feel" surface.
 */

import type { Mode, PromptSections, SafetyReport } from "./types";

export type InsightId =
  | "role"
  | "ambiguity"
  | "constraints"
  | "output-format"
  | "safety"
  | "mode-fit";

export interface Insight {
  id: InsightId;
  title: string;
  before: string;
  after: string;
  note?: string;
  /** ok = neutral improvement, warn = trade-off, info = stylistic. */
  tone: "ok" | "warn" | "info";
}

export interface InsightReport {
  changes: Insight[];
  summary: string;
}

const VAGUE = /\b(good|nice|clean|better|optimal|simple|smart|robust|efficient|fast)\b/gi;
const HEDGE = /\b(maybe|perhaps|possibly|might|could|sort of|kind of|likely)\b/gi;

export function buildInsights(
  rawInput: string,
  sections: PromptSections,
  mode: Mode,
  safety: SafetyReport
): InsightReport {
  const changes: Insight[] = [];
  const raw = (rawInput || "").trim();

  // Role
  changes.push({
    id: "role",
    title: "Role clarified",
    before: "No explicit role — the model has to guess who's asking.",
    after: short(sections.role),
    tone: "ok"
  });

  // Ambiguity
  const vagueCount = (raw.match(VAGUE) || []).length + (raw.match(HEDGE) || []).length;
  const rawShort = raw.length < 60;
  if (vagueCount > 0 || rawShort) {
    changes.push({
      id: "ambiguity",
      title: "Ambiguity reduced",
      before:
        vagueCount > 0
          ? `${vagueCount} vague / hedging word${vagueCount === 1 ? "" : "s"} in your input`
          : "Goal stated informally — easy for the model to drift.",
      after: short(sections.task),
      tone: "ok"
    });
  }

  // Constraints
  if (sections.constraints.length > 0) {
    const sample = sections.constraints.slice(0, 3).map((c) => `• ${short(c, 90)}`).join("\n");
    changes.push({
      id: "constraints",
      title: "Constraints added",
      before: "none — the model sets its own bounds.",
      after: `${sections.constraints.length} explicit constraint${
        sections.constraints.length === 1 ? "" : "s"
      }.`,
      note: sample,
      tone: "ok"
    });
  }

  // Output format
  if (sections.outputFormat && sections.outputFormat.trim().length > 0) {
    changes.push({
      id: "output-format",
      title: "Output format pinned",
      before: "Unspecified — the model picks length and shape.",
      after: short(sections.outputFormat, 220),
      tone: "ok"
    });
  }

  // Safety
  if (safety.findings.length > 0) {
    const worst = safety.findings.reduce((acc, f) => Math.max(acc, severityRank(f.severity)), 0);
    const tone: Insight["tone"] = worst >= 3 ? "warn" : "info";
    changes.push({
      id: "safety",
      title: "Safety constraints surfaced",
      before: "Destructive commands would have shipped unannotated.",
      after: `${safety.findings.length} risk${
        safety.findings.length === 1 ? "" : "s"
      } flagged${safety.blocked ? " — output blocked" : safety.requiresConfirmation ? " — confirmation required" : ""}.`,
      note: safety.findings
        .slice(0, 3)
        .map((f) => `• [${f.severity}] ${f.reason}`)
        .join("\n"),
      tone
    });
  }

  // Mode fit (educational)
  changes.push({
    id: "mode-fit",
    title: `Tuned for ${prettyMode(mode)}`,
    before: "Generic prompt that any model would interpret loosely.",
    after: modeFitNote(mode),
    tone: "info"
  });

  const summary = summarise(changes);
  return { changes, summary };
}

function summarise(changes: Insight[]): string {
  const ids = changes.map((c) => c.id);
  const has = (id: InsightId) => ids.includes(id);
  const parts: string[] = [];
  if (has("ambiguity")) parts.push("removed ambiguity");
  if (has("constraints")) parts.push("added constraints");
  if (has("output-format")) parts.push("pinned output format");
  if (has("role")) parts.push("clarified the role");
  if (has("safety")) parts.push("flagged safety risks");
  if (parts.length === 0) return `${changes.length} improvements applied.`;
  return `Your prompt is stronger because PromptFixer ${joinList(parts)}.`;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function prettyMode(mode: Mode): string {
  switch (mode) {
    case "claude":
      return "Claude";
    case "chatgpt":
      return "ChatGPT";
    case "cursor":
      return "Cursor";
    case "dev":
      return "engineering work";
    case "terminal":
      return "shell automation";
    case "business":
      return "executive briefs";
    case "as400":
      return "IBM i / AS400";
    case "general":
    default:
      return "any frontier model";
  }
}

function modeFitNote(mode: Mode): string {
  switch (mode) {
    case "claude":
      return "XML-tagged sections so Claude's instruction-following kicks in cleanly.";
    case "chatgpt":
      return "Markdown structure, action-first wording, bounded next-steps.";
    case "cursor":
      return "File paths and unified-diff blocks — IDE-applies-the-patch shape.";
    case "dev":
      return "Code-first deliverable with 'Why' and 'Verify' tail.";
    case "terminal":
      return "Annotated commands, dry-run first, explicit rollback.";
    case "business":
      return "TL;DR, body, recommendation, open questions — built for a busy reader.";
    case "as400":
      return "Numbered procedure with backout, audit trail, and DB2-for-i syntax.";
    case "general":
    default:
      return "Balanced default — clear answer first, supporting detail second.";
  }
}

function short(text: string, max = 160): string {
  const t = (text || "").trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

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
