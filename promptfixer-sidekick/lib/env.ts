/**
 * Central env validation.
 *
 * The single source of truth for "is operator.center launchable?"
 * Phases 5–9 each added their own env checks scattered across health
 * routes and the launch checklist. This module consolidates them so:
 *
 *   - `/api/health/full` returns `{ status, blockers, warnings, checks }`
 *   - `/launch` renders blockers in rose, warnings in amber, passed in
 *     emerald — all keyed off the same `EnvCheck.id`
 *
 * Every check declares the launch modes it applies in. `dev` is
 * deliberately permissive (we want to develop without forcing
 * production envs); `private_beta` upgrades a handful of warnings to
 * keep dogfood honest; `public` is the gate that must clear before
 * NEXT_PUBLIC_LAUNCH_MODE flips to "public".
 *
 * Secret VALUES never enter this module — only `present | missing`.
 */

import { cryptoConfig } from "./payments/crypto";
import { launchMode, founderLaunchEnabled, type LaunchMode } from "./launchMode";
import { billingStoreKind } from "./billing/store";
import { missionStoreKind } from "./missions/store";
import { paymentStoreKind } from "./payments/store";

export type EnvCheckLevel = "ok" | "warning" | "blocker";

export interface EnvCheck {
  id: string;
  label: string;
  /** Severity if this check fails in the *current* launch mode. */
  level: EnvCheckLevel;
  passed: boolean;
  hint?: string;
  /** Modes where this check is active. Outside these, the check is
   *  reported but level is forced to "ok" (informational only). */
  appliesIn: LaunchMode[];
}

export interface EnvDiagnostics {
  mode: LaunchMode;
  status: EnvCheckLevel;
  checks: EnvCheck[];
  blockers: EnvCheck[];
  warnings: EnvCheck[];
  passed: EnvCheck[];
}

// ============================================================================
// Helpers
// ============================================================================

function envPresent(name: string): boolean {
  return Boolean((process.env[name] || "").trim().length);
}

function envEqual(name: string, value: string): boolean {
  return (process.env[name] || "").toLowerCase() === value.toLowerCase();
}

function tryDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

function domainsLookAligned(appUrl: string, fromAddress: string): boolean {
  const host = tryDomain(appUrl);
  const dom = emailDomain(fromAddress);
  if (!host || !dom) return false;
  // Allow exact match or any subdomain relationship (e.g. mail.operator.center).
  if (host === dom) return true;
  if (host.endsWith(`.${dom}`) || dom.endsWith(`.${host}`)) return true;
  // Strip leading "www."
  const stripped = host.replace(/^www\./, "");
  return stripped === dom;
}

// ============================================================================
// Check producers
// ============================================================================

interface BuildCtx {
  mode: LaunchMode;
}

function appUrlCheck(ctx: BuildCtx): EnvCheck {
  return {
    id: "app-url",
    label: "NEXT_PUBLIC_APP_URL set",
    level: ctx.mode === "public" ? "blocker" : "warning",
    passed: envPresent("NEXT_PUBLIC_APP_URL"),
    hint: "Set to the canonical https URL of operator.center.",
    appliesIn: ["dev", "private_beta", "public"]
  };
}

