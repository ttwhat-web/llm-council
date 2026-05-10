/**
 * File-backed `MissionStore` for development.
 *
 * Persists every receipt as JSON under `MISSION_STORE_FILE` (default
 * `.promptfixer/missions.json`). Same write-queue + atomic-rename
 * pattern as `lib/billing/file-store.ts`. Cap: 1000 receipts total,
 * dropped FIFO when exceeded.
 */

import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { dirname, isAbsolute, resolve } from "path";
import { randomBytes } from "crypto";
import type { MissionStore } from "./store";
import type { MissionReceipt, MissionVisibility } from "./types";

const DEFAULT_PATH = ".promptfixer/missions.json";
const TOTAL_CAP = 1000;
const PER_OWNER_CAP = 200;

interface FileState {
  version: 1;
  receipts: MissionReceipt[]; // newest first
}

function emptyState(): FileState {
  return { version: 1, receipts: [] };
}

function resolveStorePath(raw?: string): string {
  const p = (raw && raw.trim()) || DEFAULT_PATH;
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

export function createFileMissionStore(): MissionStore {
  const filePath = resolveStorePath(process.env.MISSION_STORE_FILE);
  let queue: Promise<unknown> = Promise.resolve();
  let cache: FileState | null = null;

  async function load(): Promise<FileState> {
    if (cache) return cache;
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<FileState>;
      cache = {
        version: 1,
        receipts: Array.isArray(parsed.receipts) ? parsed.receipts : []
      };
      return cache;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === "ENOENT") {
        cache = emptyState();
        return cache;
      }
      throw err;
    }
  }

  async function persist(state: FileState): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
    await writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
    await rename(tmp, filePath);
    cache = state;
  }

  function withWrite<T>(fn: (state: FileState) => Promise<T> | T): Promise<T> {
    const next = queue.then(async () => {
      const state = await load();
      const result = await fn(state);
      // Cap total + per-owner.
      if (state.receipts.length > TOTAL_CAP) {
        state.receipts.length = TOTAL_CAP;
      }
      const counts = new Map<string, number>();
      state.receipts = state.receipts.filter((r) => {
        const c = counts.get(r.ownerKey) ?? 0;
        if (c >= PER_OWNER_CAP) return false;
        counts.set(r.ownerKey, c + 1);
        return true;
      });
      await persist(state);
      return result;
    });
    queue = next.catch(() => undefined);
    return next;
  }

  return {
    async put(receipt) {
      return withWrite((state) => {
        // Insert at head; drop any duplicate id.
        state.receipts = [receipt, ...state.receipts.filter((r) => r.id !== receipt.id)];
        return receipt;
      });
    },
    async get(id) {
      const state = await load();
      return state.receipts.find((r) => r.id === id) ?? null;
    },
    async getShared(id) {
      const state = await load();
      const r = state.receipts.find((r) => r.id === id);
      return r && r.visibility === "shared" ? r : null;
    },
    async updateVisibility(id, visibility: MissionVisibility) {
      return withWrite((state) => {
        const idx = state.receipts.findIndex((r) => r.id === id);
        if (idx < 0) return null;
        const updated: MissionReceipt = {
          ...state.receipts[idx]!,
          visibility,
          updatedAt: Date.now()
        };
        state.receipts[idx] = updated;
        return updated;
      });
    },
    async delete(id) {
      await withWrite((state) => {
        state.receipts = state.receipts.filter((r) => r.id !== id);
      });
    },
    async listRecent(ownerKey, limit) {
      const state = await load();
      return state.receipts.filter((r) => r.ownerKey === ownerKey).slice(0, limit);
    }
  };
}
