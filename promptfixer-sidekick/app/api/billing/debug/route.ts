/**
 * Billing debug endpoint — DEV ONLY.
 *
 *   GET  /api/billing/debug         dump everything in the active store
 *                                   plus the caller's current snapshot
 *   POST /api/billing/debug         { action, plan? }  — grant_pro |
 *                                                       grant_team |
 *                                                       revoke |
 *                                                       reset_usage
 *
 * Both methods 404 in production. There is no auth gate beyond NODE_ENV
 * — the route is only meant for local development.
 *
 * Use this to test paid plans BEFORE Stripe is wired:
 *
 *   curl -i -c jar -X POST http://localhost:3030/api/billing/debug \
 *     -H 'content-type: application/json' \
 *     -d '{"action":"grant_pro"}'
 *
 *   curl -b jar http://localhost:3030/api/billing/me   # plan === "pro"
 */

import { NextRequest, NextResponse } from "next/server";
import { isPlan } from "@/lib/billing/plans";
import {
  billingErrorResponse,
  readBillingSnapshot,
  resolveUserIdentity
} from "@/lib/billing/server";
import {
  getBillingStore,
  newCustomerId,
  newSubscriptionId,
  todayDateKey,
  type Customer,
  type Subscription
} from "@/lib/billing/store";
import type { Plan } from "@/lib/billing/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });

function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

// ---------- GET ------------------------------------------------------------

export async function GET(req: NextRequest) {
  if (!isDev()) return NOT_FOUND;

  const store = await getBillingStore();
  const { identity, attachToResponse } = await resolveUserIdentity(req);
  const snapshot = await readBillingSnapshot(req, identity);

  const [customers, subscriptions, usage, audit] = await Promise.all([
    store.listCustomers ? store.listCustomers() : Promise.resolve([]),
    store.listSubscriptions ? store.listSubscriptions() : Promise.resolve([]),
    store.listUsage ? store.listUsage() : Promise.resolve([]),
    store.getAuditEvents(undefined, 50)
  ]);

  return attachToResponse(
    NextResponse.json({
      ok: true,
      dev: true,
      identity: {
        kind: identity.kind,
        email: identity.email,
        fingerprint: identity.id.slice(0, 24)
      },
      snapshot: {
        plan: snapshot.plan,
        source: snapshot.source,
        isPro: snapshot.isPro,
        quota: snapshot.usage,
        mode: snapshot.mode
      },
      customers,
      subscriptions,
      usage,
      audit
    })
  );
}

// ---------- POST -----------------------------------------------------------

interface DebugBody {
  action?: "grant_pro" | "grant_team" | "revoke" | "reset_usage";
  /** Optional override for grant — defaults to "pro" / "team" per action. */
  plan?: string;
}

export async function POST(req: NextRequest) {
  if (!isDev()) return NOT_FOUND;

  let body: DebugBody;
  try {
    body = (await req.json()) as DebugBody;
  } catch {
    return billingErrorResponse("invalid_json", "Invalid JSON body.");
  }

  const store = await getBillingStore();
  const { identity, attachToResponse } = await resolveUserIdentity(req);

  switch (body.action) {
    case "grant_pro":
    case "grant_team": {
      const desired: Exclude<Plan, "free"> = body.action === "grant_team" ? "team" : "pro";
      const planOverride: Exclude<Plan, "free"> =
        isPlan(body.plan) && body.plan !== "free" ? body.plan : desired;
      const customer = await ensureCustomer(store, identity);
      const sub = await store.upsertSubscription(buildSubscription(customer, planOverride));
      void store.appendAuditEvent({
        kind: "grant",
        identityKey: identity.id,
        customerId: customer.id,
        subscriptionId: sub.id,
        plan: sub.plan,
        detail: `debug grant → ${sub.plan}`
      });
      return attachToResponse(
        NextResponse.json({
          ok: true,
          action: body.action,
          plan: sub.plan,
          customerId: customer.id,
          subscriptionId: sub.id
        })
      );
    }

    case "revoke": {
      const customer = await store.getCustomerByIdentity(identity.id);
      if (customer) {
        await store.deleteSubscription(customer.id);
        void store.appendAuditEvent({
          kind: "revoke",
          identityKey: identity.id,
          customerId: customer.id,
          plan: "free",
          detail: "debug revoke"
        });
      }
      return attachToResponse(NextResponse.json({ ok: true, action: "revoke" }));
    }

    case "reset_usage": {
      await store.resetUsage(identity.id, "cloud-fix", todayDateKey());
      void store.appendAuditEvent({
        kind: "grant",
        identityKey: identity.id,
        detail: "debug reset_usage"
      });
      return attachToResponse(NextResponse.json({ ok: true, action: "reset_usage" }));
    }

    default:
      return attachToResponse(
        billingErrorResponse(
          "unknown_action",
          "action must be one of: grant_pro, grant_team, revoke, reset_usage"
        )
      );
  }
}

// ---------- helpers --------------------------------------------------------

async function ensureCustomer(
  store: Awaited<ReturnType<typeof getBillingStore>>,
  identity: { id: string; email?: string }
): Promise<Customer> {
  const existing = await store.getCustomerByIdentity(identity.id);
  if (existing) return existing;
  const now = Date.now();
  return store.upsertCustomer({
    id: newCustomerId(),
    identityKey: identity.id,
    email: identity.email,
    createdAt: now,
    updatedAt: now
  });
}

function buildSubscription(
  customer: Customer,
  plan: Exclude<Plan, "free">
): Subscription {
  const now = Date.now();
  return {
    id: newSubscriptionId(),
    customerId: customer.id,
    plan,
    status: "active",
    source: "debug-grant",
    createdAt: now,
    updatedAt: now,
    // Keep the grant alive for 7 days so dev sessions don't silently
    // expire mid-test. Bump as needed.
    currentPeriodEnd: now + 7 * 24 * 60 * 60 * 1000
  };
}
