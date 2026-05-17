"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  CheckCircle2,
  Cpu,
  CreditCard,
  Database,
  HardDrive,
  Link as LinkIcon,
  Loader2,
  Lock,
  Terminal,
  Users,
  XCircle
} from "lucide-react";
import { LocalDataPanel } from "./LocalDataPanel";

/**
 * Settings — real values only.
 *
 * Pulls `/api/health/full` which already classifies env / store /
 * provider state per launch mode. We surface the same data here, with
 * no toggles that don't do anything. Every row maps to an env var the
 * operator can set on the server.
 */

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
  launch?: { mode: string; founderLaunch: boolean };
  stores: { billing: string; mission: string; payment: string };
  email?: { provider: string; enabled: boolean; from: string };
  providers: Array<{ id: string; enabled: boolean; plans: string[] }>;
  crypto: { enabled: boolean; networks: Array<{ id: string; enabled: boolean }> };
  env: HealthEnv;
}

export function SettingsClient() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      <p className="muted text-[11px] text-white/55">
        <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Loading
        diagnostics from /api/health/full…
      </p>
    );
  }
  if (error || !health) {
    return (
      <div className="rounded-md border border-rose-400/30 bg-rose-500/[0.06] px-3 py-2 text-[12px] text-rose-200">
        Diagnostics endpoint unavailable: {error ?? "unknown"}.
      </div>
    );
  }

  const enabledProviders = health.providers.filter((p) => p.enabled);

  return (
    <div className="flex flex-col gap-5">
      <Section
        Icon={Cpu}
        title="Routing"
        sub="Resolved engine + quality knob are driven per-mission from Mission Control. This panel reflects which providers the deployment currently has env for."
      >
        {enabledProviders.length === 0 ? (
          <p className="text-[12px] text-white/55">
            No real payment / model provider is configured on this deployment.
            The deterministic engine + local Ollama (if reachable) are still
            available for free missions.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {enabledProviders.map((p) => (
              <li
                key={p.id}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-200"
              >
                <CheckCircle2 className="h-3 w-3" />
                {p.id}
                <span className="text-emerald-200/70">· {p.plans.length} plans</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        Icon={Database}
        title="Models & stores"
        sub="Resolved store backends + Upstash + local model state."
      >
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          <Row label="Billing store" value={health.stores.billing} mono />
          <Row label="Mission store" value={health.stores.mission} mono />
          <Row label="Payment store" value={health.stores.payment} mono />
          <Row
            label="Upstash creds"
            value={health.env.upstash.url && health.env.upstash.token ? "set" : "missing"}
            ok={health.env.upstash.url && health.env.upstash.token}
          />
          <Row
            label="Launch mode"
            value={health.launch?.mode ?? "dev"}
            mono
          />
          <Row label="Build env" value={health.nodeEnv} mono />
        </div>
      </Section>

      <Section
        Icon={LinkIcon}
        title="Integrations"
        sub="Connectors the operator can wire. Each requires its own env block — see /launch for the readiness map."
      >
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          <Row
            label="Clerk auth"
            value={
              health.env.clerk.publishable && health.env.clerk.secret
                ? "configured"
                : "not configured"
            }
            ok={health.env.clerk.publishable && health.env.clerk.secret}
          />
          <Row
            label="Lemon Squeezy"
            value={
              health.env.lemonSqueezy.apiKey && health.env.lemonSqueezy.storeId
                ? "configured"
                : "not configured"
            }
            ok={Boolean(health.env.lemonSqueezy.apiKey && health.env.lemonSqueezy.storeId)}
          />
          <Row
            label="Stripe"
            value={health.env.stripe.secret ? "configured" : "not configured"}
            ok={health.env.stripe.secret}
          />
          <Row
            label="Crypto receiving"
            value={health.crypto.enabled ? "enabled" : "disabled"}
            ok={health.crypto.enabled}
          />
          <Row
            label="Transactional email"
            value={
              health.email?.enabled ? `${health.email.provider}` : "noop"
            }
            ok={Boolean(health.email?.enabled)}
          />
          <Row
            label="PostHog analytics"
            value={health.env.posthog.key ? "configured" : "not configured"}
            ok={health.env.posthog.key}
          />
        </div>
      </Section>

      <Section
        Icon={Users}
        title="Workspace"
        sub="Single-workspace today. Multi-tenant Team / Business surfaces ship in a later phase."
      >
        <p className="text-[12px] text-white/55">
          When Clerk is configured, the authenticated identity is your
          workspace. Anonymous visitors get a server-issued session cookie and
          run on the free quota. Team workspaces (shared workflows + audit
          logs) are tracked in <Link className="text-accent hover:underline" href="/launch">/launch</Link>.
        </p>
      </Section>

      <Section
        Icon={CreditCard}
        title="Billing"
        sub="Plan, payment providers, founder cap — managed through the upgrade modal in Mission Control."
      >
        <p className="text-[12px] text-white/55">
          Live plan + quota are owned by <code>/api/billing/me</code>. The
          upgrade flow lives inside Mission Control&apos;s usage chip → modal.
          Self-serve customers can change cards in the Stripe Customer Portal
          when a subscription exists. Admin verification of manual / crypto
          payments lives at{" "}
          <Link className="text-accent hover:underline" href="/admin/payments">
            /admin/payments
          </Link>{" "}
          (gated to admins in production).
        </p>
      </Section>

      <Section
        Icon={Terminal}
        title="Local Ollama"
        sub="Run missions on a local model — no cloud, no quota, no data leaves the machine."
      >
        <ol className="ml-4 list-decimal space-y-1.5 text-[12px] text-white/70">
          <li>
            Install Ollama:{" "}
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              ollama.com/download
            </a>
            .
          </li>
          <li>
            Pull a fast supervisor + a code model:{" "}
            <code className="font-mono text-[11px]">ollama pull gemma2:2b</code>{" "}
            and{" "}
            <code className="font-mono text-[11px]">ollama pull qwen2.5-coder:7b</code>.
          </li>
          <li>
            Start the daemon (it auto-starts on macOS):{" "}
            <code className="font-mono text-[11px]">ollama serve</code>.
          </li>
          <li>
            On the server, set{" "}
            <code className="font-mono text-[11px]">OLLAMA_BASE_URL=http://localhost:11434</code>{" "}
            and optionally override the model profiles via{" "}
            <code className="font-mono text-[11px]">OLLAMA_FAST_MODEL</code>,{" "}
            <code className="font-mono text-[11px]">OLLAMA_SMART_MODEL</code>,{" "}
            <code className="font-mono text-[11px]">OLLAMA_CODER_MODEL</code>.
          </li>
          <li>
            In Mission Control, pick the <strong>Local</strong> quality. The
            router will refuse to silently fall back to cloud unless you
            explicitly allow it.
          </li>
        </ol>
      </Section>

      <Section
        Icon={Lock}
        title="Privacy · local-first by design"
        sub="What stays on your machine, what leaves it, and on whose terms."
      >
        <ul className="flex flex-col gap-1.5 text-[12px] text-white/70">
          <li>
            <strong className="text-white/85">Local:</strong> mission receipts,
            saved stacks, drafts, memory notes, watchlist symbols, recorded
            workflows, the Pro Preview flag and your Mission Control settings
            all live in this browser&apos;s localStorage. They never leave
            unless you opt in.
          </li>
          <li>
            <strong className="text-white/85">Server:</strong> when you click
            &ldquo;Save receipt&rdquo; or &ldquo;Share receipt&rdquo;, a redacted
            copy goes to the server-side mission store (see <code>/api/missions</code>).
            Same for billing records when you check out.
          </li>
          <li>
            <strong className="text-white/85">Cloud models:</strong> mission
            text is sent to the provider you route to (Anthropic / OpenAI /
            Google). With <strong>Local</strong> quality + Ollama, no
            third-party provider is touched.
          </li>
          <li>
            <strong className="text-white/85">Secrets:</strong> tokens / keys
            inside your mission input are pattern-redacted before persist and
            before any share permalink renders.
          </li>
        </ul>
      </Section>

      <Section
        Icon={HardDrive}
        title="Local data"
        sub="Export, import, or wipe everything operator.center has written to this browser."
      >
        <LocalDataPanel />
      </Section>
    </div>
  );
}

// ---------- atoms ---------------------------------------------------------

function Section({
  Icon,
  title,
  sub,
  children
}: {
  Icon: typeof Cpu;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <header className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-accent" />
        <h2 className="text-[13px] font-semibold text-white">{title}</h2>
      </header>
      {sub && <p className="text-[11.5px] text-white/55">{sub}</p>}
      <div className="mt-1">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  mono,
  ok
}: {
  label: string;
  value: string;
  mono?: boolean;
  ok?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/6 bg-white/[0.012] px-2.5 py-1.5">
      <span className="text-[11.5px] text-white/55">{label}</span>
      <span
        className={clsx(
          "flex items-center gap-1 text-[12px]",
          mono && "font-mono",
          ok === true && "text-emerald-200",
          ok === false && "text-white/45"
        )}
      >
        {ok === true && <CheckCircle2 className="h-3 w-3 text-emerald-300" />}
        {ok === false && <XCircle className="h-3 w-3 text-white/30" />}
        {value}
      </span>
    </div>
  );
}
