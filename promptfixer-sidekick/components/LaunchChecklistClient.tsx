"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Loader2, AlertTriangle } from "lucide-react";

interface HealthEnv {
  appUrl: boolean;
  clerk: { publishable: boolean; secret: boolean };
  stripe: {
    secret: boolean;
    webhook: boolean;
    prices: Record<string, boolean>;
  };
  paddle: { apiKey: boolean; webhook: boolean };
  lemonSqueezy: { apiKey: boolean; storeId: boolean; webhook: boolean };
  upstash: { url: boolean; token: boolean };
  posthog: { key: boolean; host: boolean };
  devOverride: boolean;
  allowDevUserHeader: boolean;
  admin: { productionAdminEnabled: boolean; allowlistCount: number };
}

interface HealthResponse {
  ok: boolean;
  version: string;
  nodeEnv: string;
  billingProvider: string;
  paymentProvider: string;
  stores: { billing: string; mission: string; payment: string };
  providers: Array<{ id: string; enabled: boolean; plans: string[] }>;
  crypto: { enabled: boolean; networks: Array<{ id: string; enabled: boolean }> };
  founder: { cap: number; claimed: number; remaining: number; soldOut: boolean };
  env: HealthEnv;
  warnings: string[];
}

export function LaunchChecklistClient() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health/full", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: HealthResponse) => {
        if (!cancelled) setHealth(d);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <article className="prose-page">
        <h1>Launch checklist</h1>
        <p className="muted">
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Reading diagnostics…
        </p>
      </article>
    );
  }
  if (error || !health) {
    return (
      <article className="prose-page">
        <h1>Launch checklist</h1>
        <p>Diagnostics endpoint unavailable: {error ?? "unknown"}.</p>
      </article>
    );
  }

  const stripeProvider = health.providers.find((p) => p.id === "stripe");
  const items: Array<[string, boolean, string?]> = [
    ["Domain (NEXT_PUBLIC_APP_URL)", health.env.appUrl],
    [
      "Clerk auth keys",
      health.env.clerk.publishable && health.env.clerk.secret,
      "publishable + secret"
    ],
    ["Stripe live key", health.env.stripe.secret, "STRIPE_SECRET_KEY"],
    [
      "Stripe webhook secret",
      health.env.stripe.webhook,
      "STRIPE_WEBHOOK_SECRET"
    ],
    [
      "Stripe prices registered",
      Object.values(health.env.stripe.prices).every(Boolean) ||
        (stripeProvider?.plans.length ?? 0) > 0,
      Object.entries(health.env.stripe.prices)
        .filter(([, v]) => !v)
        .map(([k]) => k)
        .join(", ") || "all five plans"
    ],
    [
      "Paddle keys (MoR alternative)",
      health.env.paddle.apiKey,
      "PADDLE_API_KEY"
    ],
    [
      "Lemon Squeezy keys (MoR alternative)",
      health.env.lemonSqueezy.apiKey && health.env.lemonSqueezy.storeId,
      "LEMON_SQUEEZY_API_KEY + STORE_ID"
    ],
    [
      "Crypto receiving addresses",
      health.crypto.enabled,
      "ENABLE_CRYPTO_PAYMENTS + one CRYPTO_*_ADDRESS"
    ],
    [
      "Upstash (durable BillingStore + MissionStore + PaymentStore)",
      health.env.upstash.url && health.env.upstash.token
    ],
    [
      "PostHog analytics key",
      health.env.posthog.key,
      "NEXT_PUBLIC_POSTHOG_KEY"
    ],
    [
      "Admin allowlist configured",
      health.env.admin.productionAdminEnabled && health.env.admin.allowlistCount > 0,
      "ENABLE_ADMIN_ROUTES + ADMIN_EMAILS"
    ],
    [
      "Founder lifetime tested end-to-end",
      false,
      "Run /app, click founder lifetime, complete a stub or live checkout"
    ],
    [
      "Mission receipt share tested",
      false,
      "Save a mission, mark shared, open /m/<id> in incognito"
    ],
    [
      "Privacy + terms reviewed by counsel",
      false,
      "Update /privacy and /terms with counsel-reviewed copy"
    ],
    [
      "Email sending configured",
      false,
      "Resend / Postmark / SendGrid for welcome + dunning"
    ]
  ];

  return (
    <article className="prose-page" style={{ maxWidth: "min(72rem, 100%)" }}>
      <header className="flex flex-col gap-2">
        <h1 style={{ marginBottom: 0 }}>Launch checklist</h1>
        <p className="muted">
          Version <code>{health.version}</code> · {health.nodeEnv} · stores ·
          billing=<code>{health.stores.billing}</code> · missions=
          <code>{health.stores.mission}</code> · payments=
          <code>{health.stores.payment}</code>
        </p>
      </header>

      {health.warnings.length > 0 && (
        <section className="mt-4 rounded-2xl border border-amber-400/35 bg-amber-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-[12px] font-semibold uppercase tracking-wider">
              warnings
            </span>
          </div>
          <ul className="mt-2 flex flex-col gap-1 text-[12px] text-amber-100">
            {health.warnings.map((w, i) => (
              <li key={i}>· {w}</li>
            ))}
          </ul>
        </section>
      )}

      <ol className="mt-4 flex flex-col gap-2">
        {items.map(([label, ok, hint], i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3"
          >
            {ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
            )}
            <div className="flex flex-col leading-snug">
              <span
                className={ok ? "text-[13px] text-white" : "text-[13px] text-white/65"}
              >
                {label}
              </span>
              {hint && <span className="text-[11px] text-white/45">{hint}</span>}
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-[12px] text-white/70">
        <strong className="text-white/85">Founder lifetime:</strong>{" "}
        {health.founder.claimed} / {health.founder.cap} claimed
        {health.founder.soldOut
          ? " · SOLD OUT (CTA auto-disabled)"
          : ` · ${health.founder.remaining} remaining`}
        .
      </section>
    </article>
  );
}
