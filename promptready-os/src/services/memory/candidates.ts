/**
 * Memory candidates · pure detection, no learning yet.
 *
 * Every function here looks at ONE real event (an approved send, an
 * edited draft, founder feedback, a calendar move) and asks: does this,
 * on its own, look like a specific, useful fact worth remembering?
 * If yes it returns a MemoryCandidateDraft; if the signal is too weak
 * or generic it returns null. Nothing here writes anywhere or repeats
 * itself — repetition counting and persistence live in the store
 * (store/memoryCandidates.ts). This file never invents a fact that
 * isn't directly evidenced by the event it was given.
 */

import type { EditReason } from "@/store/feedback";
import { levenshteinDistance } from "@/services/text/editDistance";

export type MemoryCandidateKind = "language" | "tone" | "avoid" | "behavior";

export interface MemoryCandidateDraft {
  /** Stable dedupe key — same fact about the same subject always maps here. */
  key: string;
  kind: MemoryCandidateKind;
  subjectLabel: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Language hint · small deterministic word-list heuristic, not a guess.
// Returns null (not "English") when the signal is ambiguous — silence
// over a wrong claim.
// ---------------------------------------------------------------------------

const GERMAN_MARKERS = [
  "und",
  "bitte",
  "danke",
  "vielen dank",
  "freundlich",
  "grüße",
  "gruss",
  "sehr geehrte",
  "guten tag",
  "liebe",
  "möchte",
  "können"
];

const TURKISH_MARKERS = [
  "merhaba",
  "teşekkür",
  "teşekkürler",
  "selamlar",
  "değerli",
  "rica ederim",
  "iyi günler",
  "saygılar",
  "lütfen"
];

export function detectLanguageHint(text: string): "German" | "Turkish" | null {
  const t = text.toLowerCase();
  const count = (markers: string[]) => markers.reduce((n, m) => n + (t.includes(m) ? 1 : 0), 0);
  const de = count(GERMAN_MARKERS);
  const tr = count(TURKISH_MARKERS);
  if (de === 0 && tr === 0) return null;
  if (de > tr) return "German";
  if (tr > de) return "Turkish";
  return null; // tied — ambiguous, say nothing
}

// ---------------------------------------------------------------------------
// 1 · Approved send → language candidate
// ---------------------------------------------------------------------------

export function languageCandidateFromApprovedSend(input: {
  subjectLabel: string;
  subjectKey: string;
  draftBody: string;
}): MemoryCandidateDraft | null {
  const language = detectLanguageHint(input.draftBody);
  if (!language) return null;
  return {
    key: `language:${input.subjectKey}`,
    kind: "language",
    subjectLabel: input.subjectLabel,
    text: `${input.subjectLabel} prefers ${language}.`
  };
}

// ---------------------------------------------------------------------------
// 2 · Edited draft → tone/specificity candidate
// ---------------------------------------------------------------------------

const EDIT_REASON_LABEL: Record<EditReason, string> = {
  tone: "tone",
  too_formal: "being too formal",
  too_casual: "being too casual",
  too_long: "being too long",
  too_short: "being too short",
  wrong_language: "the wrong language",
  wrong_facts: "wrong facts",
  missing_context: "missing context",
  other: "something the draft got wrong"
};

export function toneCandidateFromEdit(input: {
  subjectLabel: string;
  subjectKey: string;
  originalBody: string;
  finalBody: string;
  editReason: EditReason;
}): MemoryCandidateDraft | null {
  if (input.originalBody.trim() === input.finalBody.trim()) return null;
  if (levenshteinDistance(input.originalBody, input.finalBody) === 0) return null;
  const reasonText = EDIT_REASON_LABEL[input.editReason];
  return {
    key: `tone:${input.subjectKey}:${input.editReason}`,
    kind: "tone",
    subjectLabel: input.subjectLabel,
    text: `${input.subjectLabel} — drafts have needed editing for ${reasonText}.`
  };
}

// ---------------------------------------------------------------------------
// 3 · Negative feedback → avoid-rule candidate. Fires on the founder's
// own words (the correction), never a paraphrase — maximally honest.
// ---------------------------------------------------------------------------

export function avoidCandidateFromFeedback(input: {
  subjectLabel: string;
  subjectKey: string;
  correction: string;
}): MemoryCandidateDraft | null {
  const correction = input.correction.trim();
  if (!correction) return null;
  return {
    key: `avoid:${input.subjectKey}:${hashText(correction)}`,
    kind: "avoid",
    subjectLabel: input.subjectLabel,
    text: `For ${input.subjectLabel}: ${correction}`
  };
}

// ---------------------------------------------------------------------------
// 4 · Repeated calendar moves → behavior candidate. Keyed on the
// meeting's normalised title so repeats of "the same" recurring
// meeting are recognised across separate calendar instances.
// ---------------------------------------------------------------------------

export function behaviorCandidateFromCalendarMove(input: {
  summary: string;
}): MemoryCandidateDraft | null {
  const summary = input.summary.trim();
  if (!summary) return null;
  const key = summary.toLowerCase();
  return {
    key: `behavior:${key}`,
    kind: "behavior",
    subjectLabel: summary,
    text: `"${summary}" meetings have needed rescheduling more than once.`
  };
}

function hashText(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
