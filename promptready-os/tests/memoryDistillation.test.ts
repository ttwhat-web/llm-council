import { beforeEach, describe, expect, it } from "vitest";
import {
  deriveNotes,
  findDuplicateNotes,
  findContradictions,
  findStale,
  computeMemorySuggestions,
  buildActiveMemoryView,
  getActiveMemoryView,
  forgetNote,
  STALE_CONFIDENCE_THRESHOLD,
  type MemoryNote
} from "@/services/memory/distillation";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import { useMemoryCandidatesStore, type MemoryCandidate } from "@/store/memoryCandidates";
import { useMemoryNotesStore, type NoteOverride } from "@/store/memoryNotes";
import { EMPTY_MEMORY } from "@/services/operator/memorySeed";
import type { FounderMemory } from "@/services/operator/memorySeed";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 16, 8, 0, 0);

function memory(overrides: Partial<FounderMemory> = {}): FounderMemory {
  return { ...EMPTY_MEMORY, ...overrides };
}

function candidate(overrides: Partial<MemoryCandidate> & { key: string; text: string }): MemoryCandidate {
  return {
    kind: "language",
    subjectLabel: "Hans Müller",
    status: "saved",
    evidenceCount: 2,
    firstSeenAt: NOW - 60 * DAY,
    updatedAt: NOW - 60 * DAY,
    ...overrides
  };
}

beforeEach(() => {
  useOperatorMemoryStore.getState().reset();
  useMemoryCandidatesStore.getState().reset();
  useMemoryNotesStore.getState().reset();
});

describe("deriveNotes · provenance and confidence", () => {
  it("joins a saved-candidate-backed line with its real provenance", () => {
    const m = memory({ rememberThese: "Hans Müller prefers German." });
    const candidates = {
      k1: candidate({ key: "k1", text: "Hans Müller prefers German.", updatedAt: NOW - 10 * DAY })
    };
    const [note] = deriveNotes(m, candidates, {}, NOW);
    expect(note.sourceKey).toBe("k1");
    expect(note.kind).toBe("language");
    expect(note.subjectLabel).toBe("Hans Müller");
    expect(note.status).toBe("active");
  });

  it("treats a manually-typed line with no matching candidate honestly — full confidence, no source", () => {
    const m = memory({ rememberThese: "Some manual fact typed in Settings." });
    const [note] = deriveNotes(m, {}, {}, NOW + 500 * DAY);
    expect(note.sourceKey).toBeUndefined();
    expect(note.subjectLabel).toBeUndefined();
    expect(note.confidence).toBe(100);
  });

  it("confidence stays 100 within the grace period", () => {
    const m = memory({ rememberThese: "Fact." });
    const candidates = { k1: candidate({ key: "k1", text: "Fact.", updatedAt: NOW - 10 * DAY }) };
    const [note] = deriveNotes(m, candidates, {}, NOW);
    expect(note.confidence).toBe(100);
  });

  it("confidence decays partially between the grace period and the floor", () => {
    const m = memory({ rememberThese: "Fact." });
    const candidates = { k1: candidate({ key: "k1", text: "Fact.", updatedAt: NOW - 50 * DAY }) };
    const [note] = deriveNotes(m, candidates, {}, NOW);
    expect(note.confidence).toBe(80); // 100 - (50 - 30 grace days)
  });

  it("confidence never auto-decays below the floor", () => {
    const m = memory({ rememberThese: "Fact." });
    const candidates = { k1: candidate({ key: "k1", text: "Fact.", updatedAt: NOW - 400 * DAY }) };
    const [note] = deriveNotes(m, candidates, {}, NOW);
    expect(note.confidence).toBe(30);
  });

  it("respects a founder override's status regardless of the candidate ledger", () => {
    const m = memory({ rememberThese: "Fact." });
    const candidates = { k1: candidate({ key: "k1", text: "Fact." }) };
    const overrides: Record<string, NoteOverride> = { k1: { status: "archived", lastReinforcedAt: NOW } };
    const [note] = deriveNotes(m, candidates, overrides, NOW);
    expect(note.status).toBe("archived");
  });

  it("a Keep override resets confidence to full even for an old candidate", () => {
    const m = memory({ rememberThese: "Fact." });
    const candidates = { k1: candidate({ key: "k1", text: "Fact.", updatedAt: NOW - 400 * DAY }) };
    const overrides: Record<string, NoteOverride> = { k1: { status: "active", lastReinforcedAt: NOW } };
    const [note] = deriveNotes(m, candidates, overrides, NOW);
    expect(note.confidence).toBe(100);
  });
});

