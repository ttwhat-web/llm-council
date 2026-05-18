"use client";

import clsx from "clsx";
import { Activity, Archive, Brain, Cpu, Database, Github, Receipt } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { NotificationsBell } from "@/components/NotificationsBell";

/**
 * Atlas HUD · top bar always visible on the Atlas surface.
 *
 * Honest counters only. The "health ring" is a tiny SVG dot: filled
 * accent when an engine is selected, hollow when nothing is set up.
 */

export function AtlasHud() {
  const identity = useBrainStore((s) => s.identity);
  const sources = useBrainStore((s) => s.memorySources);
  const engines = useBrainStore((s) => s.engines);
  const missionCount = useBrainStore((s) => s.missionCount);
  const demo = useBrainStore((s) => s.demo);
  const history = useMissionStore((s) => s.history);
  const current = useMissionStore((s) => s.current);
  const runtime = useMissionStore((s) => s.runtime);
  const snapshots = useAtlasStore((s) => s.snapshots);

  const repos = sources.filter((s) => s.kind === "github").length;
  const engineKinds = engines.map((e) => e.kind).join(" · ") || "deterministic";

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <HealthRing live={!!current} hasEngine={engines.length > 0} runtime={runtime} />
        <Hud Icon={Brain} label="brain" value={identity?.name ?? "—"} hint={identity?.mode ?? "no brain"} />
        <Hud Icon={Cpu} label="engines" value={String(engines.length)} hint={engineKinds} />
        <Hud Icon={Database} label="sources" value={String(sources.length)} />
        <Hud Icon={Github} label="repos" value={String(repos)} />
        <Hud Icon={Activity} label="missions" value={String(missionCount)} />
        <Hud Icon={Receipt} label="receipts" value={String(history.length)} />
        <Hud Icon={Archive} label="snapshots" value={String(snapshots.length)} />
      </div>
      <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
        <span
          className={clsx(
            "inline-block h-1.5 w-1.5 rounded-full",
            runtime === "ready" || runtime === "local-mode"
              ? "bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.65)]"
              : "bg-amber-400/80"
          )}
        />
        {runtimeLabel(runtime)}
        {demo && (
          <span className="rounded border border-accent/30 bg-accent/[0.08] px-1 py-px text-accent">
            demo
          </span>
        )}
        <NotificationsBell />
      </div>
    </section>
  );
}

function HealthRing({
  live,
  hasEngine,
  runtime
}: {
  live: boolean;
  hasEngine: boolean;
  runtime: string;
}) {
  const color =
    runtime === "ready" || runtime === "local-mode" ? "var(--pr-color-accent)" : "rgba(255,255,255,0.18)";
  return (
    <svg width={26} height={26} className="shrink-0">
      <circle
        cx={13}
        cy={13}
        r={10}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={2}
      />
      <circle
        cx={13}
        cy={13}
        r={10}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray={hasEngine ? "" : "3 3"}
        opacity={hasEngine ? 0.9 : 0.55}
      />
      <circle cx={13} cy={13} r={3} fill={color} opacity={live ? 1 : 0.6}>
        {live && (
          <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />
        )}
      </circle>
    </svg>
  );
}

function Hud({
  Icon,
  label,
  value,
  hint
}: {
  Icon: typeof Brain;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-accent" />
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
          {label}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[12.5px] font-semibold text-white">{value}</span>
          {hint && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
              {hint}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function runtimeLabel(r: string) {
  switch (r) {
    case "ready":
      return "engine ready";
    case "local-mode":
      return "local · deterministic";
    case "offline":
      return "offline";
    default:
      return "deterministic standby";
  }
}
