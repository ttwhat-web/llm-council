/**
 * Server billing core — identity, plan resolution, quota, gating.
 *
 * Phase-5 makes the previously-in-memory state durable behind a
 * `BillingStore` and adds the future auth seam. Route handlers don't
 * need to know which storage is wired — `runBillingGate(req, opts)` is
 * the only entry point.
 *
 * Resolution order for a request:
 *   1. Authenticated user (real provider, when wired) via lib/auth/identity.
 *   2. Stored Customer + Subscription record (Stripe / Paddle when wired,
 *      or `/api/billing/debug` grants in dev).
 *   3. Signed dev override cookie issued by `/api/billing/checkout`.
 *   4. Anonymous session cookie. Auto-issued the first time a request
 *      arrives without one.
 *
 * The rate limiter and quota counter both ride on the BillingStore so
 * the swap to KV / Postgres is mechanical (see BILLING.md §7).
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedUser } from "../auth/identity";
import { POLICIES, consumeTokens } from "./rateLimit";
import { getPlan, isPlan, isPro as isProPlan } from "./plans";
import {
  getBillingStore,
  newCustomerId,
  todayDateKey,
  type BillingStore,
  type Customer,
  type Subscription
} from "./store";
import type {
  BillingAction,
  BillingMode,
  BillingSource,
  FeatureKey,
  Identity,
  Plan,
  PlanFeatures,
  ServerBillingSnapshot,
  ServerUsageSnapshot
} from "./types";

// ============================================================================
// Env
// ============================================================================

const PROVIDER = (process.env.BILLING_PROVIDER || "stub").toLowerCase() as BillingMode;
const DEV_OVERRIDE_SECRET = process.env.BILLING_DEV_OVERRIDE_SECRET || "";
const DEV_OVERRIDE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const SESSION_COOKIE = "pf_session";
const DEV_OVERRIDE_COOKIE = "pf_billing_dev";
const SESSION_TTL_S = 60 * 60 * 24 * 365; // 1 year

export function billingMode(): BillingMode {
  if (PROVIDER === "stripe" || PROVIDER === "paddle") return PROVIDER;
  return "stub";
}

export function devOverrideEnabled(): boolean {
  return billingMode() === "stub" && DEV_OVERRIDE_SECRET.length > 0;
}

// ============================================================================
// Identity
// ============================================================================

export interface ResolvedIdentity {
  identity: Identity;
  /** Side-effect cookies that need to ride out on the response. */
  attachToResponse: (res: NextResponse) => NextResponse;
}

export async function resolveUserIdentity(req: NextRequest): Promise<ResolvedIdentity> {
  const ip = ipFromHeaders(req.headers);

  // 1. Authenticated user via the auth seam.
  const auth = await resolveAuthenticatedUser(req);
  if (auth) {
    return {
      identity: { kind: "email", id: auth.id, email: auth.email, ip },
      attachToResponse: (r) => r
    };
  }

  // 2. Existing session cookie.
  const existing = req.cookies.get(SESSION_COOKIE)?.value;
  if (existing && /^[a-f0-9-]{8,}$/i.test(existing)) {
    return {
      identity: { kind: "session", id: `session:${existing}`, ip },
      attachToResponse: (r) => r
    };
  }

  // 3. Auto-issue a fresh session cookie.
  const fresh = randomBytes(16).toString("hex");
  const identity: Identity = { kind: "session", id: `session:${fresh}`, ip };
  return {
    identity,
    attachToResponse: (res) => {
      res.cookies.set({
        name: SESSION_COOKIE,
        value: fresh,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_TTL_S
      });
      return res;
    }
  };
}

function ipFromHeaders(headers: Headers): string | undefined {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return undefined;
}

// ============================================================================
// Dev override cookie (signed)
// ============================================================================

interface DevOverridePayload {
  identityId: string;
  plan: Plan;
  exp: number;
}

function sign(payload: DevOverridePayload): string {
  if (!DEV_OVERRIDE_SECRET) throw new Error("dev_override_disabled");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", DEV_OVERRIDE_SECRET).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify(token: string): DevOverridePayload | null {
  if (!DEV_OVERRIDE_SECRET) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, mac] = parts as [string, string];
  const expected = createHmac("sha256", DEV_OVERRIDE_SECRET).update(body).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(mac, "base64url");
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Partial<DevOverridePayload>;
  if (typeof p.identityId !== "string" || !isPlan(p.plan)) return null;
  if (typeof p.exp !== "number" || p.exp < Date.now()) return null;
  return p as DevOverridePayload;
}

export interface DevOverrideMutation {
  apply: (res: NextResponse) => NextResponse;
  clear: (res: NextResponse) => NextResponse;
}

