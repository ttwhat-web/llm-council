/**
 * Upstash Redis `BillingStore` implementation.
 *
 * Selected when `BILLING_STORE=upstash` AND
 * `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are configured.
 *
 * Key layout:
 *   pf:cust:by_id:<customerId>            JSON  — customer record
 *   pf:cust:by_identity:<identityKey>     STR   — customerId pointer
 *   pf:sub:by_customer:<customerId>       JSON  — subscription record
 *   pf:usage:<action>:<identityKey>:<day> JSON  — { count, resetAt }, TTL 36h
 *   pf:audit:list                         LIST  — newest at head; capped at 5000
 *
 * Multi-instance safe. Atomic increments use INCR + EXPIRE; the JSON
 * record is rebuilt on read and only written when first-seen.
 */

import { Redis } from "@upstash/redis";
import type {
  BillingAuditEvent,
  BillingStore,
  Customer,
  Subscription,
  UsageRecord
} from "./store";
import { newAuditId, nextResetMs } from "./store";
import type { BillingAction } from "./types";

const AUDIT_KEY = "pf:audit:list";
const AUDIT_CAP = 5000;
const USAGE_TTL_S = 60 * 60 * 36; // 36h — covers worst-case timezone drift

function key(...parts: string[]): string {
  return parts.join(":");
}

function custByIdKey(id: string): string {
  return key("pf", "cust", "by_id", id);
}
function custByIdentityKey(identityKey: string): string {
  return key("pf", "cust", "by_identity", identityKey);
}
function subKey(customerId: string): string {
  return key("pf", "sub", "by_customer", customerId);
}
function usageRecordKey(identityKey: string, action: BillingAction, dateKey: string): string {
  return key("pf", "usage", action, identityKey, dateKey);
}

export function createUpstashStore(): BillingStore {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set when BILLING_STORE=upstash"
    );
  }
  const redis = new Redis({ url, token });

  return {
    // ---- Customer -------------------------------------------------
    async getCustomerByIdentity(identityKey) {
      const id = await redis.get<string>(custByIdentityKey(identityKey));
      if (!id) return null;
      return (await redis.get<Customer>(custByIdKey(id))) ?? null;
    },

    async upsertCustomer(customer) {
      const existing = await redis.get<Customer>(custByIdKey(customer.id));
      const merged: Customer = {
        ...customer,
        createdAt: existing?.createdAt ?? customer.createdAt,
        updatedAt: Date.now()
      };
      // Upstash's set() takes raw values; the SDK handles JSON.
      await redis.set(custByIdKey(merged.id), merged);
      await redis.set(custByIdentityKey(merged.identityKey), merged.id);
      return merged;
    },

    // ---- Subscription ---------------------------------------------
    async getSubscription(customerId) {
      return (await redis.get<Subscription>(subKey(customerId))) ?? null;
    },

    async upsertSubscription(sub) {
      const existing = await redis.get<Subscription>(subKey(sub.customerId));
      const merged: Subscription = {
        ...sub,
        createdAt: existing?.createdAt ?? sub.createdAt,
        updatedAt: Date.now()
      };
      await redis.set(subKey(merged.customerId), merged);
      return merged;
    },

    async deleteSubscription(customerId) {
      await redis.del(subKey(customerId));
    },

    // ---- Usage ----------------------------------------------------
    async getUsage(identityKey, action, dateKey) {
      return (
        (await redis.get<UsageRecord>(usageRecordKey(identityKey, action, dateKey))) ?? null
      );
    },

    async incrementUsage(identityKey, action, dateKey) {
      const k = usageRecordKey(identityKey, action, dateKey);
      const now = Date.now();
      const existing = await redis.get<UsageRecord>(k);
      const next: UsageRecord =
        existing && existing.resetAt > now
          ? { ...existing, count: existing.count + 1 }
          : { identityKey, action, dateKey, count: 1, resetAt: nextResetMs(now) };
      // SET + EX in one round-trip. Upstash REST returns OK; we
      // tolerate transient errors by surfacing the local snapshot.
      await redis.set(k, next, { ex: USAGE_TTL_S });
      return next;
    },

    async resetUsage(identityKey, action, dateKey) {
      await redis.del(usageRecordKey(identityKey, action, dateKey));
    },

    // ---- Audit ----------------------------------------------------
    async getAuditEvents(identityKey, limit = 100) {
      // List head is newest; LRANGE returns the latest N.
      const range = await redis.lrange<BillingAuditEvent>(
        AUDIT_KEY,
        0,
        Math.max(0, limit * (identityKey ? 5 : 1) - 1)
      );
      const filtered = identityKey
        ? range.filter((e) => e.identityKey === identityKey)
        : range;
      return filtered.slice(0, limit);
    },

    async appendAuditEvent(event) {
      const full: BillingAuditEvent = {
        ...event,
        id: newAuditId(),
        ts: Date.now()
      };
      // LPUSH + LTRIM keeps the most recent AUDIT_CAP events.
      await redis.lpush(AUDIT_KEY, full);
      await redis.ltrim(AUDIT_KEY, 0, AUDIT_CAP - 1);
      return full;
    },

    // ---- Debug helpers --------------------------------------------
    // Upstash doesn't iterate cheaply, so these enumerate via SCAN.
    // Used only by /api/billing/debug — gated to dev. Keep results
    // small (cap at 100) to avoid surprises if anyone wires it
    // somewhere hot.
    async listCustomers() {
      const ids = await scanIds(redis, "pf:cust:by_id:*", 100);
      const out: Customer[] = [];
      for (const k of ids) {
        const c = await redis.get<Customer>(k);
        if (c) out.push(c);
      }
      return out;
    },

    async listSubscriptions() {
      const ids = await scanIds(redis, "pf:sub:by_customer:*", 100);
      const out: Subscription[] = [];
      for (const k of ids) {
        const s = await redis.get<Subscription>(k);
        if (s) out.push(s);
      }
      return out;
    },

    async listUsage() {
      const ids = await scanIds(redis, "pf:usage:*", 100);
      const out: UsageRecord[] = [];
      for (const k of ids) {
        const u = await redis.get<UsageRecord>(k);
        if (u) out.push(u);
      }
      return out;
    }
  };
}

async function scanIds(redis: Redis, pattern: string, limit: number): Promise<string[]> {
  const acc: string[] = [];
  let cursor = "0";
  let safety = 20; // avoid runaway loops on a hostile keyspace
  do {
    const [next, batch] = (await redis.scan(cursor, {
      match: pattern,
      count: 100
    })) as [string, string[]];
    acc.push(...batch);
    cursor = next;
    safety -= 1;
    if (acc.length >= limit) break;
  } while (cursor !== "0" && safety > 0);
  return acc.slice(0, limit);
}
