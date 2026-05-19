"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { NotificationsBell } from "@/components/NotificationsBell";
import { SpaceSwitcher } from "@/components/SpaceSwitcher";
import { readPresentationFlags } from "@/components/PresentationModeCard";
import { PresenceStrip } from "@/components/PresenceStrip";
import { measureBrainHealth } from "@/services/brainHealth";

/**
 * Atlas HUD · UX RESET 02.
 *
 * Operator workstation feel · not SaaS dashboard. Large mono numbers,
 * a compact identity block, terminal-style presence row. Honest:
 * every value is computed from real local stores.
 */

const OPERATOR_MODE_KEY = "promptready-os.operator-mode";

function readOperatorTier(): string {
  if (typeof window === "undefined") return "Solo";
  try {
    const raw = window.localStorage.getItem(OPERATOR_MODE_KEY);
    if (raw === "team") return "Team";
    if (raw === "agency") return "Agency";
    if (raw === "enterprise") return "Enterprise";
    return "Solo";
  } catch {
    return "Solo";
  }
}

/** 0–100 health derived from brainHealth · matches BrainScoreCard formula. */
function deriveHealthPct(): number {
  const h = measureBrainHealth();
  const base = 50;
  const bonuses =
    Math.min(20, h.receipts) +
    Math.min(10, h.memoryDocs) +
    Math.min(10, h.workflowNodes) +
    Math.min(10, h.snapshots * 2);
  const penalties =
    h.duplicateDocs * 3 +
    h.staleRepos * 2 +
    h.unusedWorkflowNodes * 2 +
    h.orphanFiles * 2 +
    h.inboxArchived;
  return Math.max(0, Math.min(100, Math.round(base + bonuses - penalties)));
}

export function AtlasHud() {
  const identity = useBrainStore((s) => s.identity);
  const sources = useBrainStore((s) => s.memorySources);
  const engines = useBrainStore((s) => s.engines);
  const missionCount = useBrainStore((s) => s.missionCount);
  const demo = useBrainStore((s) => s.demo);
  const history = useMissionStore((s) => s.history);
  const runtime = useMissionStore((s) => s.runtime);
  const snapshots = useAtlasStore((s) => s.snapshots);
  // snapshots feeds the BrainScore card / health calc; not directly read here
  // but keeping the subscription so HUD re-renders when snapshot count changes.
  void snapshots;

  const repos = sources.filter((s) => s.kind === "github").length;
  const health = deriveHealthPct();
  const tier = readOperatorTier();
  const brainName = identity?.name ?? "—";
  const brainMode = identity?.mode ? capitalize(identity.mode) : "—";
  const runtimeLabel = runtimeShort(runtime);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
      {/* Top row · identity block + large counters + bell/switcher */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <IdentityBlock
          operator={tier}
          brain={brainName}
          mode={brainMode}
          runtimeLabel={runtimeLabel}
          demo={demo}
        />

        <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2">
          <BigNumber label="missions" value={missionCount} />
          <BigNumber label="receipts" value={history.length} />
          <BigNumber label="repos" value={repos} />
          <BigNumber label="health" value={health} suffix="%" tone={healthTone(health)} />
        </div>

        <div className="flex items-center gap-1.5">
          <PresentationPill />
          <SpaceSwitcher />
          <NotificationsBell />
        </div>
      </div>

      {/* Bottom row · terminal-style presence strip */}
      <div className="border-t border-white/6 pt-2">
        <PresenceStrip />
      </div>
    </section>
  );
}

// ============================================================================
// Identity block
// ============================================================================

function IdentityBlock({
  operator,
  brain,
  mode,
  runtimeLabel,
  demo
}: {
  operator: string;
  brain: string;
  mode: string;
  runtimeLabel: string;
  demo: boolean;
}) {
  return (
    <div className="flex items-center gap-4 font-mono text-[11px]">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/[0.1] ring-1 ring-accent/30 shadow-glow">
        <span className="text-[11px] tracking-wider text-accent">[ ]</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-0.5">
        <IdRow k="operator" v={operator} />
        <IdRow k="brain" v={brain} dim={brain === "—"} />
        <IdRow k="mode" v={mode} dim={mode === "—"} />
        <IdRow k="runtime" v={runtimeLabel} />
      </dl>
      {demo && (
        <span className="rounded border border-accent/30 bg-accent/[0.08] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.22em] text-accent">
          demo
        </span>
      )}
    </div>
  );
}

function IdRow({ k, v, dim }: { k: string; v: string; dim?: boolean }) {
  return (
    <div className="contents">
      <dt className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/35">{k}</dt>
      <dd className={clsx("font-mono text-[12px]", dim ? "text-white/40" : "text-white/85")}>
        {v}
      </dd>
    </div>
  );
}

// ============================================================================
// Big number
// ============================================================================

function BigNumber({
  label,
  value,
  suffix,
  tone
}: {
  label: string;
  value: number;
  suffix?: string;
  tone?: "ok" | "warn" | "bad";
}) {
  const toneCls =
    tone === "warn"
      ? "text-amber-200"
      : tone === "bad"
        ? "text-rose-200"
        : "text-white";
  return (
    <div className="flex flex-col items-start">
      <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/40">
        {label}
      </span>
      <span className={clsx("font-mono text-[26px] font-semibold leading-none tabular-nums", toneCls)}>
        {value}
        {suffix && <span className="text-[14px] text-white/55">{suffix}</span>}
      </span>
    </div>
  );
}

function healthTone(pct: number): "ok" | "warn" | "bad" {
  if (pct >= 75) return "ok";
  if (pct >= 50) return "warn";
  return "bad";
}

// ============================================================================
// Presentation pill (preserved from prior HUD)
// ============================================================================

function PresentationPill() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const refresh = () => {
      const f = readPresentationFlags();
      setActive(f.silent || f.ghost || f.demoLock);
    };
    refresh();
    const t = window.setInterval(refresh, 1500);
    return () => window.clearInterval(t);
  }, []);
  if (!active) return null;
  return (
    <span
      title="Presentation mode flags active · Settings → Presentation Mode"
      className="rounded border border-accent/30 bg-accent/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-accent"
    >
      stage
    </span>
  );
}

// ============================================================================
// helpers
// ============================================================================

function runtimeShort(r: string): string {
  switch (r) {
    case "ready":
      return "Ready";
    case "local-mode":
      return "Local";
    case "offline":
      return "Offline";
    default:
      return "Standby";
  }
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
