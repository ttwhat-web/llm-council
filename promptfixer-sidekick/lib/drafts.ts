/**
 * Local Drafts — saved exports / specs / plans.
 *
 * The third tab of Library. Operators save a mission's rendered
 * export (Cursor Task, Claude Prompt, Architect plan, etc.) here
 * to come back to it later. Pure localStorage; no backend.
 *
 * Storage layout:
 *   pf.drafts.v1 = LibraryDraft[]
 */

"use client";

import type { ExportFormat } from "./exports";

export interface LibraryDraft {
  id: string;
  title: string;
  format: ExportFormat | "custom";
  /** Origin receipt id when the draft was saved from a mission. */
  sourceReceiptId?: string;
  /** Rendered text payload. */
  content: string;
  createdAt: number;
}

const KEY = "pf.drafts.v1";
const MAX = 200;

export function newDraftId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `d_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function loadDrafts(): LibraryDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LibraryDraft[]) : [];
  } catch {
    return [];
  }
}

export function saveDraft(input: Omit<LibraryDraft, "createdAt" | "id"> & { id?: string }): LibraryDraft[] {
  const list = loadDrafts();
  const draft: LibraryDraft = {
    id: input.id ?? newDraftId(),
    title: (input.title || "").trim() || "Untitled draft",
    format: input.format,
    sourceReceiptId: input.sourceReceiptId,
    content: input.content,
    createdAt: Date.now()
  };
  const next = [draft, ...list.filter((d) => d.id !== draft.id)].slice(0, MAX);
  persist(next);
  return next;
}

export function deleteDraft(id: string): LibraryDraft[] {
  const next = loadDrafts().filter((d) => d.id !== id);
  persist(next);
  return next;
}

export function clearDrafts(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function persist(list: LibraryDraft[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
