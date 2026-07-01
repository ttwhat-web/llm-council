"use client";

/**
 * Memory candidates · "I noticed this. Save to memory?"
 *
 * Real events (approved sends, edits, feedback, calendar moves) get
 * turned into candidate facts by services/memory/candidates.ts. This
 * store is the gate between "Operator noticed a pattern" and "Operator
 * actually remembers it" — nothing here is ever saved silently.
 *
 * Repetition: language / tone / behavior candidates need the same fact
 * observed more than once before they're worth interrupting the
 * founder for (a single coincidence isn't a pattern). Avoid-rule
 * candidates come from the founder's own explicit correction, so they
 * surface on the first occurrence — that's not a guess, it's a quote.
 *
 * Once blocked ("Never remember this"), a key never resurfaces, ever —
 * observe() is a no-op for it regardless of new evidence.
 */

import { create } from "zustand";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import type { MemoryCandidateDraft, MemoryCandidateKind } from "@/services/memory/candidates";

export type CandidateStatus = "pending" | "saved" | "ignored" | "blocked";

export interface MemoryCandidate {
  key: string;
  kind: MemoryCandidateKind;
  subjectLabel: string;
  text: string;
  status: CandidateStatus;
  evidenceCount: number;
  firstSeenAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "operator.memoryCandidates.v0";

/** How many independent observations a heuristic-based kind needs
 *  before it's worth asking the founder. avoid is 1 — it's a direct
 *  quote of feedback, not a pattern guess. */
const EVIDENCE_THRESHOLD: Record<MemoryCandidateKind, number> = {
  language: 2,
  tone: 2,
  behavior: 2,
  avoid: 1
};

function readCandidates(): Record<string, MemoryCandidate> {
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

function writeCandidates(candidates: Record<string, MemoryCandidate>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
  } catch {
    /* quota */
  }
}

interface MemoryCandidatesState {
  candidates: Record<string, MemoryCandidate>;
  /** Record one more piece of evidence for a fact. No-op for null
   *  (the detector found nothing) and for blocked/saved keys. */
  observe(draft: MemoryCandidateDraft | null): void;
  /** Write the candidate's text into FounderMemory (rememberThese for
   *  language/tone/behavior, avoidThese for avoid) and mark it saved. */
  save(key: string): void;
  ignore(key: string): void;
  block(key: string): void;
  /** Candidates ready to show the founder — met their threshold, not
   *  yet resolved. */
  pendingCandidates(): MemoryCandidate[];
  reset(): void;
}

export const useMemoryCandidatesStore = create<MemoryCandidatesState>((set, get) => ({
  candidates: readCandidates(),

  observe(draft) {
    if (!draft) return;
    const existing = get().candidates[draft.key];
    if (existing?.status === "blocked" || existing?.status === "saved") return;

    const now = Date.now();
    const evidenceCount = (existing?.evidenceCount ?? 0) + 1;
    // Status only ever tracks the founder-decision lifecycle (pending →
    // saved/ignored/blocked). Whether a "pending" record has actually
    // met its evidence threshold yet is decided by pendingCandidates()
    // below, not encoded as a fifth status. Fresh evidence always
    // resurfaces something the founder merely ignored earlier — it
    // never resurfaces something blocked (handled above).
    const status: CandidateStatus = "pending";

    const next: MemoryCandidate = {
      key: draft.key,
      kind: draft.kind,
      subjectLabel: draft.subjectLabel,
      text: draft.text,
      status,
      evidenceCount,
      firstSeenAt: existing?.firstSeenAt ?? now,
      updatedAt: now
    };
    const candidates = { ...get().candidates, [draft.key]: next };
    writeCandidates(candidates);
    set({ candidates });
  },

  save(key) {
    const c = get().candidates[key];
    if (!c) return;
    const memory = useOperatorMemoryStore.getState().memory;
    const current = c.kind === "avoid" ? memory.avoidThese : memory.rememberThese;
    const lines = current
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.includes(c.text.trim())) {
      const merged = [...lines, c.text.trim()].join("\n");
      if (c.kind === "avoid") useOperatorMemoryStore.getState().setMemory({ avoidThese: merged });
      else useOperatorMemoryStore.getState().setMemory({ rememberThese: merged });
    }
    const candidates = { ...get().candidates, [key]: { ...c, status: "saved" as const, updatedAt: Date.now() } };
    writeCandidates(candidates);
    set({ candidates });
  },

  ignore(key) {
    const c = get().candidates[key];
    if (!c) return;
    const candidates = { ...get().candidates, [key]: { ...c, status: "ignored" as const, updatedAt: Date.now() } };
    writeCandidates(candidates);
    set({ candidates });
  },

  block(key) {
    const c = get().candidates[key];
    if (!c) return;
    const candidates = { ...get().candidates, [key]: { ...c, status: "blocked" as const, updatedAt: Date.now() } };
    writeCandidates(candidates);
    set({ candidates });
  },

  pendingCandidates() {
    return Object.values(get().candidates)
      .filter((c) => c.status === "pending" && c.evidenceCount >= EVIDENCE_THRESHOLD[c.kind])
      .sort((a, b) => a.firstSeenAt - b.firstSeenAt);
  },

  reset() {
    writeCandidates({});
    set({ candidates: {} });
  }
}));
