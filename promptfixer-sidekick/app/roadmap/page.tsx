import Link from "next/link";
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";

export const metadata = {
  title: "Roadmap · Operator.Center",
  description:
    "Honest roadmap from launch readiness (Phase 20) to Operator OS (Phase 30). Shipped · partial · planned · blocked."
};

type State = "shipped" | "partial" | "planned" | "blocked";
interface Phase {
  id: string;
  title: string;
  state: State;
  summary: string;
}

const PHASES: Phase[] = [
  {
    id: "20",
    title: "Ship Pipeline",
    state: "shipped",
    summary:
      "Tag-push GitHub release workflow · signing seam · release center · crash counter · founder activation · local telemetry."
  },
  {
    id: "21",
    title: "Team Brains",
    state: "shipped",
    summary:
      "Multiple brain spaces · pack/unpack live state on switch · invite codes · role labels · clone / archive / remove."
  },
  {
    id: "22",
    title: "Agent Runtime",
    state: "shipped",
    summary:
      "Operator-tick agent dispatches that consume the last receipt and spawn a templated follow-up mission. No autonomous internet."
  },
  {
    id: "23",
    title: "Marketplace",
    state: "shipped",
    summary:
      "Eight starter packs install real workflow nodes, terminal pins, repo sources, mission templates. .pack.json import / export."
  },
  {
    id: "24",
    title: "Enterprise Layer",
    state: "shipped",
    summary:
      "Local audit log of every operator action · compliance policy toggles · vault lock / SSO honestly labelled planned."
  },
  {
    id: "25",
    title: "Operator OS",
    state: "shipped",
    summary:
      "Runtime Bus visualisation across nine modules · operator-mode selector (Solo · Team · Agency · Enterprise)."
  },
  {
    id: "26",
    title: "Cloud Sync Layer",
    state: "planned",
    summary:
      "Optional encrypted multi-device sync. Device pairing, conflict resolution, encrypted workspace store. Cloud is opt-in; local-first remains default."
  },
  {
    id: "27",
    title: "Mobile Companion",
    state: "planned",
    summary:
      "Phone as remote control · capture / approve / receipts / alerts / inbox. QR pairing, destructive-action approval rules."
  },
  {
    id: "28",
    title: "Connector Hub",
    state: "planned",
    summary:
      "Integrations marketplace (Obsidian · GitHub · Gmail · Drive · Notion · Slack · Telegram · Local folders). Capability matrix; no fake connected states."
  },
  {
    id: "29",
    title: "Operator Cloud / Enterprise Server",
    state: "planned",
    summary:
      "Self-host story · BYOK · audit export · SSO · RBAC · air-gap mode. Backs Phase 24 declarations with real enforcement."
  },
  {
    id: "30",
    title: "Investor / Demo Mode",
    state: "shipped",
    summary:
      "One-click seeded workspace · guided demo path · reset demo · honest 'what is real / what is planned' surface."
  }
];

export default function RoadmapPage() {
  const shipped = PHASES.filter((p) => p.state === "shipped").length;
  const partial = PHASES.filter((p) => p.state === "partial").length;
  const planned = PHASES.filter((p) => p.state === "planned").length;
  const blocked = PHASES.filter((p) => p.state === "blocked").length;

  return (
    <MarketingShell>
      <article className="prose-page" style={{ maxWidth: "min(86ch, 100%)" }}>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          roadmap · phases 20 → 30
        </span>
        <h1>The honest roadmap.</h1>
        <p className="lede">
          Eleven phases from launch readiness to Operator OS. Every row
          declares what shipped and what is still planned. Built today,
          not aspirational marketing.
        </p>

        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="shipped" value={String(shipped)} tone="ok" />
          <Stat label="partial" value={String(partial)} tone="warn" />
          <Stat label="planned" value={String(planned)} tone="muted" />
          <Stat label="blocked" value={String(blocked)} tone="err" />
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {PHASES.map((p) => (
            <PhaseBlock key={p.id} phase={p} />
          ))}
        </div>

        <h2>What&rsquo;s real today</h2>
        <ul>
          <li>Deterministic mission engine · runs offline forever · no API key required.</li>
          <li>Ollama dispatch with model picker + model-not-installed copy hint.</li>
          <li>Workflow execution with approval resume.</li>
          <li>Atlas blueprint, eight starter packs, local audit log, snapshots.</li>
          <li>Source build · `npm run tauri:build` produces a real binary.</li>
        </ul>

        <h2>What is planned · honest</h2>
        <ul>
          <li>Signed installers on tag push · CI workflow ready, signing keys pending.</li>
          <li>Mobile companion + Telegram bot networking · adapters in place.</li>
          <li>Cloud sync · operator-supplied bucket model.</li>
          <li>Connector hub · Obsidian + Local folder first.</li>
          <li>Enterprise server · Docker + Helm chart story.</li>
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/download"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow hover:bg-accent"
          >
            Get the build →
          </Link>
          <Link
            href="/founders"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/85 hover:bg-white/[0.06]"
          >
            Reserve a founder spot
          </Link>
          <Link
            href="/docs/demo-script"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/85 hover:bg-white/[0.06]"
          >
            90-second demo script
          </Link>
        </div>
      </article>
    </MarketingShell>
  );
}

function PhaseBlock({ phase }: { phase: Phase }) {
  return (
    <section
      className={`rounded-2xl border p-4 ${
        phase.state === "shipped"
          ? "border-emerald-400/25 bg-emerald-500/[0.04]"
          : phase.state === "blocked"
            ? "border-rose-400/25 bg-rose-500/[0.04]"
            : phase.state === "partial"
              ? "border-amber-400/25 bg-amber-500/[0.04]"
              : "border-white/8 bg-white/[0.02]"
      }`}
    >
      <header className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          phase {phase.id}
        </span>
        <StatePill state={phase.state} />
      </header>
      <h3 className="text-[16px] font-semibold text-white" style={{ marginTop: 0 }}>
        {phase.title}
      </h3>
      <p className="mt-1 text-[12.5px] text-white/75">{phase.summary}</p>
    </section>
  );
}

function StatePill({ state }: { state: State }) {
  const cls = {
    shipped: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
    partial: "border-amber-400/30 bg-amber-500/[0.08] text-amber-200",
    planned: "border-white/10 bg-white/[0.03] text-white/55",
    blocked: "border-rose-400/30 bg-rose-500/[0.08] text-rose-200"
  }[state];
  const Icon =
    state === "shipped"
      ? CheckCircle2
      : state === "blocked"
        ? AlertTriangle
        : Circle;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] ${cls}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {state}
    </span>
  );
}

function Stat({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "muted" | "err";
}) {
  const cls = {
    ok: "border-emerald-400/30 bg-emerald-500/[0.06]",
    warn: "border-amber-400/30 bg-amber-500/[0.06]",
    muted: "border-white/10 bg-white/[0.03]",
    err: "border-rose-400/30 bg-rose-500/[0.06]"
  }[tone];
  return (
    <div className={`flex flex-col gap-0.5 rounded-md border px-3 py-2 ${cls}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
        {label}
      </span>
      <span className="text-[20px] font-semibold text-white">{value}</span>
    </div>
  );
}
