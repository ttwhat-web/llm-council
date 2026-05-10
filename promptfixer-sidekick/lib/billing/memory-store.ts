/**
 * In-memory `BillingStore` implementation.
 *
 * Used when:
 *   - BILLING_STORE=memory, OR
 *   - NODE_ENV=production AND no other BILLING_STORE was selected.
 *
 * This store loses everything on deploy and is single-instance only.
 * For real production deployments, swap to a KV / Postgres
 * implementation that conforms to the same `BillingStore` interface
 * (see BILLING.md §7 for swap targets).
 */

import type {
  BillingAuditEvent,
  BillingStore,
  Customer,
  Subscription,
  UsageRecord
} from "./store";
import { newAuditId, nextResetMs } from "./store";
import type { BillingAction } from "./types";

interface MemoryState {
  customers: Map<string, Customer>; // by id
  customerByIdentity: Map<string, string>; // identityKey → customerId
  subscriptions: Map<string, Subscription>; // by customerId
  usage: Map<string, UsageRecord>; // key: action:identityKey:dateKey
  audit: BillingAuditEvent[];
}

function usageKey(identityKey: string, action: BillingAction, dateKey: string): string {
  return `${action}:${identityKey}:${dateKey}`;
}

const AUDIT_CAP = 500;

export function createMemoryStore(): BillingStore {
  const state: MemoryState = {
    customers: new Map(),
    customerByIdentity: new Map(),
    subscriptions: new Map(),
    usage: new Map(),
    audit: []
  };

  return {
    async getCustomerByIdentity(identityKey) {
      const id = state.customerByIdentity.get(identityKey);
      return id ? state.customers.get(id) ?? null : null;
    },

    async upsertCustomer(customer) {
      const existing = state.customers.get(customer.id);
      const merged: Customer = {
        ...customer,
        createdAt: existing?.createdAt ?? customer.createdAt,
        updatedAt: Date.now()
      };
      state.customers.set(merged.id, merged);
      state.customerByIdentity.set(merged.identityKey, merged.id);
      return merged;
    },

    async getSubscription(customerId) {
      return state.subscriptions.get(customerId) ?? null;
    },

    async upsertSubscription(sub) {
      const existing = state.subscriptions.get(sub.customerId);
      const merged: Subscription = {
        ...sub,
        createdAt: existing?.createdAt ?? sub.createdAt,
        updatedAt: Date.now()
      };
      state.subscriptions.set(merged.customerId, merged);
      return merged;
    },

    async deleteSubscription(customerId) {
      state.subscriptions.delete(customerId);
    },

    async getUsage(identityKey, action, dateKey) {
      return state.usage.get(usageKey(identityKey, action, dateKey)) ?? null;
    },

    async incrementUsage(identityKey, action, dateKey) {
      const key = usageKey(identityKey, action, dateKey);
      const now = Date.now();
      const existing = state.usage.get(key);
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
      state.usage.set(key, next);
      return next;
    },

    async resetUsage(identityKey, action, dateKey) {
      state.usage.delete(usageKey(identityKey, action, dateKey));
    },

    async getAuditEvents(identityKey, limit = 100) {
      const filtered = identityKey
        ? state.audit.filter((e) => e.identityKey === identityKey)
        : state.audit;
      // Newest-first.
      return filtered.slice(-limit).reverse();
    },

    async appendAuditEvent(event) {
      const full: BillingAuditEvent = {
        ...event,
        id: newAuditId(),
        ts: Date.now()
      };
      state.audit.push(full);
      if (state.audit.length > AUDIT_CAP) {
        state.audit.splice(0, state.audit.length - AUDIT_CAP);
      }
      return full;
    },

    async listCustomers() {
      return Array.from(state.customers.values());
    },

    async listSubscriptions() {
      return Array.from(state.subscriptions.values());
    },

    async listUsage() {
      return Array.from(state.usage.values());
    }
  };
}
