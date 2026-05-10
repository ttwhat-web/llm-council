/**
 * Plan catalogue — single source of truth for tier-level features and
 * quota. Server-side gating reads from here; UI presentation reads
 * from here. Prices are display-only; the real catalogue lives at
 * Stripe / Paddle once payments are wired.
 */

import type { Plan, PlanDef, PlanFeatures } from "./types";

const FREE_FEATURES: PlanFeatures = {
  cloudFixesPerDay: Number(process.env.BILLING_FREE_DAILY_LIMIT || 10),
  savedStacks: true, // local-only feature today; gated to free for soft caps later
  workflowRecorder: true,
  exports: true,
  memory: false,
  prioritySupport: false,
  teamWorkflows: false,
  auditLogs: false
};

const PRO_FEATURES: PlanFeatures = {
  cloudFixesPerDay: -1,
  savedStacks: true,
  workflowRecorder: true,
  exports: true,
  memory: true,
  prioritySupport: true,
  teamWorkflows: false,
  auditLogs: false
};

const TEAM_FEATURES: PlanFeatures = {
  cloudFixesPerDay: -1,
  savedStacks: true,
  workflowRecorder: true,
  exports: true,
  memory: true,
  prioritySupport: true,
  teamWorkflows: true,
  auditLogs: true
};

const ENTERPRISE_FEATURES: PlanFeatures = {
  cloudFixesPerDay: -1,
  savedStacks: true,
  workflowRecorder: true,
  exports: true,
  memory: true,
  prioritySupport: true,
  teamWorkflows: true,
  auditLogs: true
};

export const PLANS: Record<Plan, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    price: "$0",
    blurb: "Try the engine.",
    features: FREE_FEATURES
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "$14 / mo",
    blurb: "Daily-driver Command Center.",
    features: PRO_FEATURES
  },
  team: {
    id: "team",
    name: "Team",
    price: "$24 / seat / mo",
    blurb: "Shared workflows, team memory, audit logs.",
    features: TEAM_FEATURES
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: "Talk to us",
    blurb: "Self-host options, SSO, custom procurement.",
    features: ENTERPRISE_FEATURES
  }
};

const VALID_PLANS: ReadonlyArray<Plan> = ["free", "pro", "team", "enterprise"];

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (VALID_PLANS as readonly string[]).includes(value);
}

export function getPlan(plan: Plan): PlanDef {
  return PLANS[plan];
}

export function isPro(plan: Plan): boolean {
  return plan !== "free";
}

export function listPlans(): PlanDef[] {
  return VALID_PLANS.map((p) => PLANS[p]);
}