function clerkChecks(ctx: BuildCtx): EnvCheck[] {
  const both = envPresent("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") && envPresent("CLERK_SECRET_KEY");
  const pub = envPresent("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  const isLive = pub
    ? (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "").startsWith("pk_live_")
    : false;
  return [
    {
      id: "clerk-keys",
      label: "Clerk publishable + secret keys configured",
      level: ctx.mode === "public" ? "blocker" : "warning",
      passed: both,
      hint: "Both NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are required.",
      appliesIn: ["private_beta", "public"]
    },
    {
      id: "clerk-live",
      label: "Clerk keys are live (pk_live_*)",
      level: ctx.mode === "public" ? "blocker" : "warning",
      passed: isLive,
      hint: "Production launch requires Clerk live keys, not test (pk_test_*).",
      appliesIn: ["public"]
    }
  ];
}

function paymentChecks(ctx: BuildCtx): EnvCheck[] {
  const stripeReady = envPresent("STRIPE_SECRET_KEY");
  const lemonReady = envPresent("LEMON_SQUEEZY_API_KEY") && envPresent("LEMON_SQUEEZY_STORE_ID");
  const cryptoReady = cryptoConfig().enabled;
  const anyProvider = stripeReady || lemonReady || cryptoReady;

  const checks: EnvCheck[] = [
    {
      id: "payments-provider",
      label: "At least one real payment provider configured",
      level: ctx.mode === "public" ? "blocker" : "warning",
      passed: anyProvider,
      hint: "Configure Stripe, Lemon Squeezy, or crypto (or all three).",
      appliesIn: ["private_beta", "public"]
    },
    {
      id: "lemon-api",
      label: "Lemon Squeezy API key + store id",
      level: ctx.mode === "public" ? "blocker" : "warning",
      passed: lemonReady,
      hint: "LEMON_SQUEEZY_API_KEY + LEMON_SQUEEZY_STORE_ID required for the recommended Turkey-friendly default.",
      appliesIn: ["public"]
    },
    {
      id: "lemon-webhook",
      label: "Lemon Squeezy webhook secret",
      level: lemonReady ? "blocker" : "warning",
      passed: !lemonReady || envPresent("LEMON_SQUEEZY_WEBHOOK_SECRET"),
      hint: "LEMON_SQUEEZY_WEBHOOK_SECRET is required when LEMON_SQUEEZY_API_KEY is set.",
      appliesIn: ["private_beta", "public"]
    },
    {
      id: "stripe-webhook",
      label: "Stripe webhook secret",
      level: stripeReady ? "blocker" : "warning",
      passed: !stripeReady || envPresent("STRIPE_WEBHOOK_SECRET"),
      hint: "STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set.",
      appliesIn: ["private_beta", "public"]
    },
    {
      id: "crypto-addresses",
      label: "Crypto addresses configured (when enabled)",
      level: "warning",
      passed: !envEqual("ENABLE_CRYPTO_PAYMENTS", "true") || cryptoConfig().enabled,
      hint: "ENABLE_CRYPTO_PAYMENTS=true requires at least one CRYPTO_*_ADDRESS.",
      appliesIn: ["dev", "private_beta", "public"]
    }
  ];
  return checks;
}

function storeChecks(ctx: BuildCtx): EnvCheck[] {
  const upstash = envPresent("UPSTASH_REDIS_REST_URL") && envPresent("UPSTASH_REDIS_REST_TOKEN");
  return [
    {
      id: "upstash-creds",
      label: "Upstash credentials present",
      level: ctx.mode === "public" ? "blocker" : "warning",
      passed: upstash,
      hint: "UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN required so BillingStore / MissionStore / PaymentStore don't fall back to memory.",
      appliesIn: ["public"]
    },
    {
      id: "store-billing-durable",
      label: "BillingStore resolves to a durable backend",
      level: ctx.mode === "public" ? "blocker" : "warning",
      passed: billingStoreKind() === "upstash" || ctx.mode !== "public",
      hint: `current = ${billingStoreKind()}; production needs upstash.`,
      appliesIn: ["public"]
    },
    {
      id: "store-mission-durable",
      label: "MissionStore resolves to a durable backend",
      level: ctx.mode === "public" ? "warning" : "warning",
      passed: missionStoreKind() === "upstash" || ctx.mode !== "public",
      hint: `current = ${missionStoreKind()}; production should be upstash.`,
      appliesIn: ["public"]
    },
    {
      id: "store-payment-durable",
      label: "PaymentStore resolves to a durable backend",
      level: ctx.mode === "public" ? "blocker" : "warning",
      passed: paymentStoreKind() === "upstash" || ctx.mode !== "public",
      hint: `current = ${paymentStoreKind()}; production needs upstash.`,
      appliesIn: ["public"]
    }
  ];
}

function emailChecks(ctx: BuildCtx): EnvCheck[] {
  const resendKey = envPresent("RESEND_API_KEY");
  const from = (process.env.EMAIL_FROM || "").trim();
  const fromPresent = from.length > 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const aligned = !resendKey || !fromPresent || !appUrl ||
    domainsLookAligned(appUrl, from);
  return [
    {
      id: "email-provider",
      label: "Transactional email provider configured",
      level: ctx.mode === "public" ? "blocker" : "warning",
      passed: resendKey && fromPresent,
      hint: "RESEND_API_KEY + EMAIL_FROM required; SUPPORT_EMAIL optional.",
      appliesIn: ["public"]
    },
    {
      id: "email-from",
      label: "EMAIL_FROM matches NEXT_PUBLIC_APP_URL domain",
      level: "warning",
      passed: aligned,
      hint: "EMAIL_FROM should sit on the same domain as the app (e.g. hello@operator.center).",
      appliesIn: ["private_beta", "public"]
    },
    {
      id: "email-support",
      label: "SUPPORT_EMAIL configured",
      level: "warning",
      passed: envPresent("SUPPORT_EMAIL"),
      hint: "SUPPORT_EMAIL is used as the Reply-To on outgoing mail.",
      appliesIn: ["public"]
    }
  ];
}

function adminChecks(ctx: BuildCtx): EnvCheck[] {
  const enableAdmin = envEqual("ENABLE_ADMIN_ROUTES", "true");
  const allowlist = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /.+@.+\..+/.test(s));
  return [
    {
      id: "admin-prod-open",
      label: "Admin routes locked down in production",
      level: ctx.mode === "public" ? "blocker" : "warning",
      passed: ctx.mode !== "public" || (enableAdmin && allowlist.length > 0),
      hint: "Production requires ENABLE_ADMIN_ROUTES=true and at least one ADMIN_EMAILS entry.",
      appliesIn: ["public"]
    },
    {
      id: "admin-allowlist-when-enabled",
      label: "ADMIN_EMAILS non-empty when admin routes enabled",
      level: enableAdmin ? "blocker" : "warning",
      passed: !enableAdmin || allowlist.length > 0,
      hint: "ENABLE_ADMIN_ROUTES=true with empty ADMIN_EMAILS rejects every caller.",
      appliesIn: ["private_beta", "public"]
    },
    {
      id: "dev-user-header-off",
      label: "ALLOW_DEV_USER_HEADER disabled in production",
      level: ctx.mode === "public" ? "blocker" : "warning",
      passed: !envEqual("ALLOW_DEV_USER_HEADER", "true") || ctx.mode !== "public",
      hint: "ALLOW_DEV_USER_HEADER must be off in production; the header is unauthenticated.",
      appliesIn: ["public"]
    }
  ];
}

