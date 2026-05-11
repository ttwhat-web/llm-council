/**
 * PaymentStore — durable storage for manual / crypto payment records.
 *
 * Stripe / Paddle / Lemon ride on their own provider state; we only
 * persist records that require operator-side bookkeeping:
 *
 *   - crypto_manual         (always)
 *   - local_bank_transfer   (always)
 *   - stub_dev_override     (for audit-trail completeness)
 *
 * Provider-redirect flows (`*_checkout`) optionally create a "submitted"
 * row that the corresponding webhook closes out — useful for tying
 * back-and-forth diagnostics together in the admin panel.
 */

import { randomBytes } from "crypto";
import type { PaymentRecord } from "./types";

export interface PaymentStore {
  put(record: PaymentRecord): Promise<PaymentRecord>;
  get(id: string): Promise<PaymentRecord | null>;
  /** Identity-bound list, newest first. */
  listByIdentity(identityKey: string, limit?: number): Promise<PaymentRecord[]>;
  /** Admin queue — pending + submitted across all identities. */
  listPending(limit?: number): Promise<PaymentRecord[]>;
  /** Stats for the admin panel + founder cap. */
  countByPlanAndStatus(plan: string, status: string): Promise<number>;
  /** Update a record (partial). */
  patch(id: string, mutator: (r: PaymentRecord) => PaymentRecord): Promise<PaymentRecord | null>;
  /** Delete. Used by admin reject-and-purge path (rare). */
  delete(id: string): Promise<void>;
}

export type PaymentStoreKind = "memory" | "file" | "upstash";

let CACHED: PaymentStore | null = null;
let CACHED_KIND: PaymentStoreKind | null = null;

export function paymentStoreKind(): PaymentStoreKind {
  const explicit = (process.env.PAYMENT_STORE || "").toLowerCase();
  if (explicit === "memory") return "memory";
  if (explicit === "file") return "file";
  if (explicit === "upstash") return "upstash";
  if (process.env.NODE_ENV === "production") {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      return "upstash";
    }
    return "memory";
  }
  return "file";
}

export async function getPaymentStore(): Promise<PaymentStore> {
  const kind = paymentStoreKind();
  if (CACHED && CACHED_KIND === kind) return CACHED;
  if (kind === "upstash") {
    const mod = await import("./upstash-store");
    CACHED = mod.createUpstashPaymentStore();
  } else if (kind === "file") {
    const mod = await import("./file-store");
    CACHED = mod.createFilePaymentStore();
  } else {
    const mod = await import("./memory-store");
    CACHED = mod.createMemoryPaymentStore();
  }
  CACHED_KIND = kind;
  return CACHED;
}

export function newPaymentId(): string {
  return `pay_${randomBytes(24).toString("hex")}`;
}

export function newPaymentReference(): string {
  // Short, uppercase, alphanumeric (no 0/O/1/I to reduce typo confusion).
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = randomBytes(8);
  let out = "OC-";
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[buf[i]! % ALPHABET.length];
  }
  return out;
}

export function isPaymentId(value: unknown): value is string {
  return typeof value === "string" && /^pay_[a-f0-9]{24,64}$/.test(value);
}

export function __resetPaymentStoreCache(): void {
  CACHED = null;
  CACHED_KIND = null;
}
