/**
 * Server billing core — identity, plan resolution, quota, gating.
 *
 * Resolution order for a request:
 *   1. Authenticated user (when an auth provider lands; today we honour
 *      `x-user-email` only when ALLOW_DEV_USER_HEADER === "true").
 *   2. Signed dev override cookie issued by `/api/billing/checkout`
 *      (carries the `plan` chosen via Pro Preview / stub flow).
 *   3. Anonymous session cookie. Auto-issued the first time a request
 *      arrives without one.
 *
 * The store and rate limiter are intentionally in-memory. They reset
 * on deploy, which is fine for the stub. Replace with Upstash / Vercel
 * KV / Redis once payments are real — see BILLING.md.
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { POLICIES, consumeTokens } from "./rateLimit";
import { getPlan, isPlan, isPro as isProPlan } from "./plans";
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
const ALLOW_DEV_USER_HEADER =
  (process.env.ALLOW_DEV_USER_HEADER || "").toLowerCase() === "true";
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

/**
 * Resolve the calling identity. Returns the identity AND any cookie
 * mutations the route MUST attach to its outgoing response (auto-issued
 * session cookie, mainly).
 */
export interface ResolvedIdentity {
  identity: Identity;
  /** Side-effect cookies that need to ride out on the response. */
  attachToResponse: (res: NextResponse) => NextResponse;
}

export function resolveUserIdentity(req: NextRequest): ResolvedIdentity {
  const ip = ipFromHeaders(req.headers);

  // 1. Email header — dev only, opt-in via env.
  if (ALLOW_DEV_USER_HEADER) {
    const email = (req.headers.get("x-user-email") || "").trim().toLowerCase();
    if (email && /.+@.+\..+/.test(email)) {
      return {
        identity: { kind: "email", id: `email:${email}`, email, ip },
        attachToResponse: (r) => r
      };
    }
  }

  // 2. Session cookie — auto-issue if missing.
  const existing = req.cookies.get(SESSION_COOKIE)?.value;
  if (existing && /^[a-f0-9-]{8,}$/i.test(existing)) {
    return {
      identity: { kind: "session", id: `session:${existing}`, ip },
      attachToResponse: (r) => r
    };
  }

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
  /** ms since epoch. */
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
  /** Apply the dev override to a response. */
  apply: (res: NextResponse) => NextResponse;
  /** Clear the dev override on a response. */
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
  // Bind to identity so a stolen cookie can't be replayed across users.
  if (payload.identityId !== identity.id) return null;
  return payload.plan;
}

// ============================================================================
// Plan resolution
// ============================================================================

export interface PlanResolution {
  plan: Plan;
  source: BillingSource;
}

/**
 * Pick the active plan for an identity. Today: dev override > default.
 * When real auth + Stripe land, "auth" overtakes everything.
 */
export function resolvePlan(req: NextRequest, identity: Identity): PlanResolution {
  // TODO(billing-real): swap in subscription lookup from KV / DB once
  // the webhook pipeline persists `customer_id → plan` records.

  const override = readDevOverride(req, identity);
  if (override) return { plan: override, source: "dev-override" };

  return { plan: "free", source: "default" };
}

// ============================================================================
// Quota store
// ============================================================================

interface UsageEntry {
  count: number;
  /** ms epoch of next reset (UTC midnight). */
  resetAt: number;
}

const USAGE_STORE = new Map<string, UsageEntry>();

