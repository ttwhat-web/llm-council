/**
 * In-memory `PaymentStore` — tests + production fallback.
 */

import type { PaymentStore } from "./store";
import type { PaymentRecord } from "./types";

const MAX_PER_IDENTITY = 100;

export function createMemoryPaymentStore(): PaymentStore {
  const byId = new Map<string, PaymentRecord>();
  const byIdentity = new Map<string, string[]>(); // identity → newest-first ids
  const pending: string[] = []; // newest-first ids of pending/submitted

  function rememberIdentity(identityKey: string, id: string): void {
    const list = byIdentity.get(identityKey) ?? [];
    const next = [id, ...list.filter((x) => x !== id)].slice(0, MAX_PER_IDENTITY);
    byIdentity.set(identityKey, next);
  }

  function refreshPending(): void {
    pending.length = 0;
    for (const r of byId.values()) {
      if (r.status === "pending" || r.status === "submitted") pending.push(r.id);
    }
    pending.sort((a, b) => (byId.get(b)?.updatedAt ?? 0) - (byId.get(a)?.updatedAt ?? 0));
  }

  return {
    async put(record) {
      byId.set(record.id, record);
      rememberIdentity(record.identityKey, record.id);
      refreshPending();
      return record;
    },
    async get(id) {
      return byId.get(id) ?? null;
    },
    async listByIdentity(identityKey, limit = 25) {
      const ids = byIdentity.get(identityKey) ?? [];
      const out: PaymentRecord[] = [];
      for (const id of ids) {
        const r = byId.get(id);
        if (r) out.push(r);
        if (out.length >= limit) break;
      }
      return out;
    },
    async listPending(limit = 50) {
      const out: PaymentRecord[] = [];
      for (const id of pending) {
        const r = byId.get(id);
        if (r) out.push(r);
        if (out.length >= limit) break;
      }
      return out;
    },
    async countByPlanAndStatus(plan, status) {
      let n = 0;
      for (const r of byId.values()) {
        if (r.plan === plan && r.status === status) n += 1;
      }
      return n;
    },
    async patch(id, mutator) {
      const existing = byId.get(id);
      if (!existing) return null;
      const updated = mutator(existing);
      byId.set(id, { ...updated, updatedAt: Date.now() });
      refreshPending();
      return byId.get(id) ?? null;
    },
    async delete(id) {
      const r = byId.get(id);
      if (!r) return;
      byId.delete(id);
      const list = byIdentity.get(r.identityKey);
      if (list) byIdentity.set(r.identityKey, list.filter((x) => x !== id));
      refreshPending();
    }
  };
}
