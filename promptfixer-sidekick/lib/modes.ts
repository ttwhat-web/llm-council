import type { Mode, ModeProfile } from "./types";

export const MODES: Record<Mode, ModeProfile> = {
  claude: {
    id: "claude",
    label: "Claude",
    blurb: "Long-form reasoning, careful tone, XML-friendly structure.",
    audience: "Anthropic Claude (Sonnet / Opus / Haiku)",
    tone: "calm, thoughtful, explicit about uncertainty",
    formatting: "Use XML tags (<context>, <task>, <constraints>) when helpful. Prefer numbered steps.",
    guardrails: [
      "Never ask Claude to roleplay as a different model.",
      "Surface assumptions as a short bulleted list.",
      "Request a final summary block."
    ],
    systemHints: [
      "Optimised for Claude's instruction-following bias toward structure and explicit reasoning."
    ]
  },
  chatgpt: {
    id: "chatgpt",
    label: "ChatGPT",
    blurb: "Markdown-first, action-oriented, concise.",
    audience: "OpenAI ChatGPT (GPT-4.x / GPT-5)",
    tone: "direct, energetic, professional",
    formatting: "Markdown headings, fenced code, short bullet lists.",
    guardrails: [
      "Pin the persona in the first line.",
      "Demand explicit step-by-step reasoning when math or code is involved.",
      "Forbid filler like 'Sure!' or 'Of course!'."
    ],
    systemHints: [
      "Tuned for GPT's preference for clear deliverables and bounded outputs."
    ]
  },
  dev: {
    id: "dev",
    label: "Dev",
    blurb: "Engineering tasks, code reviews, refactors.",
    audience: "Senior software engineer pair-programming with an LLM",
    tone: "precise, opinionated, pragmatic",
    formatting: "File paths, language-tagged code blocks, diffs when applicable.",
    guardrails: [
      "Always state the language, framework version, and target runtime.",
      "Forbid speculative APIs — require references to real symbols.",
      "Demand failure modes and edge cases."
    ],
    systemHints: [
      "Prefer minimal diffs over wholesale rewrites.",
      "Surface tests / verification steps."
    ]
  },
  terminal: {
    id: "terminal",
    label: "Terminal (Safe)",
    blurb: "Shell automation with mandatory safety review.",
    audience: "Operator running commands on a real machine",
    tone: "cautious, procedural",
    formatting: "Commented shell blocks. One command per line. Annotate destructive steps.",
    guardrails: [
      "Never emit destructive commands without an explicit confirmation gate.",
      "Always show a dry-run variant first.",
      "Prefer idempotent commands and explicit working directories."
    ],
    systemHints: [
      "Pair with the safety screen in lib/safety.ts before returning output."
    ]
  },
  business: {
    id: "business",
    label: "Business",
    blurb: "Briefs, memos, stakeholder communication.",
    audience: "Executive / cross-functional stakeholder",
    tone: "confident, structured, jargon-light",
    formatting: "TL;DR up top, bulleted body, recommended next action.",
    guardrails: [
      "Lead with the decision being requested.",
      "Quantify when possible. Mark estimates as estimates.",
      "Avoid hype words: 'revolutionary', 'game-changing', 'synergy'."
    ],
    systemHints: [
      "Optimised for one-shot delivery to a busy reader."
    ]
  },
  general: {
    id: "general",
    label: "General",
    blurb: "Balanced default for arbitrary tasks.",
    audience: "Any modern frontier LLM",
    tone: "neutral, clear, helpful",
    formatting: "Markdown with short paragraphs and bullet lists.",
    guardrails: [
      "Prefer specifics over generalities.",
      "Make output format explicit.",
      "Cap response length unless the user requests otherwise."
    ],
    systemHints: [
      "Safe default when intent is ambiguous."
    ]
  },
  as400: {
    id: "as400",
    label: "AS400 / IBM i",
    blurb: "Legacy enterprise systems — RPG, COBOL, DB2 for i.",
    audience: "IBM i / AS400 engineer or auditor",
    tone: "conservative, audit-friendly, formal",
    formatting:
      "Numbered procedures. Reference object types (*PGM, *FILE, *MODULE). Cite library/object qualified names (LIB/OBJ).",
    guardrails: [
      "Respect change-control: every step must be reversible or have a documented backout.",
      "Distinguish OPM vs ILE RPG and note CL command equivalents.",
      "Never invent system values, authorities, or commands — flag uncertainty explicitly.",
      "Call out journaling, commitment control, and library list implications."
    ],
    systemHints: [
      "Treat the reader as responsible for production change tickets.",
      "Prefer DSPxxx / WRKxxx commands for diagnostics; CHGxxx / CRTxxx for action.",
      "When showing SQL, use DB2 for i syntax (e.g., FETCH FIRST n ROWS ONLY)."
    ]
  }
};

export const MODE_LIST: ModeProfile[] = Object.values(MODES);

export function isMode(value: unknown): value is Mode {
  return typeof value === "string" && value in MODES;
}

export function getMode(mode?: Mode): ModeProfile {
  if (mode && mode in MODES) return MODES[mode];
  return MODES.general;
}
