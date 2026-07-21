/**
 * GET /api/health/full
 *
 * Launch-readiness diagnostics. Returns env-presence flags (never the
 * secret values), provider/store configuration, and a list of
 * "required" warnings the operator should resolve before a public
 * launch.
 *
 * Safe to publish — the response holds no credentials.
 */

import { NextResponse } from "next/server";
import { adminEnvSnapshot } from "@/lib/admin";
import { listProviderInfo } from "@/lib/payments/registry";
import { billingStoreKind } from "@/lib/billing/store";
import { missionStoreKind } from "@/lib/missions/store";
import { paymentStoreKind } from "@/lib/payments/store";
import { cryptoConfig } from "@/lib/payments/crypto";
import { countFounderSeats } from "@/lib/billing/founder";
import { emailProviderSnapshot } from "@/lib/email";
import { evaluateEnv } from "@/lib/env";
import { launchModeSnapshot } from "@/lib/launchMode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Flag {
  key: string;
  configured: boolean;
}

function flag(key: string, value?: string): Flag {
  return { key, configured: Boolean((value ?? process.env[key])?.length) };
}

export async function GET() {
  const billingProvider = (process.env.BILLING_PROVIDER || "stub").toLowerCase();
  const paymentProvider = (process.env.PAYMENT_PROVIDER || "stub").toLowerCase();

  const providers = listProviderInfo().map((p) => ({
    id: p.id,
    enabled: p.enabled,
    plans: p.plans,
    manualVerification: p.manualVerification,
    unavailableReason: p.unavailableReason
  }));

  const crypto = cryptoConfig();
  const founder = await countFounderSeats();

  const env = {
    appUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    clerk: {
      publishable: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      secret: !!process.env.CLERK_SECRET_KEY
    },
    stripe: {
      secret: !!process.env.STRIPE_SECRET_KEY,
      webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
      prices: {
        pro_monthly: !!process.env.STRIPE_PRICE_PRO_MONTHLY,
        pro_annual: !!process.env.STRIPE_PRICE_PRO_ANNUAL,
        team_monthly: !!process.env.STRIPE_PRICE_TEAM_MONTHLY,
        team_annual: !!process.env.STRIPE_PRICE_TEAM_ANNUAL,
        founder_lifetime: !!process.env.STRIPE_PRICE_FOUNDER_LIFETIME
      }
    },
    paddle: {
      apiKey: !!process.env.PADDLE_API_KEY,
      webhook: !!process.env.PADDLE_WEBHOOK_SECRET
    },
    lemonSqueezy: {
      apiKey: !!process.env.LEMON_SQUEEZY_API_KEY,
      storeId: !!process.env.LEMON_SQUEEZY_STORE_ID,
      webhook: !!process.env.LEMON_SQUEEZY_WEBHOOK_SECRET
    },
    upstash: {
      url: !!process.env.UPSTASH_REDIS_REST_URL,
      token: !!process.env.UPSTASH_REDIS_REST_TOKEN
    },
    posthog: {
      key: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
      host: !!process.env.NEXT_PUBLIC_POSTHOG_HOST
    },
    devOverride: !!process.env.BILLING_DEV_OVERRIDE_SECRET,
    allowDevUserHeader:
      (process.env.ALLOW_DEV_USER_HEADER || "").toLowerCase() === "true",
    admin: adminEnvSnapshot()
  } satisfies Record<string, unknown>;

  const stores = {
    billing: billingStoreKind(),
    mission: missionStoreKind(),
    payment: paymentStoreKind()
  };
  const email = emailProviderSnapshot();

  const warnings: string[] = [];
  if (process.env.NODE_ENV === "production") {
    if (!env.appUrl) warnings.push("NEXT_PUBLIC_APP_URL is required in production.");
    if (!env.clerk.publishable || !env.clerk.secret)
      warnings.push("Clerk keys are not set — authenticated identity disabled.");
    if (!env.stripe.secret && !env.paddle.apiKey && !env.lemonSqueezy.apiKey && !crypto.enabled)
      warnings.push(
        "No real payment provider is configured (Stripe / Paddle / Lemon / crypto)."
      );
    if (env.stripe.secret && !env.stripe.webhook)
      warnings.push("STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set.");
    if (env.lemonSqueezy.apiKey && !env.lemonSqueezy.webhook)
      warnings.push(
        "LEMON_SQUEEZY_WEBHOOK_SECRET is required when LEMON_SQUEEZY_API_KEY is set."
      );

    // Per-store production diagnostics. The fallback semantics are:
    //   no Upstash → memory (loses everything on deploy)
    //   *_STORE=file → tries to write under .promptfixer (ephemeral on
    //                  serverless platforms like Vercel)
    if (!env.upstash.url || !env.upstash.token) {
      warnings.push(
        "Upstash credentials missing — billing, mission, and payment stores will fall back to in-memory."
      );
    }
    for (const [name, kind] of [
      ["BillingStore", stores.billing],
      ["MissionStore", stores.mission],
      ["PaymentStore", stores.payment]
    ] as const) {
      if (kind === "memory") {
        warnings.push(`${name} resolves to memory in production — data is lost on every deploy.`);
      } else if (kind === "file") {
        warnings.push(
          `${name} resolves to file in production — fine for a single VPS, ephemeral on serverless.`
        );
      }
    }

    if (!email.enabled) {
      warnings.push(
        "Email provider is no-op in production — RESEND_API_KEY + EMAIL_FROM required to send transactional mail."
      );
    } else if (email.from === "missing") {
      warnings.push("EMAIL_FROM is not set; transactional mail will fail.");
    }
    if (env.allowDevUserHeader)
      warnings.push(
        "ALLOW_DEV_USER_HEADER=true in production is unsafe — disable before launch."
      );
    if (env.admin.productionAdminEnabled && env.admin.allowlistCount === 0)
      warnings.push(
        "ENABLE_ADMIN_ROUTES=true with empty ADMIN_EMAILS — admin will reject all callers."
      );
  }

  // Classified env diagnostics (Phase 10). The launch checklist UI
  // renders these as blockers / warnings / passed; the response keeps
  // the legacy `warnings: string[]` for any tooling that still parses
  // the old shape.
  const diag = evaluateEnv();
  const launch = launchModeSnapshot();

  return NextResponse.json({
    ok: true,
    version: process.env.npm_package_version || "0.0.0",
    nodeEnv: process.env.NODE_ENV || "development",
    launch,
    status: diag.status,
    diagnostics: {
      status: diag.status,
      mode: diag.mode,
      blockers: diag.blockers,
      warnings: diag.warnings,
      passed: diag.passed,
      checks: diag.checks
    },
    billingProvider,
    paymentProvider,
    stores,
    email,
    providers,
    crypto: {
      enabled: crypto.enabled,
      networks: crypto.networks.map((n) => ({ id: n.id, enabled: n.enabled }))
    },
    founder,
    env,
    warnings
  });
}