describe("findDuplicateNotes · exact text only, never a paraphrase guess", () => {
  it("groups active notes with the same normalized text across both lists", () => {
    const m = memory({ rememberThese: "Always CC the ops team.", avoidThese: "always cc the ops team." });
    const notes = deriveNotes(m, {}, {}, NOW);
    const groups = findDuplicateNotes(notes);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
  });

  it("does not group notes with merely similar (not identical) wording", () => {
    const m = memory({ rememberThese: "Always CC the ops team.\nCC ops on every reply." });
    const notes = deriveNotes(m, {}, {}, NOW);
    expect(findDuplicateNotes(notes)).toEqual([]);
  });

  it("never groups a note that's already archived or forgotten", () => {
    const m = memory({ rememberThese: "Same fact.", avoidThese: "Same fact." });
    const candidates = { k1: candidate({ key: "k1", text: "Same fact.", kind: "avoid" }) };
    const overrides: Record<string, NoteOverride> = { k1: { status: "archived", lastReinforcedAt: NOW } };
    const notes = deriveNotes(m, candidates, overrides, NOW);
    expect(findDuplicateNotes(notes)).toEqual([]);
  });
});

describe("findContradictions · same real subject on both lists, never a guessed meaning", () => {
  it("flags a subject with both a remember and an avoid note", () => {
    const m = memory({
      rememberThese: "Hans Müller prefers German.",
      avoidThese: "Don't mention pricing to Hans Müller."
    });
    const candidates = {
      k1: candidate({ key: "k1", text: "Hans Müller prefers German.", kind: "language", subjectLabel: "Hans Müller" }),
      k2: candidate({ key: "k2", text: "Don't mention pricing to Hans Müller.", kind: "avoid", subjectLabel: "Hans Müller" })
    };
    const notes = deriveNotes(m, candidates, {}, NOW);
    const contradictions = findContradictions(notes);
    expect(contradictions).toHaveLength(1);
    expect(contradictions[0].subjectLabel).toBe("Hans Müller");
  });

  it("never flags a manual entry — there's no real subject to compare", () => {
    const m = memory({ rememberThese: "Some manual fact.", avoidThese: "Some other manual fact." });
    const notes = deriveNotes(m, {}, {}, NOW);
    expect(findContradictions(notes)).toEqual([]);
  });

  it("doesn't flag two different subjects each on one list", () => {
    const m = memory({ rememberThese: "Hans prefers German.", avoidThese: "Don't discount for Anna." });
    const candidates = {
      k1: candidate({ key: "k1", text: "Hans prefers German.", subjectLabel: "Hans" }),
      k2: candidate({ key: "k2", text: "Don't discount for Anna.", kind: "avoid", subjectLabel: "Anna" })
    };
    const notes = deriveNotes(m, candidates, {}, NOW);
    expect(findContradictions(notes)).toEqual([]);
  });
});

describe("findStale · only ever claims age for candidate-backed notes", () => {
  it("includes a candidate-backed note whose confidence dropped below the threshold", () => {
    const m = memory({ rememberThese: "Old fact." });
    const candidates = { k1: candidate({ key: "k1", text: "Old fact.", updatedAt: NOW - 100 * DAY }) };
    const notes = deriveNotes(m, candidates, {}, NOW);
    expect(notes[0].confidence).toBeLessThan(STALE_CONFIDENCE_THRESHOLD);
    expect(findStale(notes)).toHaveLength(1);
  });

  it("never includes a manual entry, no matter how long it's presumably existed", () => {
    const m = memory({ rememberThese: "Manual fact." });
    const notes = deriveNotes(m, {}, {}, NOW);
    expect(findStale(notes)).toEqual([]);
  });

  it("excludes a recently-reinforced candidate-backed note", () => {
    const m = memory({ rememberThese: "Fresh fact." });
    const candidates = { k1: candidate({ key: "k1", text: "Fresh fact.", updatedAt: NOW - 5 * DAY }) };
    const notes = deriveNotes(m, candidates, {}, NOW);
    expect(findStale(notes)).toEqual([]);
  });
});

