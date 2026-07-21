/**
 * Delegation Engine · intent interpretation.
 *
 * Pure, deterministic, no AI call — natural language is classified by
 * real keyword/pattern matching against the three capabilities Operator
 * actually has (follow up on customers, resolve calendar conflicts,
 * archive obvious noise). Never invents a capability: a sentence that
 * matches nothing comes back `unsupported`, never guessed at.
 *
 * A compound sentence ("Reply to Hans and move the internal meeting.")
 * is split into clauses on "and"/";" so each clause is classified (and
 * its person/meeting hint extracted) independently — this is what lets
 * one request become several typed, inspectable planned actions.
 */

export type DelegationIntentKind = "followUp" | "resolveConflicts" | "archiveNoise";

export interface DelegationClause {
  intent: DelegationIntentKind;
  /** A named person mentioned for this clause, e.g. "Hans" — narrows
   *  which customer(s) the followUp intent should target. */
  personHint?: string;
  /** A named meeting mentioned for this clause, e.g. "internal meeting"
   *  — narrows which calendar conflict resolveConflicts should target. */
  meetingHint?: string;
}

export interface InterpretResult {
  clauses: DelegationClause[];
  /** True only when literally nothing in the sentence matched a
   *  supported capability — the founder is told plainly, never guessed at. */
  unsupported: boolean;
}

const FOLLOWUP_KEYWORDS = ["follow up", "followup", "customers", "waiting", "reply to", "respond to", "reply"];
const CONFLICT_KEYWORDS = ["conflict", "calendar", "meeting", "reschedule", "move"];
const ARCHIVE_KEYWORDS = ["noise", "newsletter", "archive", "clean up", "low-risk", "low risk", "spam"];
const APPROVAL_KEYWORDS = ["approval", "ready for me", "needs approval"];
const MORNING_KEYWORDS = ["my morning", "handle my day", "handle everything", "start my day", "take care of everything"];

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

/** "Reply to Hans" / "follow up with Anna Klein" → the capitalized name
 *  following "to"/"with". Never invented — absent when nothing matches. */
function extractPersonHint(clause: string): string | undefined {
  const m = clause.match(/\b(?:to|with)\s+([A-ZÀ-Ý][\p{L}'-]*(?:\s+[A-ZÀ-Ý][\p{L}'-]*)?)/u);
  return m?.[1]?.trim();
}

/** "move the internal meeting" / "the Bridge demo" → the phrase ending
 *  in a meeting-shaped noun. Absent when nothing matches. */
function extractMeetingHint(clause: string): string | undefined {
  const m = clause.match(/\bthe\s+([a-z0-9' -]+?\s(?:meeting|demo|call|sync|standup|review))\b/i);
  return m?.[1]?.trim();
}

export function interpretRequest(rawText: string): InterpretResult {
  const text = rawText.trim();
  if (!text) return { clauses: [], unsupported: true };

  const rawClauses = text
    .split(/\band\b|[;]/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const clauses: DelegationClause[] = [];
  for (const raw of rawClauses) {
    const lower = raw.toLowerCase();
    const intents: DelegationIntentKind[] = [];

    if (matchesAny(lower, MORNING_KEYWORDS)) {
      intents.push("followUp", "resolveConflicts", "archiveNoise");
    } else if (matchesAny(lower, APPROVAL_KEYWORDS)) {
      // "Everything that needs my approval" — real evidence-consistent
      // mapping: silent archiving needs no approval, so it's correctly
      // excluded here rather than needing a separate rule for it.
      intents.push("followUp", "resolveConflicts");
    } else {
      if (matchesAny(lower, FOLLOWUP_KEYWORDS)) intents.push("followUp");
      if (matchesAny(lower, CONFLICT_KEYWORDS)) intents.push("resolveConflicts");
      if (matchesAny(lower, ARCHIVE_KEYWORDS)) intents.push("archiveNoise");
    }

    if (intents.length === 0) continue;

    const personHint = intents.includes("followUp") ? extractPersonHint(raw) : undefined;
    const meetingHint = intents.includes("resolveConflicts") ? extractMeetingHint(raw) : undefined;

    for (const intent of intents) {
      clauses.push({
        intent,
        personHint: intent === "followUp" ? personHint : undefined,
        meetingHint: intent === "resolveConflicts" ? meetingHint : undefined
      });
    }
  }

  return { clauses, unsupported: clauses.length === 0 };
}
