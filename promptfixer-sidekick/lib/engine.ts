import { getMode } from "./modes";
import type { Mode, PromptSections } from "./types";

interface BuildArgs {
  cleanedInput: string;
  mode: Mode;
}

export function detectMode(input: string): Mode {
  const lower = input.toLowerCase();
  const hasCode =
    /```|function\s+\w+\s*\(|class\s+\w+|=>|console\.log|import\s+.+from|def\s+\w+\(/.test(input);
  const hasShell =
    /\b(sudo|apt|brew|chmod|chown|rm\s|mv\s|cp\s|grep\s|awk\s|sed\s|kubectl|docker|systemctl)\b/.test(
      lower
    );
  const hasAS400 =
    /\b(as\/?400|ibm\s*i|os\/?400|rpg(le)?|cl(le)?|cobol|db2 for i|wrkactjob|dspjoblog|crtbnd|crtsqlrpgi|qsys|qtemp|library list|commitment control)\b/i.test(
      input
    );
  const hasBusiness =
    /\b(memo|stakeholder|quarter|roadmap|okrs?|kpi|board|exec|investors?|forecast|p&l|budget)\b/i.test(
      input
    );
  const looksLikeChatGPT = /\b(chatgpt|gpt-?\d|openai)\b/i.test(input);
  const looksLikeClaude = /\b(claude|anthropic|sonnet|opus|haiku)\b/i.test(input);
  const looksLikeGemini = /\b(gemini|bard|google ai)\b/i.test(input);

  if (hasAS400) return "as400";
  if (hasShell) return "terminal";
  if (looksLikeClaude) return "claude";
  if (looksLikeChatGPT) return "chatgpt";
  if (looksLikeGemini) return "gemini";
  if (hasCode) return "dev";
  if (hasBusiness) return "business";
  return "general";
}

export function buildSections({ cleanedInput, mode }: BuildArgs): PromptSections {
  const profile = getMode(mode);
  const intent = inferIntent(cleanedInput, mode);

  const role = `You are ${roleFor(mode)}. Respond as someone accountable for the result, not a generic assistant.`;

  const task =
    intent.task ||
    `Address the user's request below with a complete, correct, and immediately useful response.`;

  const context = composeContext(cleanedInput, intent.context);

  const constraints = [
    `Tone: ${profile.tone}.`,
    `Formatting: ${profile.formatting}`,
    ...profile.guardrails,
    "If a required detail is missing, list the assumption you made before answering rather than asking a clarifying question.",
    "Do not pad the answer. Cut filler, restatement, and apologies."
  ];

  const outputFormat = outputFormatFor(mode, intent.deliverable);

  return { role, task, context, constraints, outputFormat };
}

export function renderPrompt(sections: PromptSections, mode: Mode): string {
  if (mode === "claude") {
    return [
      `<role>\n${sections.role}\n</role>`,
      `<task>\n${sections.task}\n</task>`,
      `<context>\n${sections.context}\n</context>`,
      `<constraints>\n${sections.constraints.map((c) => `- ${c}`).join("\n")}\n</constraints>`,
      `<output_format>\n${sections.outputFormat}\n</output_format>`
    ].join("\n\n");
  }

  if (mode === "as400") {
    return [
      "## Role",
      sections.role,
      "",
      "## Task",
      sections.task,
      "",
      "## System Context",
      sections.context,
      "",
      "## Operational Constraints",
      sections.constraints.map((c, i) => `${i + 1}. ${c}`).join("\n"),
      "",
      "## Required Output",
      sections.outputFormat
    ].join("\n");
  }

  return [
    `# Role`,
    sections.role,
    "",
    `# Task`,
    sections.task,
    "",
    `# Context`,
    sections.context,
    "",
    `# Constraints`,
    sections.constraints.map((c) => `- ${c}`).join("\n"),
    "",
    `# Output Format`,
    sections.outputFormat
  ].join("\n");
}