describe("computeMemorySuggestions · every row is a question, never an automatic fix", () => {
  it("suggests archiving the later duplicate, keeping the earliest", () => {
    const notes: MemoryNote[] = [
      { id: "a", text: "Same fact.", list: "remember", firstSeenAt: NOW - 10 * DAY, lastReinforcedAt: NOW, status: "active", confidence: 100 },
      { id: "b", text: "same fact.", list: "avoid", firstSeenAt: NOW - 1 * DAY, lastReinforcedAt: NOW, status: "active", confidence: 100 }
    ];
    const suggestions = computeMemorySuggestions(notes);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].noteId).toBe("b");
    expect(suggestions[0].recommend).toBe("archive");
  });

  it("suggests reviewing both sides of a contradiction", () => {
    const notes: MemoryNote[] = [
      { id: "r1", text: "Remember X.", list: "remember", subjectLabel: "Acme", firstSeenAt: NOW, lastReinforcedAt: NOW, status: "active", confidence: 100 },
      { id: "a1", text: "Avoid X.", list: "avoid", subjectLabel: "Acme", firstSeenAt: NOW, lastReinforcedAt: NOW, status: "active", confidence: 100 }
    ];
    const suggestions = computeMemorySuggestions(notes);
    expect(suggestions.map((s) => s.noteId).sort()).toEqual(["a1", "r1"]);
    expect(suggestions.every((s) => s.recommend === "review")).toBe(true);
  });

  it("suggests archiving a stale note and names its confidence in the reason", () => {
    const notes: MemoryNote[] = [
      { id: "s1", text: "Old fact.", list: "remember", sourceKey: "k1", firstSeenAt: NOW - 100 * DAY, lastReinforcedAt: NOW - 100 * DAY, status: "active", confidence: 40 }
    ];
    const suggestions = computeMemorySuggestions(notes);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].reason).toContain("40%");
  });

  it("never suggests anything for clean, active, unique notes", () => {
    const notes: MemoryNote[] = [
      { id: "a", text: "Fact A.", list: "remember", firstSeenAt: NOW, lastReinforcedAt: NOW, status: "active", confidence: 100 },
      { id: "b", text: "Fact B.", list: "avoid", firstSeenAt: NOW, lastReinforcedAt: NOW, status: "active", confidence: 100 }
    ];
    expect(computeMemorySuggestions(notes)).toEqual([]);
  });

  it("flags a note only once even if it matches more than one rule", () => {
    const notes: MemoryNote[] = [
      { id: "dupA", text: "Repeated stale fact.", list: "remember", sourceKey: "k1", firstSeenAt: NOW - 200 * DAY, lastReinforcedAt: NOW - 200 * DAY, status: "active", confidence: 30 },
      { id: "dupB", text: "repeated stale fact.", list: "remember", sourceKey: "k2", firstSeenAt: NOW - 5 * DAY, lastReinforcedAt: NOW - 5 * DAY, status: "active", confidence: 100 }
    ];
    const suggestions = computeMemorySuggestions(notes);
    const ids = suggestions.map((s) => s.noteId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("buildActiveMemoryView · drafts only ever see active notes", () => {
  it("excludes archived and forgotten notes from the rebuilt lists", () => {
    const m = memory({ rememberThese: "Keep this.\nDrop this.", avoidThese: "Still avoid this." });
    const notes = deriveNotes(m, {}, {}, NOW).map((n) =>
      n.text === "Drop this." ? { ...n, status: "archived" as const } : n
    );
    const view = buildActiveMemoryView(m, notes);
    expect(view.rememberThese).toBe("Keep this.");
    expect(view.rememberThese).not.toContain("Drop this.");
    expect(view.avoidThese).toBe("Still avoid this.");
  });

  it("leaves every other FounderMemory field untouched", () => {
    const m = memory({ firstName: "Tunç", tonePreference: "Warm", rememberThese: "Fact." });
    const notes = deriveNotes(m, {}, {}, NOW);
    const view = buildActiveMemoryView(m, notes);
    expect(view.firstName).toBe("Tunç");
    expect(view.tonePreference).toBe("Warm");
  });
});

describe("getActiveMemoryView + forgetNote · composition over the real stores", () => {
  it("a saved fact appears in the active view", () => {
    useOperatorMemoryStore.getState().setMemory({ rememberThese: "Hans Müller prefers German." });
    const view = getActiveMemoryView(NOW);
    expect(view.rememberThese).toBe("Hans Müller prefers German.");
  });

  it("forgetNote removes the fact from the active view but preserves it in the raw ledger", () => {
    useOperatorMemoryStore.getState().setMemory({ rememberThese: "Hans Müller prefers German." });
    const [note] = deriveNotes(useOperatorMemoryStore.getState().memory, {}, {}, NOW);

    forgetNote(note.id, note.sourceKey);

    expect(getActiveMemoryView(NOW).rememberThese).toBe("");
    expect(useOperatorMemoryStore.getState().memory.rememberThese).toBe("Hans Müller prefers German.");
  });

  it("forgetNote also blocks the note's source candidate so it can't be silently re-learned", () => {
    useMemoryCandidatesStore.setState({
      candidates: {
        k1: candidate({ key: "k1", text: "Hans Müller prefers German.", status: "saved" })
      }
    });
    useOperatorMemoryStore.getState().setMemory({ rememberThese: "Hans Müller prefers German." });

    forgetNote("k1", "k1");

    expect(useMemoryCandidatesStore.getState().candidates.k1.status).toBe("blocked");
  });

  it("keep reactivates an archived note", () => {
    useOperatorMemoryStore.getState().setMemory({ rememberThese: "Fact." });
    const [note] = deriveNotes(useOperatorMemoryStore.getState().memory, {}, {}, NOW);
    useMemoryNotesStore.getState().archive(note.id);
    expect(getActiveMemoryView(NOW).rememberThese).toBe("");

    useMemoryNotesStore.getState().keep(note.id);
    expect(getActiveMemoryView(NOW).rememberThese).toBe("Fact.");
  });
});
