/**
 * File-backed `BillingStore` for development / single-host deploys.
 *
 * Persists everything as one JSON document under
 * `BILLING_STORE_FILE` (default `.promptfixer/billing-store.json`).
 *
 * Writes are atomic (write-temp + rename) and serialised through a
 * per-process promise queue so concurrent route handlers don't trample
 * each other. Reads are buffered in memory after the first hit and
 * invalidated on every write — fine for local dev / single-instance
 * VPS, NOT safe for multi-instance / serverless.
 *
 * The file is git-ignored. Treat it as ephemeral.
 */

import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { dirname, isAbsolute, resolve } from "path";
import { randomBytes } from "crypto";
import type {
  BillingAuditEvent,
  BillingStore,
  Customer,
  Subscription,
  UsageRecord
} from "./store";
import { newAuditId, nextResetMs } from "./store";
import type { BillingAction } from "./types";

const DEFAULT_PATH = ".promptfixer/billing-store.json";
const AUDIT_CAP = 1000;

interface FileState {
  version: 1;
  customers: Customer[];
  subscriptions: Subscription[];
  usage: UsageRecord[];
  audit: BillingAuditEvent[];
}

function emptyState(): FileState {
  return { version: 1, customers: [], subscriptions: [], usage: [], audit: [] };
}

function usageKey(r: { identityKey: string; action: BillingAction; dateKey: string }): string {
  return `${r.action}:${r.identityKey}:${r.dateKey}`;
}

export function createFileStore(): BillingStore {
  const filePath = resolveStorePath(process.env.BILLING_STORE_FILE);

  // Single-process write queue so two handlers can't race the rename.
  // Each enqueue runs after the previous one settles.
  let queue: Promise<unknown> = Promise.resolve();
  let cache: FileState | null = null;

  async function loadState(): Promise<FileState> {
    if (cache) return cache;
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<FileState>;
      const merged: FileState = {
        version: 1,
        customers: Array.isArray(parsed.customers) ? parsed.customers : [],
        subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
        usage: Array.isArray(parsed.usage) ? parsed.usage : [],
        audit: Array.isArray(parsed.audit) ? parsed.audit : []
      };
      cache = merged;
      return merged;
    } catch (err: unknown) {
      // Missing file = empty state. Anything else stays a hard error so
      // we don't silently corrupt records on disk.
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
      const state = await loadState();
      const result = await fn(state);
      await persist(state);
      return result;
    });
    queue = next.catch(() => undefined);
    return next;
  }

  return {
    async getCustomerByIdentity(identityKey) {
      const state = await loadState();
      return state.customers.find((c) => c.identityKey === identityKey) ?? null;
    },

    async upsertCustomer(customer) {
      return withWrite((state) => {
        const idx = state.customers.findIndex((c) => c.id === customer.id);
        const now = Date.now();
        if (idx >= 0) {
          const existing = state.customers[idx]!;
          const merged: Customer = {
            ...existing,
            ...customer,
            createdAt: existing.createdAt,
            updatedAt: now
          };
          state.customers[idx] = merged;
          return merged;
        }
        const fresh: Customer = { ...customer, updatedAt: now };
        state.customers.push(fresh);
        return fresh;
      });
    },

    async getSubscription(customerId) {
      const state = await loadState();
      return state.subscriptions.find((s) => s.customerId === customerId) ?? null;
    },

    async upsertSubscription(sub) {
      return withWrite((state) => {
        const idx = state.subscriptions.findIndex((s) => s.customerId === sub.customerId);
        const now = Date.now();
        if (idx >= 0) {
          const existing = state.subscriptions[idx]!;
          const merged: Subscription = {
            ...existing,
            ...sub,
            createdAt: existing.createdAt,
            updatedAt: now
          };
          state.subscriptions[idx] = merged;
          return merged;
        }
        const fresh: Subscription = { ...sub, updatedAt: now };
        state.subscriptions.push(fresh);
        return fresh;
      });
    },

    async deleteSubscription(customerId) {
      await withWrite((state) => {
        state.subscriptions = state.subscriptions.filter((s) => s.customerId !== customerId);
      });
    },

    async getUsage(identityKey, action, dateKey) {
      const state = await loadState();
      return (
        state.usage.find(
          (u) =>
            u.identityKey === identityKey && u.action === action && u.dateKey === dateKey
        ) ?? null
      );
    },

    async incrementUsage(identityKey, action, dateKey) {
      return withWrite((state) => {
        const idx = state.usage.findIndex(
          (u) =>
            u.identityKey === identityKey && u.action === action && u.dateKey === dateKey
        );
        const now = Date.now();
        const existing = idx >= 0 ? state.usage[idx]! : null;
        const next: UsageRecord =
          existing && existing.resetAt > now
            ? { ...existing, count: existing.count + 1 }
            : {
                identityKey,
                action,
                dateKey,
                count: 1,
                resetAt: nextResetMs(now)
              };
        if (idx >= 0) state.usage[idx] = next;
        else state.usage.push(next);

        // Janitorial: keep the usage list bounded by dropping records
        // that have already reset and been idle a full day. The store
        // is small enough that we do this on every write.
        state.usage = state.usage.filter((u) => u.resetAt > now - 24 * 60 * 60 * 1000);

        return next;
      });
    },

    async resetUsage(identityKey, action, dateKey) {
      await withWrite((state) => {
        state.usage = state.usage.filter(
          (u) =>
            !(u.identityKey === identityKey && u.action === action && u.dateKey === dateKey)
        );
      });
    },

    async getAuditEvents(identityKey, limit = 100) {
      const state = await loadState();
      const filtered = identityKey
        ? state.audit.filter((e) => e.identityKey === identityKey)
        : state.audit;
      return filtered.slice(-limit).reverse();
    },

    async appendAuditEvent(event) {
      return withWrite((state) => {
        const full: BillingAuditEvent = { ...event, id: newAuditId(), ts: Date.now() };
        state.audit.push(full);
        if (state.audit.length > AUDIT_CAP) {
          state.audit.splice(0, state.audit.length - AUDIT_CAP);
        }
        return full;
      });
    },

    async listCustomers() {
      const state = await loadState();
      return [...state.customers];
    },
    async listSubscriptions() {
      const state = await loadState();
      return [...state.subscriptions];
    },
    async listUsage() {
      const state = await loadState();
      return [...state.usage];
    }
  };
}

function resolveStorePath(raw?: string): string {
  const p = (raw && raw.trim()) || DEFAULT_PATH;
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}
