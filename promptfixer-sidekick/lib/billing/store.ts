/**
 * Durable billing store — interface contract.
 *
 * Phase-5 lifts the in-memory `Map`s from `server.ts` and `rateLimit.ts`
 * up behind a `BillingStore` interface. Today we ship two
 * implementations:
 *
 *   - memory-store.ts  ← single-instance, resets on deploy. Production
 *                        fallback ONLY (never durable).
 *   - file-store.ts    ← JSON-file backed; dev-friendly; atomic writes.
 *
 * The KV / Postgres swap (see BILLING.md §7) drops in here without
 * touching any route or gating helper.
 *
 * All methods return Promises so a future async backend (Upstash,
 * Vercel KV, Postgres) is a drop-in.
 */

import { randomBytes } from "crypto";
import type { BillingAction, Plan } from "./types";

// ---------- entities -------------------------------------------------------

export interface Customer {
  /** Stable opaque key for the customer record. Format: "pf_cust_<uuid>". */
  id: string;
  /** Identity.id this customer is bound to. */
  identityKey: string;
  email?: string;
  /** External provider customer id (e.g. Stripe `cus_...`). */
  externalId?: string;
  createdAt: number;
  updatedAt: number;
}

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export type SubscriptionSource =
  | "auth"
  | "dev-stub"
  | "debug-grant"
  | "stripe"
  | "paddle";

export interface Subscription {
  /** Stable opaque key. Format: "pf_sub_<uuid>". */
  id: string;
  customerId: string;
  /** Active billed plan. Free isn't stored — it's the implicit fallback. */
  plan: Exclude<Plan, "free">;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  /** External provider subscription id (e.g. Stripe `sub_...`). */
  externalId?: string;
  /** ms epoch — when the current paid window expires. */
  currentPeriodEnd?: number;
  createdAt: number;
  updatedAt: number;
}

export interface UsageRecord {
  identityKey: string;
  action: BillingAction;
  /** YYYY-MM-DD UTC. */
  dateKey: string;
  count: number;
  /** ms epoch. */
  resetAt: number;
}

export type AuditKind =
  | "checkout-stub"
  | "checkout-success"
  | "grant"
  | "revoke"
  | "subscription-upserted"
  | "usage-exceeded"
  | "rate-limited";

export interface BillingAuditEvent {
  id: string;
  kind: AuditKind;
  ts: number;
  identityKey?: string;
  customerId?: string;
  subscriptionId?: string;
  plan?: Plan;
  /** Short human-readable note. */
  detail?: string;
  /** Free-form extras. Avoid PII. */
  meta?: Record<string, unknown>;
}

// ---------- interface ------------------------------------------------------

export interface BillingStore {
  // Customer
  getCustomerByIdentity(identityKey: string): Promise<Customer | null>;
  upsertCustomer(customer: Customer): Promise<Customer>;

  // Subscription
  getSubscription(customerId: string): Promise<Subscription | null>;
  upsertSubscription(subscription: Subscription): Promise<Subscription>;
  deleteSubscription(customerId: string): Promise<void>;

  // Usage (daily, per identity, per action)
  getUsage(
    identityKey: string,
    action: BillingAction,
    dateKey: string
  ): Promise<UsageRecord | null>;
  incrementUsage(
    identityKey: string,
    action: BillingAction,
    dateKey: string
  ): Promise<UsageRecord>;
  resetUsage(
    identityKey: string,
    action: BillingAction,
    dateKey: string
  ): Promise<void>;

  // Audit
  getAuditEvents(identityKey?: string, limit?: number): Promise<BillingAuditEvent[]>;
  appendAuditEvent(
    event: Omit<BillingAuditEvent, "id" | "ts">
  ): Promise<BillingAuditEvent>;

  // Debug-only (optional). Implementations that don't iterate cheaply
  // (real KVs) can leave these undefined; the debug route degrades.
  listCustomers?(): Promise<Customer[]>;
  listSubscriptions?(): Promise<Subscription[]>;
  listUsage?(): Promise<UsageRecord[]>;
}

// ---------- factory --------------------------------------------------------

export type BillingStoreKind = "memory" | "file";

let CACHED_STORE: BillingStore | null = null;
let CACHED_KIND: BillingStoreKind | null = null;

export function billingStoreKind(): BillingStoreKind {
  const explicit = (process.env.BILLING_STORE || "").toLowerCase();
  if (explicit === "memory") return "memory";
  if (explicit === "file") return "file";
  // Default: file in dev, memory in prod (unsafe, but keeps the
  // function pure — we won't accidentally write to a read-only fs).
  return process.env.NODE_ENV === "production" ? "memory" : "file";
}

/**
 * Resolve the active billing store. Lazy + cached so the file store
 * doesn't re-read its journal on every request. The cache key includes
 * the kind so a hot-swap via env vars in tests still behaves.
 */
export async function getBillingStore(): Promise<BillingStore> {
  const kind = billingStoreKind();
  if (CACHED_STORE && CACHED_KIND === kind) return CACHED_STORE;

  if (kind === "file") {
    const mod = await import("./file-store");
    CACHED_STORE = mod.createFileStore();
  } else {
    const mod = await import("./memory-store");
    CACHED_STORE = mod.createMemoryStore();
  }
  CACHED_KIND = kind;
  return CACHED_STORE;
}

/** Test hook — drop the cache so a new env can be picked up. */
export function __resetBillingStoreCache(): void {
  CACHED_STORE = null;
  CACHED_KIND = null;
}

// ---------- helpers --------------------------------------------------------

export function newCustomerId(): string {
  return `pf_cust_${cryptoRandomId()}`;
}

export function newSubscriptionId(): string {
  return `pf_sub_${cryptoRandomId()}`;
}

export function newAuditId(): string {
  return `pf_evt_${cryptoRandomId()}`;
}

function cryptoRandomId(): string {
  // BillingStore is server-only by design — Next dead-code-eliminates
  // node:crypto from any accidental client import.
  return randomBytes(8).toString("hex");
}

export function todayDateKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function nextResetMs(now = Date.now()): number {
  const d = new Date(now);
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}
