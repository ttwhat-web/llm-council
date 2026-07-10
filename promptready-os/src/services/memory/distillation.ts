/**
 * Memory Distillation · keeps Operator's memory clean, not larger.
 *
 * Pure functions only (no I/O) except the two thin composition helpers
 * at the bottom, which read/write the three stores this reasons over.
 * Never invents anything: every note traces back either to a saved
 * MemoryCandidate (real evidence, a real first-seen/last-reinforced
 * timestamp) or is honestly labeled as a manual Settings entry with no
 * age evidence — which means it's never flagged stale (no fabricated
 * age) but can still be flagged duplicate. Confidence decay is a plain
 * function of real elapsed time since the fact was last reinforced,
 * never a guessed relevance score.
 *
 * FounderMemory.rememberThese/avoidThese (operatorMemory store) are
 * NEVER mutated here — they stay the permanent, append-only ledger.
 * "Forgetting" only removes a fact from the ACTIVE VIEW used by drafts
 * (buildActiveMemoryView); the original line stays intact and visible,
 * satisfying "never delete silently" and "preserve source events".
 */

import { useOperatorMemoryStore } from "@/store/operatorMemory";
import { useMemoryCandidatesStore, type MemoryCandidate } from "@/store/memoryCandidates";
import { useMemoryNotesStore, type NoteOverride, type NoteStatus } from "@/store/memoryNotes";
import type { FounderMemory } from "@/services/operator/memorySeed";
import type { MemoryCandidateKind } from "@/services/memory/candidates";

const DAY_MS = 24 * 60 * 60 * 1000;

/** No decay for the first month — a fact doesn't need to "prove
 *  itself" again immediately after being saved. */
const GRACE_DAYS = 30;
/** After the grace period, confidence drops one point per day without
 *  reinforcement. */
const DECAY_PER_DAY = 1;
/** Confidence never auto-decays below this — reaching zero trust
 *  requires an explicit founder Forget, never a silent fade to nothing. */
const MIN_CONFIDENCE = 30;
/** Below this, a note is surfaced as possibly stale. */
export const STALE_CONFIDENCE_THRESHOLD = 60;

export type NoteList = "remember" | "avoid";

export interface MemoryNote {
  id: string;
  text: string;
  list: NoteList;
  /** Provenance from the candidate that originally proposed this fact —
   *  absent for a line the founder typed directly into Settings. */
  kind?: MemoryCandidateKind;
  subjectLabel?: string;
  sourceKey?: string;
  firstSeenAt: number;
  lastReinforcedAt: number;
  status: NoteStatus;
  /** 0-100. Always 100 for a note with no real age evidence — decay is
   *  a claim this codebase only makes when it has a real timestamp to
   *  back it up. */
  confidence: number;
}

