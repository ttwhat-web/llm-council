"use client";

/**
 * Memory notes · per-note overrides for Memory Distillation.
 *
 * FounderMemory.rememberThese/avoidThese (operatorMemory store) stay
 * the permanent, untouched ledger of every fact ever saved — this
 * store never edits that text, so nothing is ever silently deleted.
 * It only tracks, per note (keyed by the originating candidate's key
 * when one exists, otherwise a stable id for a manually-typed line),
 * whether the founder has archived or forgotten it, and when it was
 * last reinforced ("still true", confirmed by a Keep tap). Memory
 * Distillation (services/memory/distillation.ts) reads this alongside
 * the raw memory + the candidate ledger to decide what's still active,
 * stale, duplicated, or contradictory.
 */

import { create } from "zustand";

export type NoteStatus = "active" | "archived" | "forgotten";

export interface NoteOverride {
  status: NoteStatus;
  /** Last time a founder action (Keep, or the original save) confirmed
   *  this fact — the only clock distillation's staleness check reads. */
  lastReinforcedAt: number;
}

const STORAGE_KEY = "operator.memoryNotes.v0";

function readOverrides(): Record<string, NoteOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Record<string, NoteOverride>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    /* quota */
  }
}

interface MemoryNotesState {
  overrides: Record<string, NoteOverride>;
  /** Founder confirmed this note is still true — resets its age and
   *  reactivates it if it had been archived. */
  keep(noteId: string): void;
  /** Soft removal: stops feeding future drafts, stays visible in the
   *  ledger and reversible via keep(). */
  archive(noteId: string): void;
  /** Hard removal: stops feeding future drafts. Callers that also know
   *  this note's source candidate key should additionally block it
   *  (see services/memory/distillation.ts's forgetNote) so the same
   *  fact can't be silently re-learned. */
  forget(noteId: string): void;
  reset(): void;
}

export const useMemoryNotesStore = create<MemoryNotesState>((set, get) => ({
  overrides: readOverrides(),

  keep(noteId) {
    const overrides: Record<string, NoteOverride> = {
      ...get().overrides,
      [noteId]: { status: "active", lastReinforcedAt: Date.now() }
    };
    writeOverrides(overrides);
    set({ overrides });
  },

  archive(noteId) {
    const existing = get().overrides[noteId];
    const overrides: Record<string, NoteOverride> = {
      ...get().overrides,
      [noteId]: { status: "archived", lastReinforcedAt: existing?.lastReinforcedAt ?? Date.now() }
    };
    writeOverrides(overrides);
    set({ overrides });
  },

  forget(noteId) {
    const existing = get().overrides[noteId];
    const overrides: Record<string, NoteOverride> = {
      ...get().overrides,
      [noteId]: { status: "forgotten", lastReinforcedAt: existing?.lastReinforcedAt ?? Date.now() }
    };
    writeOverrides(overrides);
    set({ overrides });
  },

  reset() {
    writeOverrides({});
    set({ overrides: {} });
  }
}));
