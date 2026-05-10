/**
 * Upstash Redis `MissionStore` — production storage for Mission Receipts.
 *
 * Key layout:
 *   pf:mission:by_id:<id>          JSON  receipt
 *   pf:mission:by_owner:<ownerKey> LIST  newest-first ids (LPUSH/LTRIM)
 *
 * Selected when `MISSION_STORE=upstash` OR `NODE_ENV=production` AND
 * Upstash creds are set. Fails loud at construction if creds are missing.
 */

import { Redis } from "@upstash/redis";
import type { MissionStore } from "./store";
import type { MissionReceipt, MissionVisibility } from "./types";

const PER_OWNER_CAP = 200;

function byIdKey(id: string): string {
  return `pf:mission:by_id:${id}`;
}
function byOwnerKey(ownerKey: string): string {
  return `pf:mission:by_owner:${ownerKey}`;
}

export function createUpstashMissionStore(): MissionStore {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN must be set when MISSION_STORE=upstash"
    );
  }
  const redis = new Redis({ url, token });

  return {
    async put(receipt) {
      await redis.set(byIdKey(receipt.id), receipt);
      // Owner list: push newest, dedupe + trim.
      await redis.lpush(byOwnerKey(receipt.ownerKey), receipt.id);
      await redis.ltrim(byOwnerKey(receipt.ownerKey), 0, PER_OWNER_CAP - 1);
      return receipt;
    },
    async get(id) {
      return (await redis.get<MissionReceipt>(byIdKey(id))) ?? null;
    },
    async getShared(id) {
      const r = await redis.get<MissionReceipt>(byIdKey(id));
      return r && r.visibility === "shared" ? r : null;
    },
    async updateVisibility(id, visibility: MissionVisibility) {
      const r = await redis.get<MissionReceipt>(byIdKey(id));
      if (!r) return null;
      const updated: MissionReceipt = { ...r, visibility, updatedAt: Date.now() };
      await redis.set(byIdKey(id), updated);
      return updated;
    },
    async delete(id) {
      const r = await redis.get<MissionReceipt>(byIdKey(id));
      await redis.del(byIdKey(id));
      if (r) {
        // Upstash doesn't support LREM count=1 cleanly across all SDK
        // versions; pull the list, filter, re-write. Capped at 200 so
        // this is bounded.
        const ids = await redis.lrange<string>(byOwnerKey(r.ownerKey), 0, PER_OWNER_CAP - 1);
        const filtered = ids.filter((x) => x !== id);
        await redis.del(byOwnerKey(r.ownerKey));
        if (filtered.length > 0) {
          await redis.rpush(byOwnerKey(r.ownerKey), ...filtered);
        }
      }
    },
    async listRecent(ownerKey, limit) {
      const ids = await redis.lrange<string>(
        byOwnerKey(ownerKey),
        0,
        Math.max(0, limit - 1)
      );
      const out: MissionReceipt[] = [];
      for (const id of ids) {
        const r = await redis.get<MissionReceipt>(byIdKey(id));
        if (r) out.push(r);
      }
      return out;
    }
  };
}
