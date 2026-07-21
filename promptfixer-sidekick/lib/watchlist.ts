/**
 * Local watchlist — manually curated symbols.
 *
 * Phase-2 Operator.Center: the Terminal surface will eventually pipe
 * real quote feeds in, but until then operators can capture the
 * symbols they care about and an optional human-readable label. NO
 * fake prices are rendered alongside.
 *
 * Storage layout:
 *   pf.terminal.watchlist.v1 = WatchSymbol[]
 */

"use client";

export interface WatchSymbol {
  id: string;
  ticker: string;
  label?: string;
  /** Optional venue / class — "stock", "crypto", "fx", ... */
  kind?: string;
  addedAt: number;
}

const KEY = "pf.terminal.watchlist.v1";
const MAX = 100;

export function newSymbolId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `s_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function loadWatchlist(): WatchSymbol[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WatchSymbol[]) : [];
  } catch {
    return [];
  }
}

export function addSymbol(input: { ticker: string; label?: string; kind?: string }): WatchSymbol[] {
  const ticker = input.ticker.trim().toUpperCase();
  if (!ticker) return loadWatchlist();
  const list = loadWatchlist();
  if (list.some((s) => s.ticker === ticker)) return list;
  const next = [
    {
      id: newSymbolId(),
      ticker,
      label: input.label?.trim() || undefined,
      kind: input.kind?.trim().toLowerCase() || undefined,
      addedAt: Date.now()
    },
    ...list
  ].slice(0, MAX);
  persist(next);
  return next;
}

export function removeSymbol(id: string): WatchSymbol[] {
  const next = loadWatchlist().filter((s) => s.id !== id);
  persist(next);
  return next;
}

export function clearWatchlist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function persist(list: WatchSymbol[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
