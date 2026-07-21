/**
 * MissionStore — durable storage for Mission Receipts.
 *
 * Mirrors the BillingStore pattern: typed interface + three impls
 * (memory, file, upstash). Selected via `MISSION_STORE` (defaults
 * follow `BILLING_STORE`'s rules: dev → file, prod → upstash if
 * configured else memory).
 *
 * Receipts are addressable by their unguessable id. The owner key is
 * `Identity.id` (auth or session). Public share fetches go through
 * `getShared(id)` which returns null for private receipts.
 */

import { randomBytes } from "crypto";
import type { MissionReceipt, MissionVisibility } from "./types";

export interface MissionStore {
  /** Insert a receipt. Caller-supplied id (so route + UI agree). */
  put(receipt: MissionReceipt): Promise<MissionReceipt>;
  /** Lookup by id. Returns null on miss. Visibility-agnostic. */
  get(id: string): Promise<MissionReceipt | null>;
  /** Lookup by id but ONLY if shared. */
  getShared(id: string): Promise<MissionReceipt | null>;
  /** Update visibility (and bump updatedAt). Owner check at the route. */
  updateVisibility(id: string, visibility: MissionVisibility): Promise<MissionReceipt | null>;
  /** Delete. Owner check at the route. */
  delete(id: string): Promise<void>;
  /** Newest-first, capped, owned by `ownerKey`. */
  listRecent(ownerKey: string, limit: number): Promise<MissionReceipt[]>;
}

export type MissionStoreKind = "memory" | "file" | "upstash";

let CACHED: MissionStore | null = null;
let CACHED_KIND: MissionStoreKind | null = null;

export function missionStoreKind(): MissionStoreKind {
  const explicit = (process.env.MISSION_STORE || "").toLowerCase();
  if (explicit === "memory") return "memory";
  if (explicit === "file") return "file";
  if (explicit === "upstash") return "upstash";
  // Default precedence mirrors the BillingStore.
  if (process.env.NODE_ENV === "production") {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      return "upstash";
    }
    return "memory";
  }
  return "file";
}

export async function getMissionStore(): Promise<MissionStore> {
  const kind = missionStoreKind();
  if (CACHED && CACHED_KIND === kind) return CACHED;
  if (kind === "upstash") {
    const mod = await import("./upstash-store");
    CACHED = mod.createUpstashMissionStore();
  } else if (kind === "file") {
    const mod = await import("./file-store");
    CACHED = mod.createFileMissionStore();
  } else {
    const mod = await import("./memory-store");
    CACHED = mod.createMemoryMissionStore();
  }
  CACHED_KIND = kind;
  return CACHED;
}

/**
 * Generate an unguessable mission id. 24 random bytes → 48 hex chars,
 * prefixed `m_`. This is the capability — anyone with the URL can view
 * a `shared` receipt.
 */
export function newMissionId(): string {
  return `m_${randomBytes(24).toString("hex")}`;
}

/** Validate an id we received from the URL or body. */
export function isMissionId(value: unknown): value is string {
  return typeof value === "string" && /^m_[a-f0-9]{24,64}$/.test(value);
}

export function __resetMissionStoreCache(): void {
  CACHED = null;
  CACHED_KIND = null;
}
