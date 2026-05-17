import Link from "next/link";
import { ArrowRight, Check, Crown, ShieldCheck, Users, Zap } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";
import { FounderCounter } from "@/components/FounderCounter";
import { founderLaunchEnabled } from "@/lib/launchMode";

/**
 * Public pricing page. The /app surface owns the in-product upgrade
 * modal; this page is for visitors who haven't entered Mission Control
 * yet (linked from the landing nav, footer, ToS).
 */

export const metadata = {
  title: "Pricing · operator.center",
  description:
    "Free at 10 daily missions. Pro at $19/mo. Team at $39/seat/mo. Founder Lifetime at $99 — first 100 operators only."
};

const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    cadence: "always",
    Icon: Zap,
    blurb: "Run real missions on the local rules engine before you commit a card.",
    features: [
      "Local rules engine — unlimited",
      "10 cloud missions / day once a provider is connected",
      "Mission Archive — local",
      "Basic templates",
      "Anonymous session — no signup required"
    ],
    cta: "Start free",
    href: "/app"
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$19",
    cadence: "/ month",
    Icon: Crown,
    highlight: true,
    blurb: "The daily-driver Mission Control. The default we recommend.",
    features: [
      "Unlimited cloud missions",
      "Advanced exports (Cursor / Claude / ChatGPT / Linear / GitHub / Terminal Safe)",
      "Architect mode",
      "Memory connectors — Obsidian + GitHub (rolling out)",
      "Local Ollama profiles",
      "Mission Alerts (Telegram)"
    ],
    cta: "Go Pro",
    href: "/app?plan=pro"
  },
  {
    id: "team" as const,
    name: "Operator",
    price: "$39",
    cadence: "/ seat / month",
    Icon: Users,
    blurb: "Terminal workspace + agents for operators running real ops.",
    features: [
      "Everything in Pro",
      "Terminal workspace — markets / repos / inbox panels",
      "Agent actions",
      "Repo intelligence",
      "Market intelligence",
      "Scheduled missions",
      "Advanced telemetry"
    ],
    cta: "Open Operator",
    href: "/app?plan=team"
  }
];

const FOUNDER = {
  price: "$99",
  cadence: "once",
  blurb: "Pro for life. First 100 operators. No renewal, ever.",
  features: [
    "Pro plan, lifetime",
    "First in line for the Operator API",
    "Founder badge on your audit log",
    "Locked-in pricing if Pro ever rises"
  ]
};

export default function PricingPage() {
  return (
    <MarketingShell>
      <header className="flex flex-col gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
          Access tiers
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
          Pricing for operators, not tourists.
        </h1>
        <p className="max-w-[60ch] text-[14px] text-white/65">
          Free is generous. Pro is fair. Team is per-seat. Enterprise is custom. No
          credits, no expiring tokens, no opaque &ldquo;AI units.&rdquo;
        </p>
        <FounderCounter variant="cta" className="mt-1" />
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`flex flex-col gap-3 rounded-2xl border bg-white/[0.02] p-5 transition ${
              plan.highlight ? "border-accent/40 shadow-glow" : "border-white/8 hover:border-white/14"
            }`}
          >
            <div className="flex items-center justify-between">
              <plan.Icon className={`h-4 w-4 ${plan.highlight ? "text-accent" : "text-white/65"}`} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
                {plan.id}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-white">{plan.price}</span>
              <span className="text-[12px] text-white/45">{plan.cadence}</span>
            </div>
            <div className="text-[13px] font-medium text-white">{plan.name}</div>
            <p className="text-[12px] text-white/55">{plan.blurb}</p>
            <ul className="mt-1 flex flex-col gap-1.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12px] text-white/80">
                  <Check
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${plan.highlight ? "text-accent" : "text-white/55"}`}
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={plan.href}
              className={`mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition ${
                plan.highlight
                  ? "bg-accent/90 text-white shadow-glow hover:bg-accent"
                  : "border border-white/10 bg-white/[0.03] text-white/85 hover:bg-white/[0.06]"
              }`}
            >
              {plan.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </section>

      {founderLaunchEnabled() && (
      <section
        id="founder-lifetime"
        className="rounded-3xl border border-amber-500/25 bg-amber-500/[0.05] p-5 md:p-6"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">
              Founder lifetime
            </span>
            <h2 className="text-xl font-semibold text-white md:text-2xl">
              {FOUNDER.price} <span className="text-white/45 text-sm">{FOUNDER.cadence}</span>
            </h2>
            <p className="max-w-[60ch] text-[12px] text-white/65">{FOUNDER.blurb}</p>
            <ul className="mt-2 grid grid-cols-1 gap-1 text-[12px] text-white/80 sm:grid-cols-2">
              {FOUNDER.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/app?plan=founder"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-400/90 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300"
          >
            Claim a slot
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Enterprise</span>
        </div>
        <p className="max-w-[60ch] text-[12px] text-white/65">
          On-prem runtime, BYOK with private models, SAML / SCIM, audit log streaming
          (S3 / Datadog / Splunk), DPA. Pricing from $1.5k / month. Founder-led
          inbound only.
        </p>
        <a
          href="mailto:hello@operator.center?subject=Enterprise"
          className="self-start rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:bg-white/[0.08]"
        >
          Talk to us →
        </a>
      </section>
    </MarketingShell>
  );
}
