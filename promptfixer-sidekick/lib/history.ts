/**
 * Browser-only prompt history.
 *
 * Pure localStorage, capped at MAX entries. No DB, no network. The drawer
 * UI in components/HistoryDrawer.tsx is the only consumer. Auth/billing
 * later can swap this for a server-side store without touching the UI.
 */

"use client";

import type { Engine, Mode, ModelQuality } from "./types";

export interface HistoryEntry {
  id: string;
  timestamp: number;
  input: string;
  output: string;
  mode: Mode;
  engine: Engine;
  modelQuality: ModelQuality;
  /** Optional 4-axis score, when the result had one. */
  score?: { clarity: number; specificity: number; safety: number; modelFit: number };
}

const KEY = "promptfixer.history.v1";
const MAX = 50;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveEntry(entry: HistoryEntry): HistoryEntry[] {
  const list = loadHistory();
  // Drop near-dupes (same trimmed input + mode within 10s).
  const tenSec = 10_000;
  const filtered = list.filter(
    (e) =>
      !(
        e.input.trim() === entry.input.trim() &&
        e.mode === entry.mode &&
        Math.abs(e.timestamp - entry.timestamp) < tenSec
      )
  );
  const next = [entry, ...filtered].slice(0, MAX);
  persist(next);
  return next;
}

export function deleteEntry(id: string): HistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id);
  persist(next);
  return next;
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `h_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function persist(list: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota exceeded etc — drop silently */
  }
}
