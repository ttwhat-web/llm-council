/**
 * In-memory `MissionStore` — single-instance, resets on deploy.
 * Used for tests and as the production fallback when no Upstash
 * credentials are present.
 */

import type { MissionStore } from "./store";
import type { MissionReceipt, MissionVisibility } from "./types";

const MAX_PER_OWNER = 200;

export function createMemoryMissionStore(): MissionStore {
  const byId = new Map<string, MissionReceipt>();
  const byOwner = new Map<string, string[]>(); // ownerKey → newest-first ids

  function rememberOwner(ownerKey: string, id: string): void {
    const list = byOwner.get(ownerKey) ?? [];
    const next = [id, ...list.filter((x) => x !== id)].slice(0, MAX_PER_OWNER);
    byOwner.set(ownerKey, next);
  }

  return {
    async put(receipt) {
      byId.set(receipt.id, receipt);
      rememberOwner(receipt.ownerKey, receipt.id);
      return receipt;
    },
    async get(id) {
      return byId.get(id) ?? null;
    },
    async getShared(id) {
      const r = byId.get(id);
      return r && r.visibility === "shared" ? r : null;
    },
    async updateVisibility(id, visibility: MissionVisibility) {
      const r = byId.get(id);
      if (!r) return null;
      const updated: MissionReceipt = { ...r, visibility, updatedAt: Date.now() };
      byId.set(id, updated);
      return updated;
    },
    async delete(id) {
      const r = byId.get(id);
      if (!r) return;
      byId.delete(id);
      const list = byOwner.get(r.ownerKey);
      if (list) byOwner.set(r.ownerKey, list.filter((x) => x !== id));
    },
    async listRecent(ownerKey, limit) {
      const ids = byOwner.get(ownerKey) ?? [];
      const out: MissionReceipt[] = [];
      for (const id of ids) {
        const r = byId.get(id);
        if (r) out.push(r);
        if (out.length >= limit) break;
      }
      return out;
    }
  };
}
