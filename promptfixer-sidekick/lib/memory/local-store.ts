/**
 * LocalStorageBackend — client-side Memory backend.
 *
 * Single localStorage key holds a per-user namespaced bag. The existing
 * features that already use localStorage (Mission Archive, Settings,
 * LivePreview state) are *not* migrated — this is the surface for new
 * Memory writes. Migration path lives in PROMPTOS.md §Memory.
 *
 * Browser-only. The server-side memory backend (file / SQLite) lands
 * with the agent runtime per PROMPTOS.md §Memory backends.
 */

"use client";

import type { MemoryBackend, MemoryEntry, MemoryQuery, Namespace } from "./types";

const STORAGE_KEY = "promptfixer.memory.v1";

interface Snapshot {
  v: 1;
  // user → namespace → key → entry
  data: Record<string, Record<string, Record<string, MemoryEntry>>>;
}

function read(): Snapshot {
  if (typeof window === "undefined") return { v: 1, data: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { v: 1, data: {} };
    const parsed = JSON.parse(raw) as Snapshot;
    if (parsed?.v === 1 && parsed.data && typeof parsed.data === "object") return parsed;
  } catch {
    /* ignore */
  }
  return { v: 1, data: {} };
}

function write(snap: Snapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    /* quota exceeded — drop silently */
  }
}

function nowMs(): number {
  return Date.now();
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export const localStorageBackend: MemoryBackend = {
  async get<T = unknown>(
    user: string,
    ns: Namespace,
    key: string
  ): Promise<MemoryEntry<T> | null> {
    const snap = read();
    return (snap.data[user]?.[ns]?.[key] as MemoryEntry<T> | undefined) ?? null;
  },

  async put<T = unknown>(
    user: string,
    ns: Namespace,
    key: string,
    value: T,
    tags?: string[]
  ): Promise<MemoryEntry<T>> {
    const snap = read();
    const userBag = (snap.data[user] = snap.data[user] ?? {});
    const nsBag = (userBag[ns] = userBag[ns] ?? {});
    const existing = nsBag[key] as MemoryEntry<T> | undefined;
    const now = nowMs();
    const entry: MemoryEntry<T> = {
      id: existing?.id ?? makeId(),
      user,
      ns,
      key,
      value,
      tags,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    nsBag[key] = entry as MemoryEntry<unknown>;
    write(snap);
    return entry;
  },

  async del(user, ns, key) {
    const snap = read();
    const nsBag = snap.data[user]?.[ns];
    if (!nsBag || !(key in nsBag)) return false;
    delete nsBag[key];
    write(snap);
    return true;
  },

  async list<T = unknown>(query: MemoryQuery): Promise<MemoryEntry<T>[]> {
    const snap = read();
    const nsBag = snap.data[query.user]?.[query.ns];
    if (!nsBag) return [];
    let rows = Object.values(nsBag) as MemoryEntry<T>[];
    if (query.tags?.length) {
      rows = rows.filter((r) =>
        (query.tags ?? []).every((t) => (r.tags ?? []).includes(t))
      );
    }
    if (query.query) {
      const needle = query.query.toLowerCase();
      rows = rows.filter((r) => {
        const haystack = `${r.key}\n${safeString(r.value)}`.toLowerCase();
        return haystack.includes(needle);
      });
    }
    rows.sort((a, b) => b.updatedAt - a.updatedAt);
    return rows.slice(0, Math.max(0, query.limit ?? 100));
  }
};

function safeString(v: unknown): string {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
}

export type { MemoryBackend, MemoryEntry, MemoryQuery, Namespace };
