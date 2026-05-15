/**
 * Local Mission Receipt archive.
 *
 * Phase-1 Operator.Center: every successful mission persists a compact
 * receipt to `localStorage`. The Library page reads this list; nothing
 * is sent to the server (the existing server-side `/api/missions` flow
 * stays available for shared permalinks — that remains opt-in).
 *
 * The shape is intentionally smaller than `lib/missions/types.ts` so
 * thousands of receipts fit comfortably in the 5 MB localStorage budget.
 *
 * Storage layout:
 *   pf.receipts.v1  = ReceiptEntry[] (newest first, capped)
 */

"use client";

import type { Mode, ModelQuality, ProviderId } from "./types";

export interface ReceiptSafety {
  blocked: boolean;
  findings: number;
}

export interface ReceiptScore {
  clarity: number;
  specificity: number;
  safety: number;
  modelFit: number;
}

export interface ReceiptEntry {
  id: string;
  createdAt: number;
  inputPreview: string;
  outputPreview: string;
  mode: Mode;
  quality: ModelQuality;
  /** Resolved provider id (cloud-anthropic / cloud-openai / ollama / deterministic). */
  provider: ProviderId;
  /** Model id reported by the provider, when available. */
  model?: string;
  latencyMs?: number;
  /** Total wall time the pipeline reported. */
  elapsedMs: number;
  score: ReceiptScore;
  safety: ReceiptSafety;
  fallbackUsed: boolean;
}

const KEY = "pf.receipts.v1";
const MAX = 200;

export function newReceiptId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `r_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function loadReceipts(): ReceiptEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ReceiptEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveReceipt(entry: ReceiptEntry): ReceiptEntry[] {
  const list = loadReceipts();
  // Dedupe by id; newest at head; cap at MAX.
  const next = [entry, ...list.filter((e) => e.id !== entry.id)].slice(0, MAX);
  persist(next);
  return next;
}

export function deleteReceipt(id: string): ReceiptEntry[] {
  const next = loadReceipts().filter((e) => e.id !== id);
  persist(next);
  return next;
}

export function clearReceipts(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function persist(list: ReceiptEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota — drop silently */
  }
}

/** Truncate + collapse for inputPreview / outputPreview fields. */
export function previewOf(text: string, max = 240): string {
  const collapsed = (text || "").replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  return collapsed.slice(0, max - 1) + "…";
}
