/**
 * Lightweight in-process daily usage limiter.
 *
 * Counts only billable calls (cloud provider). Ollama and deterministic
 * runs are free. Keyed by client identifier (IP, or session id later) and
 * UTC day. Replace with Redis / KV when the app gets multi-instance.
 */

import type { Tier, UsageSnapshot } from "./types";

export const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT || 10);
export const PRO_DAILY_LIMIT = Number(process.env.PRO_DAILY_LIMIT || 1000);

interface Entry {
  count: number;
  resetAt: number; // epoch ms
}

// Single shared map per server process. Resets on deploy — fine for v1.
const STORE = new Map<string, Entry>();

const DAY_MS = 24 * 60 * 60 * 1000;

function nextResetMs(now = Date.now()): number {
  const d = new Date(now);
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

export function limitFor(tier: Tier): number {
  return tier === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
}

export function peek(clientKey: string, tier: Tier): UsageSnapshot {
  const limit = limitFor(tier);
  const entry = STORE.get(bucket(clientKey, tier));
  const used = entry ? entry.count : 0;
  const resetAt = entry ? entry.resetAt : nextResetMs();
  return {
    tier,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetAt: new Date(resetAt).toISOString()
  };
}

export interface ConsumeResult {
  allowed: boolean;
  snapshot: UsageSnapshot;
}

export function consume(clientKey: string, tier: Tier): ConsumeResult {
  const limit = limitFor(tier);
  const key = bucket(clientKey, tier);
  const now = Date.now();
  let entry = STORE.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: nextResetMs(now) };
  }

  if (entry.count >= limit) {
    STORE.set(key, entry);
    return {
      allowed: false,
      snapshot: {
        tier,
        used: entry.count,
        limit,
        remaining: 0,
        resetAt: new Date(entry.resetAt).toISOString()
      }
    };
  }

  entry.count += 1;
  STORE.set(key, entry);
  return {
    allowed: true,
    snapshot: {
      tier,
      used: entry.count,
      limit,
      remaining: Math.max(0, limit - entry.count),
      resetAt: new Date(entry.resetAt).toISOString()
    }
  };
}

function bucket(clientKey: string, tier: Tier): string {
  // Daily bucket (UTC). Including the day in the key gives free cleanup
  // when the day rolls over and a new key is used.
  const day = new Date().toISOString().slice(0, 10);
  return `${tier}:${clientKey}:${day}`;
}

/** Best-effort client identifier from a request. */
export function clientKeyFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "anon";
}

/** Periodically drop expired entries so the map doesn't grow unbounded. */
export function gc(now = Date.now()): void {
  for (const [key, entry] of STORE.entries()) {
    if (entry.resetAt <= now - DAY_MS) STORE.delete(key);
  }
}
