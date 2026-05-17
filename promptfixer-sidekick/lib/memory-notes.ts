/**
 * Memory notes — user-curated local memory.
 *
 * Phase-2 Operator.Center: until real connectors land (Obsidian /
 * GitHub / Gmail / Drive), the operator can manually capture notes
 * here. They search locally and can be attached to a mission to
 * prepend as `## Context` blocks.
 *
 * Pure localStorage. No backend. Notes live entirely in the operator's
 * browser.
 *
 * Storage layout:
 *   pf.memory.notes.v1  = MemoryNote[]
 */

"use client";

export interface MemoryNote {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

const KEY = "pf.memory.notes.v1";
const MAX = 500;

export function newNoteId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `n_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function loadNotes(): MemoryNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MemoryNote[]) : [];
  } catch {
    return [];
  }
}

export function saveNote(input: Omit<MemoryNote, "createdAt" | "updatedAt"> & {
  createdAt?: number;
}): MemoryNote[] {
  const list = loadNotes();
  const now = Date.now();
  const existing = list.find((n) => n.id === input.id);
  const merged: MemoryNote = {
    id: input.id,
    title: (input.title || "").trim() || "Untitled note",
    body: input.body || "",
    tags: dedupeTags(input.tags ?? []),
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now
  };
  const next = [merged, ...list.filter((n) => n.id !== merged.id)].slice(0, MAX);
  persist(next);
  return next;
}

export function deleteNote(id: string): MemoryNote[] {
  const next = loadNotes().filter((n) => n.id !== id);
  persist(next);
  return next;
}

export function clearNotes(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Score notes against a free-text query. Tokenised lowercase substring
 * match on title + body + tags. Returns notes sorted newest-first
 * within ties.
 */
export function searchNotes(query: string, notes?: MemoryNote[]): MemoryNote[] {
  const list = notes ?? loadNotes();
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const tokens = q.split(/\s+/).filter(Boolean);
  type Scored = { note: MemoryNote; score: number };
  const scored: Scored[] = [];
  for (const note of list) {
    const haystack = [note.title, note.body, note.tags.join(" ")]
      .join(" ")
      .toLowerCase();
    let score = 0;
    for (const t of tokens) {
      const idx = haystack.indexOf(t);
      if (idx < 0) {
        score = -1;
        break;
      }
      // Tiny boost for title hits.
      score +=
        note.title.toLowerCase().includes(t) ? 5 : 1;
    }
    if (score >= 0) scored.push({ note, score });
  }
  scored.sort((a, b) => b.score - a.score || b.note.updatedAt - a.note.updatedAt);
  return scored.map((s) => s.note);
}

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out.slice(0, 12);
}

function persist(list: MemoryNote[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota — drop silently */
  }
}

/** Render attached notes as a Markdown context block. */
export function notesToContextBlock(notes: MemoryNote[]): string {
  if (notes.length === 0) return "";
  const parts = ["## Context", ""];
  for (const n of notes) {
    parts.push(`### ${n.title}`);
    if (n.tags.length > 0) parts.push(`_tags:_ ${n.tags.join(", ")}`);
    parts.push("");
    parts.push(n.body.trim());
    parts.push("");
  }
  parts.push("---", "");
  return parts.join("\n");
}