function bucketKey(identity: Identity, action: BillingAction): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${action}:${identity.id}:${day}`;
}

function nextResetMs(now = Date.now()): number {
  const d = new Date(now);
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

function snapshotFor(plan: Plan, action: BillingAction, entry?: UsageEntry): ServerUsageSnapshot {
  const features = getPlan(plan).features;
  const limit = action === "cloud-fix" ? features.cloudFixesPerDay : -1;
  const used = entry ? entry.count : 0;
  const resetAt = entry ? entry.resetAt : nextResetMs();
  if (limit < 0) {
    return {
      plan,
      used,
      limit: 0,
      remaining: Number.MAX_SAFE_INTEGER,
      resetAt: new Date(resetAt).toISOString()
    };
  }
  return {
    plan,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetAt: new Date(resetAt).toISOString()
  };
}

export function peekUsage(identity: Identity, action: BillingAction, plan: Plan): ServerUsageSnapshot {
  const entry = USAGE_STORE.get(bucketKey(identity, action));
  return snapshotFor(plan, action, entry);
}

/**
 * Increment the daily counter and return the new snapshot. Pro / Team /
 * Enterprise still increment — useful telemetry — but the snapshot
 * reports `limit: 0` (unlimited).
 */
export function incrementUsage(
  identity: Identity,
  action: BillingAction,
  plan: Plan
): ServerUsageSnapshot {
  const key = bucketKey(identity, action);
  const now = Date.now();
  let entry = USAGE_STORE.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: nextResetMs(now) };
  }
  entry.count += 1;
  USAGE_STORE.set(key, entry);
  return snapshotFor(plan, action, entry);
}

// ============================================================================
// Public snapshot
// ============================================================================

export function readBillingSnapshot(
  req: NextRequest,
  identity: Identity,
  action: BillingAction = "cloud-fix"
): ServerBillingSnapshot {
  const { plan, source } = resolvePlan(req, identity);
  const features: PlanFeatures = getPlan(plan).features;
  return {
    identity,
    plan,
    source,
    isPro: isProPlan(plan),
    features,
    usage: peekUsage(identity, action, plan),
    mode: billingMode()
  };
}

// ============================================================================
// Gating
// ============================================================================

export interface GateOpts {
  action?: BillingAction;
  /** When true, the gate consumes one quota unit on success. */
  consume?: boolean;
  /** Required feature key (denies non-billing-feature plans). */
  feature?: FeatureKey;
  /** Apply a token-bucket rate limit using the given policy. */
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
  /** When ok=false, this is the canonical NextResponse the route should return. */
  errorResponse?: NextResponse;
  /**
   * Routes MUST call this on the NextResponse they return so cookies
   * (session, dev-override) attach.
   */
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
  const { identity, attachToResponse } = resolveUserIdentity(req);
  const { plan, source } = resolvePlan(req, identity);
  const features = getPlan(plan).features;
  const isPro = isProPlan(plan);

  // Rate limit (always per identity).
  if (opts.rateLimit) {
    const policy = POLICIES[opts.rateLimit];
    const decision = consumeTokens(`${opts.rateLimit}:${identity.id}`, policy);
    if (!decision.allowed) {
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
    usage = peekUsage(identity, opts.action, plan);
    if (opts.consume) {
      // Limit < 0 → unlimited; limit === 0 → also unlimited (pro shape);
      // limit > 0 → hard cap.
      if (usage.limit > 0 && usage.used >= usage.limit) {
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
      usage = incrementUsage(identity, opts.action, plan);
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
// Errors
// ============================================================================

export interface BillingError {
  ok: false;
  code: string;
  message: string;
}

/**
 * Build a normalised error response. Avoid leaking internal stack
 * traces — the route layer should call this for non-fatal errors.
 */
export function billingErrorResponse(
  code: string,
  message: string,
  status = 400
): NextResponse {
  return NextResponse.json({ ok: false, code, message } satisfies BillingError, {
    status
  });
}

// ============================================================================
// Body-size guard
// ============================================================================

/**
 * Cheap pre-parse content-length check. Routes that take JSON should
 * call this before `req.json()` to refuse oversized payloads cleanly.
 */
export function requestExceedsSize(req: NextRequest, maxBytes: number): boolean {
  const raw = req.headers.get("content-length");
  if (!raw) return false; // unknown — let the JSON parser handle it
  const n = Number(raw);
  return Number.isFinite(n) && n > maxBytes;
}

// ============================================================================
// Test hook
// ============================================================================

export function __resetBillingStores(): void {
  USAGE_STORE.clear();
}
