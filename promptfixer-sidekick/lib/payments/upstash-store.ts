/**
 * Upstash Redis `PaymentStore`.
 *
 * Key layout:
 *   pf:pay:by_id:<id>                 JSON   payment record
 *   pf:pay:by_identity:<identityKey>  LIST   newest-first ids
 *   pf:pay:pending                    LIST   newest-first ids of pending+submitted
 *   pf:pay:count:<plan>:<status>      INT    counter (best-effort)
 */

import { Redis } from "@upstash/redis";
import type { PaymentStore } from "./store";
import type { PaymentRecord } from "./types";

const PER_IDENTITY_CAP = 100;
const PENDING_CAP = 200;

function byIdKey(id: string): string { return `pf:pay:by_id:${id}`; }
function byIdentityKey(k: string): string { return `pf:pay:by_identity:${k}`; }
const PENDING_KEY = "pf:pay:pending";
function countKey(plan: string, status: string): string {
  return `pf:pay:count:${plan}:${status}`;
}

function isOpen(status: string): boolean {
  return status === "pending" || status === "submitted";
}

export function createUpstashPaymentStore(): PaymentStore {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN must be set when PAYMENT_STORE=upstash"
    );
  }
  const redis = new Redis({ url, token });

  async function incrementCounter(plan: string, status: string, by = 1): Promise<void> {
    if (by === 0) return;
    if (by > 0) await redis.incrby(countKey(plan, status), by);
    else await redis.decrby(countKey(plan, status), Math.abs(by));
  }

  return {
    async put(record) {
      const existing = await redis.get<PaymentRecord>(byIdKey(record.id));
      await redis.set(byIdKey(record.id), record);
      if (!existing) {
        await redis.lpush(byIdentityKey(record.identityKey), record.id);
        await redis.ltrim(byIdentityKey(record.identityKey), 0, PER_IDENTITY_CAP - 1);
        if (isOpen(record.status)) {
          await redis.lpush(PENDING_KEY, record.id);
          await redis.ltrim(PENDING_KEY, 0, PENDING_CAP - 1);
        }
        await incrementCounter(record.plan, record.status, 1);
      } else {
        if (existing.status !== record.status) {
          await incrementCounter(existing.plan, existing.status, -1);
          await incrementCounter(record.plan, record.status, 1);
          // Pending queue lifecycle
          if (isOpen(existing.status) && !isOpen(record.status)) {
            // Best-effort rebuild — the pending list is short.
            const ids = await redis.lrange<string>(PENDING_KEY, 0, PENDING_CAP - 1);
            const filtered = ids.filter((x) => x !== record.id);
            await redis.del(PENDING_KEY);
            if (filtered.length > 0) await redis.rpush(PENDING_KEY, ...filtered);
          } else if (!isOpen(existing.status) && isOpen(record.status)) {
            await redis.lpush(PENDING_KEY, record.id);
            await redis.ltrim(PENDING_KEY, 0, PENDING_CAP - 1);
          }
        }
      }
      return record;
    },
    async get(id) {
      return (await redis.get<PaymentRecord>(byIdKey(id))) ?? null;
    },
    async listByIdentity(identityKey, limit = 25) {
      const ids = await redis.lrange<string>(byIdentityKey(identityKey), 0, Math.max(0, limit - 1));
      const out: PaymentRecord[] = [];
      for (const id of ids) {
        const r = await redis.get<PaymentRecord>(byIdKey(id));
        if (r) out.push(r);
      }
      return out;
    },
    async listPending(limit = 50) {
      const ids = await redis.lrange<string>(PENDING_KEY, 0, Math.max(0, limit - 1));
      const out: PaymentRecord[] = [];
      for (const id of ids) {
        const r = await redis.get<PaymentRecord>(byIdKey(id));
        if (r && isOpen(r.status)) out.push(r);
      }
      return out;
    },
    async countByPlanAndStatus(plan, status) {
      const n = await redis.get<number>(countKey(plan, status));
      return typeof n === "number" ? Math.max(0, n) : 0;
    },
    async patch(id, mutator) {
      const existing = await redis.get<PaymentRecord>(byIdKey(id));
      if (!existing) return null;
      const updated = mutator(existing);
      const next: PaymentRecord = { ...updated, updatedAt: Date.now() };
      await this.put(next);
      return next;
    },
    async delete(id) {
      const r = await redis.get<PaymentRecord>(byIdKey(id));
      await redis.del(byIdKey(id));
      if (r) {
        const ids = await redis.lrange<string>(byIdentityKey(r.identityKey), 0, PER_IDENTITY_CAP - 1);
        const filtered = ids.filter((x) => x !== id);
        await redis.del(byIdentityKey(r.identityKey));
        if (filtered.length > 0) await redis.rpush(byIdentityKey(r.identityKey), ...filtered);
        await incrementCounter(r.plan, r.status, -1);
      }
    }
  };
}