export interface MemorySuggestion {
  noteId: string;
  text: string;
  list: NoteList;
  sourceKey?: string;
  reason: string;
  recommend: "archive" | "review";
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function splitLines(blob: string): string[] {
  return blob
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function computeConfidence(hasRealAge: boolean, lastReinforcedAt: number, now: number): number {
  if (!hasRealAge) return 100;
  const ageDays = Math.max(0, (now - lastReinforcedAt) / DAY_MS);
  if (ageDays <= GRACE_DAYS) return 100;
  const decayed = 100 - (ageDays - GRACE_DAYS) * DECAY_PER_DAY;
  return Math.max(MIN_CONFIDENCE, Math.round(decayed));
}

/**
 * Turn the two opaque text blobs into addressable notes, joined
 * against the candidate ledger (for provenance + real timestamps) and
 * the override store (for founder-decided status + reinforcement).
 * Pure given its inputs — `now` is a parameter, never read from the
 * clock internally, so this is fully deterministic and testable.
 */
export function deriveNotes(
  memory: FounderMemory,
  candidates: Record<string, MemoryCandidate>,
  overrides: Record<string, NoteOverride>,
  now: number
): MemoryNote[] {
  // Two maps, not one — save() only ever appends an "avoid"-kind
  // candidate's text to avoidThese and every other kind to
  // rememberThese, so a candidate must only ever be able to match the
  // line in the list it actually produced. One shared map would let an
  // unrelated candidate with coincidentally identical text claim a
  // line in the opposite list.
  const savedByTextRemember = new Map<string, MemoryCandidate>();
  const savedByTextAvoid = new Map<string, MemoryCandidate>();
  for (const c of Object.values(candidates)) {
    if (c.status !== "saved") continue;
    (c.kind === "avoid" ? savedByTextAvoid : savedByTextRemember).set(normalize(c.text), c);
  }

  const lists: Array<[NoteList, string, Map<string, MemoryCandidate>]> = [
    ["remember", memory.rememberThese, savedByTextRemember],
    ["avoid", memory.avoidThese, savedByTextAvoid]
  ];

  const notes: MemoryNote[] = [];
  for (const [list, blob, savedByText] of lists) {
    for (const line of splitLines(blob)) {
      const match = savedByText.get(normalize(line));
      const sourceKey = match?.key;
      const id = sourceKey ?? `manual:${list}:${normalize(line)}`;
      const override = overrides[id];
      const lastReinforcedAt = override?.lastReinforcedAt ?? match?.updatedAt ?? now;
      const firstSeenAt = match?.firstSeenAt ?? lastReinforcedAt;
      notes.push({
        id,
        text: line,
        list,
        kind: match?.kind,
        subjectLabel: match?.subjectLabel,
        sourceKey,
        firstSeenAt,
        lastReinforcedAt,
        status: override?.status ?? "active",
        confidence: computeConfidence(!!sourceKey, lastReinforcedAt, now)
      });
    }
  }
  return notes;
}

/** Active notes whose exact (normalized) text repeats — regardless of
 *  which list they're in. Exact-text only: no paraphrase detection,
 *  which would mean guessing at meaning this codebase doesn't have. */
export function findDuplicateNotes(notes: MemoryNote[]): MemoryNote[][] {
  const groups = new Map<string, MemoryNote[]>();
  for (const n of notes) {
    if (n.status !== "active") continue;
    const key = normalize(n.text);
    const group = groups.get(key) ?? [];
    group.push(n);
    groups.set(key, group);
  }
  return Array.from(groups.values()).filter((g) => g.length > 1);
}

/** Active notes about the same real subject (from candidate provenance
 *  only — never guessed) appearing on both the remember and avoid
 *  lists. A structural signal, not a semantic one. */
export function findContradictions(
  notes: MemoryNote[]
): Array<{ remember: MemoryNote; avoid: MemoryNote; subjectLabel: string }> {
  const byRemember = new Map<string, MemoryNote[]>();
  const byAvoid = new Map<string, MemoryNote[]>();
  for (const n of notes) {
    if (n.status !== "active" || !n.subjectLabel) continue;
    const map = n.list === "remember" ? byRemember : byAvoid;
    const group = map.get(n.subjectLabel) ?? [];
    group.push(n);
    map.set(n.subjectLabel, group);
  }
  const out: Array<{ remember: MemoryNote; avoid: MemoryNote; subjectLabel: string }> = [];
  for (const [subjectLabel, rememberNotes] of byRemember) {
    const avoidNotes = byAvoid.get(subjectLabel);
    if (!avoidNotes) continue;
    for (const remember of rememberNotes) {
      for (const avoid of avoidNotes) {
        out.push({ remember, avoid, subjectLabel });
      }
    }
  }
  return out;
}

/** Active, candidate-sourced notes whose confidence has decayed below
 *  the stale threshold. Manual entries are never included — there's no
 *  real age evidence to base a staleness claim on. */
export function findStale(notes: MemoryNote[]): MemoryNote[] {
  return notes.filter((n) => n.status === "active" && !!n.sourceKey && n.confidence < STALE_CONFIDENCE_THRESHOLD);
}

/**
 * One suggestion per note that needs a founder decision. Never
 * auto-resolves anything (that would be inventing intelligence this
 * codebase doesn't have) — every entry here is a question, not an
 * action. A note flagged for more than one reason keeps only the
 * first (duplicates take priority over staleness, since resolving the
 * duplicate usually resolves the staleness question too).
 */
export function computeMemorySuggestions(notes: MemoryNote[]): MemorySuggestion[] {
  const out: MemorySuggestion[] = [];

  for (const group of findDuplicateNotes(notes)) {
    const [, ...duplicates] = [...group].sort((a, b) => a.firstSeenAt - b.firstSeenAt);
    for (const dup of duplicates) {
      out.push({
        noteId: dup.id,
        text: dup.text,
        list: dup.list,
        sourceKey: dup.sourceKey,
        reason: "Says the same thing as another saved note.",
        recommend: "archive"
      });
    }
  }

  for (const { remember, avoid, subjectLabel } of findContradictions(notes)) {
    out.push({
      noteId: remember.id,
      text: remember.text,
      list: "remember",
      sourceKey: remember.sourceKey,
      reason: `Also has an "avoid" note about ${subjectLabel} — worth checking these don't conflict.`,
      recommend: "review"
    });
    out.push({
      noteId: avoid.id,
      text: avoid.text,
      list: "avoid",
      sourceKey: avoid.sourceKey,
      reason: `Also has a "remember" note about ${subjectLabel} — worth checking these don't conflict.`,
      recommend: "review"
    });
  }

  for (const stale of findStale(notes)) {
    out.push({
      noteId: stale.id,
      text: stale.text,
      list: stale.list,
      sourceKey: stale.sourceKey,
      reason: `Hasn't come up again in a while (confidence ${stale.confidence}%) — still true?`,
      recommend: "archive"
    });
  }

  const seen = new Set<string>();
  return out.filter((s) => {
    if (seen.has(s.noteId)) return false;
    seen.add(s.noteId);
    return true;
  });
}

/**
 * The FounderMemory shape that draft-facing prompts should actually
 * read: rememberThese/avoidThese rebuilt from active notes only.
 * Everything else on FounderMemory (name, tone, companies…) passes
 * through untouched — distillation only ever governs the two note
 * lists.
 */
export function buildActiveMemoryView(memory: FounderMemory, notes: MemoryNote[]): FounderMemory {
  const active = (list: NoteList) =>
    notes
      .filter((n) => n.list === list && n.status === "active")
      .map((n) => n.text)
      .join("\n");
  return {
    ...memory,
    rememberThese: active("remember"),
    avoidThese: active("avoid")
  };
}

// ---------------------------------------------------------------------------
// Composition helpers — the only place this file touches the stores.
// ---------------------------------------------------------------------------

/** The memory view every draft-facing prompt should read instead of
 *  the raw store — active notes only. Safe to call from anywhere
 *  (React or not), same convention as operatorMemory's readMemoryNow(). */
export function getActiveMemoryView(now: number = Date.now()): FounderMemory {
  const memory = useOperatorMemoryStore.getState().memory;
  const candidates = useMemoryCandidatesStore.getState().candidates;
  const overrides = useMemoryNotesStore.getState().overrides;
  const notes = deriveNotes(memory, candidates, overrides, now);
  return buildActiveMemoryView(memory, notes);
}

/** Forget = stop feeding drafts AND, when this note traces back to a
 *  real candidate, block that candidate so the exact same fact can't
 *  be silently re-learned later ("blocked memories remain blocked"
 *  applies just as much to a fact forgotten after the fact as to one
 *  never saved in the first place). */
export function forgetNote(noteId: string, sourceKey?: string): void {
  useMemoryNotesStore.getState().forget(noteId);
  if (sourceKey) useMemoryCandidatesStore.getState().block(sourceKey);
}
