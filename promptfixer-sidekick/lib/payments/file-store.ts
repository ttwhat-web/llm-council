/**
 * File-backed `PaymentStore` — JSON document at `PAYMENT_STORE_FILE`
 * (default `.promptfixer/payments.json`). Atomic writes + per-process
 * write queue, same pattern as `lib/missions/file-store.ts`.
 */

import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { dirname, isAbsolute, resolve } from "path";
import { randomBytes } from "crypto";
import type { PaymentStore } from "./store";
import type { PaymentRecord } from "./types";

const DEFAULT_PATH = ".promptfixer/payments.json";
const TOTAL_CAP = 2000;
const PER_IDENTITY_CAP = 100;

interface FileState {
  version: 1;
  payments: PaymentRecord[]; // newest first
}

function emptyState(): FileState {
  return { version: 1, payments: [] };
}

function resolveStorePath(raw?: string): string {
  const p = (raw && raw.trim()) || DEFAULT_PATH;
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

export function createFilePaymentStore(): PaymentStore {
  const filePath = resolveStorePath(process.env.PAYMENT_STORE_FILE);
  let queue: Promise<unknown> = Promise.resolve();
  let cache: FileState | null = null;

  async function load(): Promise<FileState> {
    if (cache) return cache;
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<FileState>;
      cache = {
        version: 1,
        payments: Array.isArray(parsed.payments) ? parsed.payments : []
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
      if (state.payments.length > TOTAL_CAP) state.payments.length = TOTAL_CAP;
      // Per-identity cap
      const counts = new Map<string, number>();
      state.payments = state.payments.filter((p) => {
        const c = counts.get(p.identityKey) ?? 0;
        if (c >= PER_IDENTITY_CAP) return false;
        counts.set(p.identityKey, c + 1);
        return true;
      });
      await persist(state);
      return result;
    });
    queue = next.catch(() => undefined);
    return next;
  }

  return {
    async put(record) {
      return withWrite((state) => {
        state.payments = [record, ...state.payments.filter((p) => p.id !== record.id)];
        return record;
      });
    },
    async get(id) {
      const state = await load();
      return state.payments.find((p) => p.id === id) ?? null;
    },
    async listByIdentity(identityKey, limit = 25) {
      const state = await load();
      return state.payments
        .filter((p) => p.identityKey === identityKey)
        .slice(0, limit);
    },
    async listPending(limit = 50) {
      const state = await load();
      return state.payments
        .filter((p) => p.status === "pending" || p.status === "submitted")
        .slice(0, limit);
    },
    async countByPlanAndStatus(plan, status) {
      const state = await load();
      return state.payments.filter((p) => p.plan === plan && p.status === status).length;
    },
    async patch(id, mutator) {
      return withWrite((state) => {
        const idx = state.payments.findIndex((p) => p.id === id);
        if (idx < 0) return null;
        const updated = mutator(state.payments[idx]!);
        state.payments[idx] = { ...updated, updatedAt: Date.now() };
        return state.payments[idx]!;
      });
    },
    async delete(id) {
      await withWrite((state) => {
        state.payments = state.payments.filter((p) => p.id !== id);
      });
    }
  };
}
