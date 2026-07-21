"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";

/**
 * /launch — public-launch readiness checklist.
 *
 * Reads /api/health/full → diagnostics (Phase 10 classifier output).
 * Each EnvCheck renders as a row coloured by severity:
 *   blocker → rose
 *   warning → amber
 *   passed  → emerald
 *
 * The top-of-page badge mirrors the worst severity in the current
 * launch mode.
 */

type Level = "ok" | "warning" | "blocker";

interface EnvCheck {
  id: string;
  label: string;
  level: Level;
  passed: boolean;
  hint?: string;
  appliesIn: Array<"dev" | "private_beta" | "public">;
}

interface HealthResponse {
  ok: boolean;
  version: string;
  nodeEnv: string;
  launch: { mode: "dev" | "private_beta" | "public"; founderLaunch: boolean };
  status: Level;
  diagnostics: {
    status: Level;
    mode: "dev" | "private_beta" | "public";
    blockers: EnvCheck[];
    warnings: EnvCheck[];
    passed: EnvCheck[];
    checks: EnvCheck[];
  };
  stores: { billing: string; mission: string; payment: string };
  founder: { cap: number; claimed: number; remaining: number; soldOut: boolean };
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

  const { diagnostics, founder } = health;

  return (
    <article className="prose-page" style={{ maxWidth: "min(72rem, 100%)" }}>
      <header className="flex flex-col gap-3">
        <h1 style={{ marginBottom: 0 }}>Launch checklist</h1>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <ModeBadge mode={health.launch.mode} />
          <StatusBadge status={diagnostics.status} />
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono uppercase tracking-wider text-white/55">
            v{health.version} · {health.nodeEnv}
          </span>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono uppercase tracking-wider text-white/55">
            stores · billing={health.stores.billing} · mission={health.stores.mission} ·
            payment={health.stores.payment}
          </span>
        </div>
      </header>

      {diagnostics.status === "ok" && (
        <section className="mt-4 rounded-2xl border border-emerald-400/35 bg-emerald-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[12px] font-semibold uppercase tracking-wider">
              ready for {health.launch.mode}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-emerald-100/85">
            No blockers, no warnings. Flip{" "}
            <code>NEXT_PUBLIC_LAUNCH_MODE</code> when you&apos;re ready.
          </p>
        </section>
      )}

      {diagnostics.blockers.length > 0 && (
        <Group
          title="Blockers"
          tone="rose"
          icon={<ShieldAlert className="h-3.5 w-3.5 text-rose-300" />}
          checks={diagnostics.blockers}
        />
      )}

      {diagnostics.warnings.length > 0 && (
        <Group
          title="Warnings"
          tone="amber"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-300" />}
          checks={diagnostics.warnings}
        />
      )}

      {diagnostics.passed.length > 0 && (
        <Group
          title="Passed"
          tone="emerald"
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />}
          checks={diagnostics.passed}
        />
      )}

      <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <div className="flex flex-col gap-1 text-[12px] text-white/70">
          <strong className="text-white/85">Founder lifetime:</strong>{" "}
          {founder.claimed} / {founder.cap} claimed{" "}
          {founder.soldOut
            ? "· SOLD OUT (CTA auto-disabled)"
            : `· ${founder.remaining} remaining`}
          .
        </div>
        <p className="mt-2 text-[11px] text-white/45">
          {health.launch.founderLaunch
            ? "Founder launch ENABLED — CTA renders everywhere unless sold out."
            : "Founder launch DISABLED via FOUNDER_LAUNCH_ENABLED=false — CTA is hidden."}
        </p>
      </section>

      <section className="mt-6 flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-[12px] text-white/70">
        <strong className="text-white/85">Go-live runbook</strong>
        <ol className="ml-4 list-decimal space-y-1">
          <li>operator.center → Vercel DNS</li>
          <li>Clerk production app + pk_live_ / sk_live_ keys</li>
          <li>Lemon Squeezy store + variants + webhook endpoint</li>
          <li>Resend domain verified, SPF/DKIM aligned</li>
          <li>Upstash Redis credentials in production env</li>
          <li>
            <code>LEGAL_PRIVACY_REVIEWED=true</code> +{" "}
            <code>LEGAL_TERMS_REVIEWED=true</code>
          </li>
          <li>
            <code>ENABLE_ADMIN_ROUTES=true</code> +{" "}
            <code>ADMIN_EMAILS=…</code>
          </li>
          <li>Run a founder lifetime test payment end-to-end</li>
          <li>
            Flip <code>NEXT_PUBLIC_LAUNCH_MODE=public</code> +{" "}
            <code>FOUNDER_LAUNCH_ENABLED=true</code>
          </li>
        </ol>
      </section>
    </article>
  );
}

// ============================================================================
// helpers
// ============================================================================

function Group({
  title,
  tone,
  icon,
  checks
}: {
  title: string;
  tone: "rose" | "amber" | "emerald";
  icon: React.ReactNode;
  checks: EnvCheck[];
}) {
  const wrap = {
    rose: "border-rose-400/40 bg-rose-500/[0.05]",
    amber: "border-amber-400/35 bg-amber-500/[0.05]",
    emerald: "border-emerald-400/30 bg-emerald-500/[0.04]"
  }[tone];
  const label = {
    rose: "text-rose-200",
    amber: "text-amber-200",
    emerald: "text-emerald-200"
  }[tone];
  return (
    <section className={`mt-4 rounded-2xl border ${wrap} p-4`}>
      <div className={`flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider ${label}`}>
        {icon} {title} · {checks.length}
      </div>
      <ol className="mt-3 flex flex-col gap-2">
        {checks.map((c) => (
          <li
            key={c.id}
            className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3"
          >
            {c.passed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
            )}
            <div className="flex flex-col leading-snug">
              <span className={c.passed ? "text-[13px] text-white" : "text-[13px] text-white/65"}>
                {c.label}
              </span>
              {c.hint && <span className="text-[11px] text-white/45">{c.hint}</span>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StatusBadge({ status }: { status: Level }) {
  const cls =
    status === "ok"
      ? "border-emerald-400/40 bg-emerald-500/[0.08] text-emerald-200"
      : status === "warning"
        ? "border-amber-400/35 bg-amber-500/[0.08] text-amber-200"
        : "border-rose-400/40 bg-rose-500/[0.08] text-rose-200";
  return (
    <span
      className={`rounded-md border px-2 py-0.5 font-mono uppercase tracking-wider ${cls}`}
    >
      {status === "ok" ? "ready" : status}
    </span>
  );
}

function ModeBadge({ mode }: { mode: "dev" | "private_beta" | "public" }) {
  const cls =
    mode === "public"
      ? "border-emerald-400/40 bg-emerald-500/[0.08] text-emerald-200"
      : mode === "private_beta"
        ? "border-accent/40 bg-accent/[0.08] text-accent"
        : "border-white/15 bg-white/[0.04] text-white/65";
  return (
    <span
      className={`rounded-md border px-2 py-0.5 font-mono uppercase tracking-wider ${cls}`}
    >
      {mode}
    </span>
  );
}
