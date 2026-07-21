/**
 * Saved Prompt Stacks — durable bookmarks of optimised prompts.
 *
 * Phase-3 feature: lets users save the current Mission Output as a
 * named, taggable record they can re-load, copy, or delete later. Pure
 * localStorage; the UI surface is components/SavedStacks.tsx.
 *
 * A Stack is intentionally smaller than a HistoryEntry — history is the
 * raw chronological log; stacks are the *curated* library users build
 * over time and (eventually) sync.
 */

"use client";

import type { Mode } from "./types";

export interface PromptStack {
  id: string;
  title: string;
  /** Original raw input the optimised prompt was built from. */
  input: string;
  /** Final execution-ready prompt body. */
  optimized: string;
  mode: Mode;
  tags: string[];
  createdAt: number;
}

const KEY = "pf.stacks.v1";
const MAX = 100;

export function loadStacks(): PromptStack[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PromptStack[]) : [];
  } catch {
    return [];
  }
}

export interface StackDraft {
  title: string;
  input: string;
  optimized: string;
  mode: Mode;
  tags?: string[];
}

export function saveStack(draft: StackDraft): PromptStack[] {
  const list = loadStacks();
  const stack: PromptStack = {
    id: newStackId(),
    title: draft.title.trim() || draft.input.slice(0, 60) || "Untitled stack",
    input: draft.input,
    optimized: draft.optimized,
    mode: draft.mode,
    tags: dedupeTags(draft.tags ?? []),
    createdAt: Date.now()
  };
  const next = [stack, ...list].slice(0, MAX);
  persist(next);
  return next;
}

export function deleteStack(id: string): PromptStack[] {
  const next = loadStacks().filter((s) => s.id !== id);
  persist(next);
  return next;
}

export function clearStacks(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function newStackId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const norm = t.trim().toLowerCase();
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out.slice(0, 8);
}

function persist(list: PromptStack[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota — drop silently */
  }
}