function legalChecks(ctx: BuildCtx): EnvCheck[] {
  return [
    {
      id: "legal-privacy",
      label: "/privacy reviewed by counsel",
      level: ctx.mode === "public" ? "blocker" : "warning",
      passed: envEqual("LEGAL_PRIVACY_REVIEWED", "true"),
      hint: "Flip LEGAL_PRIVACY_REVIEWED=true once counsel signs off on /privacy.",
      appliesIn: ["public"]
    },
    {
      id: "legal-terms",
      label: "/terms reviewed by counsel",
      level: ctx.mode === "public" ? "blocker" : "warning",
      passed: envEqual("LEGAL_TERMS_REVIEWED", "true"),
      hint: "Flip LEGAL_TERMS_REVIEWED=true once counsel signs off on /terms.",
      appliesIn: ["public"]
    }
  ];
}

function founderChecks(ctx: BuildCtx): EnvCheck[] {
  const enabled = founderLaunchEnabled();
  if (!enabled) {
    return [
      {
        id: "founder-disabled",
        label: "Founder launch disabled (FOUNDER_LAUNCH_ENABLED=false)",
        level: "ok",
        passed: true,
        hint: "Founder lifetime CTA is hidden everywhere until you set FOUNDER_LAUNCH_ENABLED=true.",
        appliesIn: ["dev", "private_beta", "public"]
      }
    ];
  }
  const hasLemonFounderVariant = envPresent("LEMON_SQUEEZY_VARIANT_FOUNDER_LIFETIME");
  const hasStripeFounderPrice = envPresent("STRIPE_PRICE_FOUNDER_LIFETIME");
  const crypto = cryptoConfig();
  const founderPaymentReady = hasLemonFounderVariant || hasStripeFounderPrice || crypto.enabled;
  return [
    {
      id: "founder-payment-path",
      label: "Founder lifetime has a viable payment path",
      level: ctx.mode === "public" ? "blocker" : "warning",
      passed: founderPaymentReady,
      hint: "Set LEMON_SQUEEZY_VARIANT_FOUNDER_LIFETIME, STRIPE_PRICE_FOUNDER_LIFETIME, or enable crypto.",
      appliesIn: ["private_beta", "public"]
    }
  ];
}

// ============================================================================
// Public surface
// ============================================================================

export function evaluateEnv(mode: LaunchMode = launchMode()): EnvDiagnostics {
  const ctx: BuildCtx = { mode };
  const raw: EnvCheck[] = [
    appUrlCheck(ctx),
    ...clerkChecks(ctx),
    ...paymentChecks(ctx),
    ...storeChecks(ctx),
    ...emailChecks(ctx),
    ...adminChecks(ctx),
    ...legalChecks(ctx),
    ...founderChecks(ctx)
  ];

  const inMode = raw.map((check) => {
    if (!check.appliesIn.includes(mode)) {
      return { ...check, level: "ok" as EnvCheckLevel };
    }
    return check;
  });

  const blockers = inMode.filter((c) => !c.passed && c.level === "blocker");
  const warnings = inMode.filter((c) => !c.passed && c.level === "warning");
  const passed = inMode.filter((c) => c.passed);

  let status: EnvCheckLevel = "ok";
  if (blockers.length > 0) status = "blocker";
  else if (warnings.length > 0) status = "warning";

  return { mode, status, checks: inMode, blockers, warnings, passed };
}

/** Server-only — `/launch` reads this. Never call from client bundle. */
export function envDiagnosticsForReport(mode?: LaunchMode): EnvDiagnostics {
  return evaluateEnv(mode);
}
