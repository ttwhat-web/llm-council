"use client";

import clsx from "clsx";
import {
  CheckCircle2,
  Cloud,
  Database,
  Phone,
  Plug,
  Building2,
  Sparkles,
  Circle,
  AlertTriangle
} from "lucide-react";

/**
 * Roadmap 30 panel · presentation surface.
 *
 * Honest phase table from Phase 20 onward. State = shipped / partial /
 * planned / blocked. Lives in Settings · also surfaced on the
 * marketing site at /roadmap.
 */

type PhaseState = "shipped" | "partial" | "planned" | "blocked";

interface Phase {
  id: string;
  title: string;
  state: PhaseState;
  summary: string;
  next: string;
}

export const ROADMAP_PHASES: Phase[] = [
  {
    id: "20",
    title: "Ship Pipeline",
    state: "shipped",
    summary: "Tag-push GitHub release workflow · signing seam · release center · crash counter · founder activation · local telemetry dashboard.",
    next: "Acquire macOS dev ID + Windows EV cert · run first tagged release."
  },
  {
    id: "21",
    title: "Team Brains",
    state: "shipped",
    summary: "Multiple brain spaces · pack/unpack live state on switch · invite codes · role labels · clone / archive / remove.",
    next: "Enforce roles in mutators · cloud-sync spaces (Phase 26)."
  },
  {
    id: "22",
    title: "Agent Runtime",
    state: "shipped",
    summary: "Operator-tick agent dispatches that consume the last receipt and spawn a templated follow-up mission. No autonomous internet.",
    next: "Approval thresholds · parallel ticks · escalation routes."
  },
  {
    id: "23",
    title: "Marketplace",
    state: "shipped",
    summary: "Eight starter packs install real workflow nodes, terminal pins, repo sources, mission templates. .pack.json import / export.",
    next: "Operator-uploaded packs · rating · version migration."
  },
  {
    id: "24",
    title: "Enterprise Layer",
    state: "shipped",
    summary: "Local audit log of every operator action · compliance policy toggles · vault lock / SSO labelled planned.",
    next: "Runtime gates that read policy toggles · encrypted snapshots (passphrase)."
  },
  {
    id: "25",
    title: "Operator OS",
    state: "shipped",
    summary: "Runtime Bus visualisation across nine modules · operator-mode selector (Solo · Team · Agency · Enterprise).",
    next: "Wire mode into role enforcement + per-mode landing surfaces."
  },
  {
    id: "26",
    title: "Cloud Sync Layer",
    state: "planned",
    summary: "Optional encrypted multi-device sync. Device pairing, conflict resolution, encrypted workspace store. Cloud is opt-in; local-first remains default.",
    next: "Sketch wire protocol · cocoon brainpack diffs · pick storage primitive."
  },
  {
    id: "27",
    title: "Mobile Companion",
    state: "planned",
    summary: "Phone as remote control · capture / approve / receipts / alerts / inbox. QR pairing, destructive-action approval rules.",
    next: "Capacitor or native shell · adapter wires into existing pairing code."
  },
  {
    id: "28",
    title: "Connector Hub",
    state: "planned",
    summary: "Integrations marketplace (Obsidian · GitHub · Gmail · Drive · Notion · Slack · Telegram · Local folders). Capability matrix; never a fake connected state.",
    next: "Define connector contract · ship Obsidian + Local folder adapters first."
  },
  {
    id: "29",
    title: "Operator Cloud / Enterprise Server",
    state: "planned",
    summary: "Self-host story · BYOK · audit export · SSO · RBAC · air-gap mode. The team server backing Phase 24 declarations.",
    next: "Decide on deployment target (Docker · Kubernetes Helm chart)."
  },
  {
    id: "30",
    title: "Investor / Demo Mode",
    state: "shipped",
    summary: "One-click seeded workspace · guided demo path · reset demo · honest 'what is real / what is planned' surface.",
    next: "Recorded demo video · investor-facing one-pager generator."
  }
];

const ICON_BY_ID: Record<string, typeof Cloud> = {
  "20": Sparkles,
  "21": Building2,
  "22": Plug,
  "23": Sparkles,
  "24": Plug,
  "25": Sparkles,
  "26": Cloud,
  "27": Phone,
  "28": Plug,
  "29": Database,
  "30": Sparkles
};

interface Props {
  variant?: "settings" | "atlas";
}

export function RoadmapPanel({ variant = "settings" }: Props) {
  const shipped = ROADMAP_PHASES.filter((p) => p.state === "shipped").length;
  const partial = ROADMAP_PHASES.filter((p) => p.state === "partial").length;
  const planned = ROADMAP_PHASES.filter((p) => p.state === "planned").length;
  const blocked = ROADMAP_PHASES.filter((p) => p.state === "blocked").length;

  return (
    <section
      className={clsx(
        "rounded-2xl border p-4",
        variant === "atlas"
          ? "border-accent/25 bg-accent/[0.04] shadow-glow"
          : "border-white/10 bg-white/[0.02]"
      )}
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Roadmap 30 · Phases 20 → 30</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          {shipped} shipped · {partial} partial · {planned} planned · {blocked} blocked
        </span>
      </header>
      <p className="text-[11px] text-white/55">
        Honest view of every phase from launch readiness to operator
        OS. Built today vs declared. Use this in investor / customer
        conversations.
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {ROADMAP_PHASES.map((p) => {
          const Icon = ICON_BY_ID[p.id] ?? Sparkles;
          return (
            <li
              key={p.id}
              className="grid grid-cols-[40px_1fr_auto] items-start gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5 text-[11px]"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
                P{p.id}
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
                  <Icon className="h-3 w-3 text-accent" />
                  {p.title}
                </span>
                <span className="text-[10.5px] text-white/65">{p.summary}</span>
                <span className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-accent">
                  next · {p.next}
                </span>
              </div>
              <StatePill state={p.state} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StatePill({ state }: { state: PhaseState }) {
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
    <span className={clsx("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider", cls)}>
      <Icon className="h-2.5 w-2.5" />
      {state}
    </span>
  );
}