export function devOverrideMutationFor(
  identity: Identity,
  plan: Plan
): DevOverrideMutation {
  if (!devOverrideEnabled()) {
    return { apply: (r) => r, clear: (r) => r };
  }
  const exp = Date.now() + DEV_OVERRIDE_TTL_MS;
  const token = sign({ identityId: identity.id, plan, exp });
  return {
    apply: (res) => {
      res.cookies.set({
        name: DEV_OVERRIDE_COOKIE,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: Math.floor(DEV_OVERRIDE_TTL_MS / 1000)
      });
      return res;
    },
    clear: (res) => {
      res.cookies.set({
        name: DEV_OVERRIDE_COOKIE,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0
      });
      return res;
    }
  };
}

function readDevOverride(req: NextRequest, identity: Identity): Plan | null {
  if (!devOverrideEnabled()) return null;
  const raw = req.cookies.get(DEV_OVERRIDE_COOKIE)?.value;
  if (!raw) return null;
  const payload = verify(raw);
  if (!payload) return null;
  if (payload.identityId !== identity.id) return null;
  return payload.plan;
}

// ============================================================================
// Plan resolution
// ============================================================================

export interface PlanResolution {
  plan: Plan;
  source: BillingSource;
  customer?: Customer | null;
  subscription?: Subscription | null;
}

/**
 * Pick the active plan for an identity. Order:
 *   1. Stored subscription (active, not expired).
 *   2. Dev override cookie.
 *   3. Free.
 *
 * Authenticated identities are recorded as a Customer the first time
 * we see them so subsequent grants and Stripe events have a stable
 * upsert target. Anonymous identities don't get a Customer row yet —
 * they get one on first paid event (debug grant or webhook).
 */
export async function resolvePlan(
  req: NextRequest,
  identity: Identity
): Promise<PlanResolution> {
  const store = await getBillingStore();

  if (identity.kind === "email") {
    await ensureCustomer(store, identity);
  }

  const customer = await store.getCustomerByIdentity(identity.id);
  if (customer) {
    const sub = await store.getSubscription(customer.id);
    if (isActiveSubscription(sub)) {
      return {
        plan: sub.plan,
        source: subscriptionSource(sub.source),
        customer,
        subscription: sub
      };
    }
  }

  const override = readDevOverride(req, identity);
  if (override) {
    return { plan: override, source: "dev-override", customer: customer ?? null };
  }

  return { plan: "free", source: "default", customer: customer ?? null };
}