function roleFor(mode: Mode): string {
  switch (mode) {
    case "claude":
      return "a senior technical writer collaborating with Claude";
    case "chatgpt":
      return "a senior product engineer briefing ChatGPT";
    case "cursor":
      return "a senior engineer briefing an IDE coding agent (Cursor) on a precise edit";
    case "gemini":
      return "a senior analyst briefing Gemini with structured, evidence-led requirements";
    case "dev":
      return "a staff software engineer pair-programming with the model";
    case "terminal":
      return "a careful site-reliability engineer authoring shell automation";
    case "business":
      return "a chief of staff drafting an executive-ready brief";
    case "as400":
      return "a senior IBM i (AS400) systems engineer responsible for production change control";
    case "general":
    default:
      return "a domain expert producing the deliverable the user actually needs";
  }
}

interface Intent {
  task?: string;
  context?: string;
  deliverable?: string;
}

function inferIntent(text: string, mode: Mode): Intent {
  const trimmed = text.trim();
  if (!trimmed) return {};

  const looksLikeQuestion = /\?\s*$/.test(trimmed);
  const looksLikeCodeFix = /\b(fix|debug|error|broken|stack ?trace|exception|undefined)\b/i.test(
    trimmed
  );
  const looksLikeRefactor = /\b(refactor|clean ?up|simplify|optimi[sz]e|rewrite)\b/i.test(trimmed);
  const looksLikeDoc = /\b(document|docstring|readme|explain)\b/i.test(trimmed);
  // Architecture / build intent — must run BEFORE review so a sentence like
  // "build a modern AS400 inventory system that lets users check stock levels"
  // doesn't get sucked into the review path by the word "check".
  const looksLikeArchitecture =
    /\b(build|design|create|architect(?:ure)?|system|integration|roadmap|mvp|greenfield|modernis[ae]|modernization|migrate|migration plan|spec(?:ification)?|plan)\b/i.test(
      trimmed
    );
  // Operational procedure — only meaningful in AS400 mode (and other ops-y
  // modes the engine handles with the legacy procedure deliverable).
  const looksLikeProcedure =
    /\b(deploy|run\b|execute|change[- ]control|journaling|commitment control|migration step|backout|runbook|operational procedure|runbook step)\b/i.test(
      trimmed
    );
  // Review intent. "audit"/"check" stay as keywords per spec, but only fire
  // here — architecture takes priority above.
  const looksLikeReview =
    /\b(review|audit|check\s|issues|critique|find problems|surface issues|severity)\b/i.test(
      trimmed
    );

  const intent: Intent = {};

  if (looksLikeCodeFix) {
    intent.task =
      "Diagnose the failure described below, identify the root cause, and produce a fix with a short rationale.";
    intent.deliverable = "A patched code block plus a 1-3 sentence explanation of the root cause.";
  } else if (looksLikeRefactor) {
    intent.task =
      "Refactor the code below for clarity and correctness without changing observable behaviour.";
    intent.deliverable = "The refactored code plus a bullet list of the changes you made.";
  } else if (looksLikeDoc) {
    intent.task = "Produce documentation that lets a new engineer use this confidently.";
    intent.deliverable = "Markdown with a short summary, usage example, and edge cases.";
  } else if (looksLikeArchitecture) {
    intent.task =
      "Produce a complete, opinionated architecture/build plan a small team can execute against. Make assumptions explicit and cut anything that isn't on the MVP path.";
    intent.deliverable =
      mode === "as400" ? AS400_ARCHITECTURE_DELIVERABLE : ARCHITECTURE_DELIVERABLE;
  } else if (looksLikeProcedure && mode === "as400") {
    intent.task =
      "Produce an operational procedure for IBM i where every step is reversible.";
    intent.deliverable = AS400_PROCEDURE_DELIVERABLE;
  } else if (looksLikeReview) {
    intent.task = "Perform a focused review and surface the highest-impact issues first.";
    intent.deliverable = "Issues grouped by severity (Critical / Important / Nit) with concrete fixes.";
  } else if (looksLikeQuestion) {
    intent.task = "Answer the question below directly. Lead with the answer; justify after.";
    intent.deliverable = "Answer first, then a short justification with citations or references when applicable.";
  }

  if (mode === "as400") {
    intent.context =
      "Assume the target system is IBM i (V7R3 or later). Library list, authority, journaling and commitment control must be considered. Distinguish OPM from ILE where relevant. Use DB2 for i syntax for SQL.";
  }

  return intent;
}

