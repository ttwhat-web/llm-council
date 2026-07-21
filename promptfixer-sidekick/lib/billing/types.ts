/**
 * Server-side billing types — the shape the API and gating helpers
 * speak. Phase-4 introduces the production-ready billing model; the
 * Phase-3 client-only `lib/billing.ts` remains as a UI fallback when
 * the server is unreachable.
 */

export type Plan = "free" | "pro" | "team" | "enterprise";

export type BillingMode = "stub" | "stripe" | "paddle";

/**
 * Where the active plan came from. Surfaced in `/api/billing/me`
 * responses so the UI can render a "Server verified" badge for real
 * subscriptions vs a "Local preview" badge for the dev override.
 */
export type BillingSource =
  /** Authenticated user with a paid subscription on the provider. */
  | "auth"
  /** Signed dev cookie issued by the stub `/api/billing/checkout`. */
  | "dev-override"
  /** Anonymous session with no override — the implicit Free plan. */
  | "default";

/**
 * Coarse per-action quota / feature axis. `cloud-fix` captures any
 * cloud-bound generation (fix, architect, prompt-fixer skill, fix-clean
 * workflow). Tools / clean / preview are out of scope — they don't burn
 * budget.
 */
export type BillingAction = "cloud-fix";

export type FeatureKey =
  | "cloudFixesPerDay"
  | "savedStacks"
  | "workflowRecorder"
  | "exports"
  | "memory"
  | "prioritySupport"
  | "teamWorkflows"
  | "auditLogs";

export interface PlanFeatures {
  /** -1 = unlimited. */
  cloudFixesPerDay: number;
  savedStacks: boolean;
  workflowRecorder: boolean;
  exports: boolean;
  memory: boolean;
  prioritySupport: boolean;
  teamWorkflows: boolean;
  auditLogs: boolean;
}

export interface PlanDef {
  id: Plan;
  name: string;
  price: string;
  blurb: string;
  features: PlanFeatures;
}

export type IdentityKind = "email" | "session" | "anon";

export interface Identity {
  kind: IdentityKind;
  /** Stable opaque key used for the billing store + rate limiter. */
  id: string;
  /** Optional human-readable email when the kind is "email". */
  email?: string;
  /** Best-effort IP for defence-in-depth rate limiting. */
  ip?: string;
}

/**
 * Mirrors `lib/types.ts → UsageSnapshot` so existing route helpers /
 * client headers keep working without a wider rename. `limit` is 0 for
 * unlimited plans — clients should render that as "—".
 */
export interface ServerUsageSnapshot {
  plan: Plan;
  used: number;
  limit: number;
  remaining: number;
  /** ISO-8601 of the next UTC reset. */
  resetAt: string;
}

export interface ServerBillingSnapshot {
  identity: Identity;
  plan: Plan;
  source: BillingSource;
  isPro: boolean;
  features: PlanFeatures;
  usage: ServerUsageSnapshot;
  mode: BillingMode;
}