async function ensureCustomer(store: BillingStore, identity: Identity): Promise<Customer> {
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

function isActiveSubscription(sub: Subscription | null): sub is Subscription {
  if (!sub) return false;
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  if (typeof sub.currentPeriodEnd === "number" && sub.currentPeriodEnd <= Date.now()) {
    return false;
  }
  return true;
}

function subscriptionSource(s: Subscription["source"]): BillingSource {
  // Real-payment subscriptions surface as "auth"; debug grants surface
  // as "dev-override" so the UI's verification badge stays honest.
  switch (s) {
    case "stripe":
    case "paddle":
    case "auth":
      return "auth";
    case "dev-stub":
    case "debug-grant":
    default:
      return "dev-override";
  }
}

// ============================================================================
// Quota helpers
// ============================================================================

function snapshotFor(
  plan: Plan,
  action: BillingAction,
  record: { count: number; resetAt: number } | null
): ServerUsageSnapshot {
  const features = getPlan(plan).features;
  const limit = action === "cloud-fix" ? features.cloudFixesPerDay : -1;
  const used = record ? record.count : 0;
  const resetAtMs =
    record?.resetAt ??
    (() => {
      const d = new Date();
      d.setUTCHours(24, 0, 0, 0);
      return d.getTime();
    })();
  if (limit < 0) {
    return {
      plan,
      used,
      limit: 0,
      remaining: Number.MAX_SAFE_INTEGER,
      resetAt: new Date(resetAtMs).toISOString()
    };
  }
  return {
    plan,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetAt: new Date(resetAtMs).toISOString()
  };
}

export async function peekUsage(
  identity: Identity,
  action: BillingAction,
  plan: Plan
): Promise<ServerUsageSnapshot> {
  const store = await getBillingStore();
  const record = await store.getUsage(identity.id, action, todayDateKey());
  return snapshotFor(plan, action, record);
}

export async function incrementUsage(
  identity: Identity,
  action: BillingAction,
  plan: Plan
): Promise<ServerUsageSnapshot> {
  const store = await getBillingStore();
  const record = await store.incrementUsage(identity.id, action, todayDateKey());
  return snapshotFor(plan, action, record);
}

export async function readBillingSnapshot(
  req: NextRequest,
  identity: Identity,
  action: BillingAction = "cloud-fix"
): Promise<ServerBillingSnapshot> {
  const { plan, source } = await resolvePlan(req, identity);
  const features: PlanFeatures = getPlan(plan).features;
  return {
    identity,
    plan,
    source,
    isPro: isProPlan(plan),
    features,
    usage: await peekUsage(identity, action, plan),
    mode: billingMode()
  };
}

// ============================================================================
// Gating
// ============================================================================

export interface GateOpts {
  action?: BillingAction;
  consume?: boolean;
  feature?: FeatureKey;
  rateLimit?: keyof typeof POLICIES;
}

export interface GateResult {
  ok: boolean;
  identity: Identity;
  plan: Plan;
  features: PlanFeatures;
  source: BillingSource;
  isPro: boolean;
  usage?: ServerUsageSnapshot;
  errorResponse?: NextResponse;
  attach: (res: NextResponse) => NextResponse;
}

const ERROR_HEADERS = (snapshot: ServerUsageSnapshot): Headers => {
  const h = new Headers();
  h.set("X-Plan", snapshot.plan);
  if (snapshot.limit > 0) {
    h.set("X-RateLimit-Limit", String(snapshot.limit));
    h.set("X-RateLimit-Remaining", String(snapshot.remaining));
    h.set("X-RateLimit-Reset", snapshot.resetAt);
  }
  return h;
};

export async function runBillingGate(
  req: NextRequest,
  opts: GateOpts = {}
): Promise<GateResult> {
  const { identity, attachToResponse } = await resolveUserIdentity(req);
  const { plan, source } = await resolvePlan(req, identity);
  const features = getPlan(plan).features;
  const isPro = isProPlan(plan);
  const store = await getBillingStore();

  // Rate limit (per identity).
  if (opts.rateLimit) {
    const policy = POLICIES[opts.rateLimit];
    const decision = consumeTokens(`${opts.rateLimit}:${identity.id}`, policy);
    if (!decision.allowed) {
      void store.appendAuditEvent({
        kind: "rate-limited",
        identityKey: identity.id,
        detail: `policy=${opts.rateLimit}`
      });
      const res = NextResponse.json(
        {
          ok: false,
          code: "rate_limited",
          message: "Too many requests. Slow down and try again shortly.",
          retryAfter: decision.retryAfter ?? 1
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(decision.retryAfter ?? 1)) }
        }
      );
      return {
        ok: false,
        identity,
        plan,
        features,
        source,
        isPro,
        errorResponse: attachToResponse(res),
        attach: attachToResponse
      };
    }
  }

  // Feature gate.
  if (opts.feature) {
    const featureValue = features[opts.feature];
    const allowed =
      typeof featureValue === "number" ? featureValue !== 0 : Boolean(featureValue);
    if (!allowed) {
      const res = NextResponse.json(
        {
          ok: false,
          code: "feature_locked",
          feature: opts.feature,
          message: `Your plan (${plan}) does not include this feature.`
        },
        { status: 402 }
      );
      return {
        ok: false,
        identity,
        plan,
        features,
        source,
        isPro,
        errorResponse: attachToResponse(res),
        attach: attachToResponse
      };
    }
  }

  // Quota gate (only enforced when the caller is about to consume).
  let usage: ServerUsageSnapshot | undefined;
  if (opts.action) {
    usage = await peekUsage(identity, opts.action, plan);
    if (opts.consume) {
      if (usage.limit > 0 && usage.used >= usage.limit) {
        void store.appendAuditEvent({
          kind: "usage-exceeded",
          identityKey: identity.id,
          plan,
          detail: `${usage.used}/${usage.limit} ${opts.action}`
        });
        const res = NextResponse.json(
          {
            ok: false,
            code: "quota_exceeded",
            message: `Daily ${plan} limit reached (${usage.limit}/day). Resets at ${usage.resetAt}.`,
            usage
          },
          { status: 429, headers: ERROR_HEADERS(usage) }
        );
        return {
          ok: false,
          identity,
          plan,
          features,
          source,
          isPro,
          usage,
          errorResponse: attachToResponse(res),
          attach: attachToResponse
        };
      }
      usage = await incrementUsage(identity, opts.action, plan);
    }
  }

  return {
    ok: true,
    identity,
    plan,
    features,
    source,
    isPro,
    usage,
    attach: attachToResponse
  };
}

// ============================================================================
// Errors + body-size guard
// ============================================================================

export interface BillingError {
  ok: false;
  code: string;
  message: string;
}

export function billingErrorResponse(
  code: string,
  message: string,
  status = 400
): NextResponse {
  return NextResponse.json({ ok: false, code, message } satisfies BillingError, {
    status
  });
}

export function requestExceedsSize(req: NextRequest, maxBytes: number): boolean {
  const raw = req.headers.get("content-length");
  if (!raw) return false;
  const n = Number(raw);
  return Number.isFinite(n) && n > maxBytes;
}

// ============================================================================
// Test hooks
// ============================================================================

export function __billingEnvSnapshot() {
  return {
    provider: PROVIDER,
    devOverrideEnabled: devOverrideEnabled()
  };
}