const AS400_ARCHITECTURE_DELIVERABLE = [
  "Markdown with these sections, in this order:",
  "1. Assumptions",
  "2. Target Architecture",
  "3. IBM i / AS400 Integration Options",
  "4. DB2 for i Data Model",
  "5. API Layer Design",
  "6. Live Stock Sync Strategy",
  "7. Mobile/Web Dashboard Scope",
  "8. Role & Authority Model",
  "9. Audit Log / Journaling / Commitment Control",
  "10. Offline Mode Strategy",
  "11. MVP Scope",
  "12. Deployment Roadmap",
  "13. Risks and Backout Plan",
  "14. Questions for IT Team",
  "",
  "Each section: 2-6 tight bullets. Cite library/object qualified names (LIB/OBJ) when relevant. Distinguish OPM vs ILE. Reference DB2 for i SQL syntax (FETCH FIRST n ROWS ONLY, WITH UR, etc.). Conservative tone — flag uncertainty rather than inventing system values, authorities, or commands."
].join("\n");

const AS400_PROCEDURE_DELIVERABLE =
  "Numbered procedure. Each step lists: command (in CL or SQL), purpose, expected output, and backout. End with an Audit Trail section (ticket, change window, journal receipts).";

const ARCHITECTURE_DELIVERABLE = [
  "Markdown with these sections, in this order:",
  "1. Assumptions",
  "2. Architecture overview",
  "3. Stack",
  "4. Data model",
  "5. API design",
  "6. MVP scope",
  "7. Deployment roadmap",
  "8. Risks & mitigations",
  "9. Open questions",
  "",
  "Each section: 2-6 tight bullets. Quantify when possible. Mark estimates as estimates."
].join("\n");

function composeContext(input: string, extra?: string): string {
  const base = input.trim();
  const fence = base.includes("\n") ? `"""\n${base}\n"""` : `"${base}"`;
  return [extra, `User input:\n${fence}`].filter(Boolean).join("\n\n");
}

function outputFormatFor(mode: Mode, deliverable?: string): string {
  if (deliverable) return deliverable;
  switch (mode) {
    case "claude":
      return "Wrap the final answer in <answer>...</answer>. Precede it with <thinking>...</thinking> only if reasoning is non-trivial.";
    case "chatgpt":
      return "Markdown. Start with the deliverable. End with a single 'Next Steps' bullet list (max 3 items).";
    case "cursor":
      return "For each touched file: '### path/to/file' header followed by a fenced unified-diff block. End with a one-line 'Verify' command.";
    case "gemini":
      return "Markdown headings for human-readable sections; embed any structured data inside fenced ```json or ```yaml blocks. End with an 'Assumptions' bullet list.";
    case "dev":
      return "Begin with the patched code in a fenced block. Follow with 'Why' (≤3 bullets) and 'Verify' (≤3 bullets).";
    case "terminal":
      return "Annotated shell block. Each command on its own line, preceded by a `# what this does` comment. End with a 'Rollback' section.";
    case "business":
      return "TL;DR (1 sentence). Body (≤6 bullets). Recommendation (1 sentence). Open Questions (≤3 bullets).";
    case "as400":
      // Conservative AS400 default — only used when no specific intent fired.
      // Architecture / procedure intents set their own deliverable above and
      // skip this branch via the early `if (deliverable) return deliverable`.
      return "Markdown with explicit headings. Cite library/object qualified names (LIB/OBJ) where applicable. Note authority, journaling and commitment-control implications. Audit-friendly tone — flag uncertainty instead of inventing system values, authorities or commands.";
    case "general":
    default:
      return "Markdown. Lead with the answer. Use bullets where they aid scanning. Cap at 400 words unless the request demands more.";
  }
}
