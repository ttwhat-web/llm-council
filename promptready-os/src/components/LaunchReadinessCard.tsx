"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Rocket } from "lucide-react";
import { getTelegramBridgeStatus } from "@/services/telegramLive";
import { listInstalledPacks } from "@/services/marketplace";
import { useMissionStore } from "@/store/mission";

/**
 * Launch Readiness · honesty board.
 *
 * Tracks SIX launch blockers (A–F). Each state is derived from REAL
 * local conditions — never optimistic. A blocker is only "real" when
 * something on this machine actually proves it works.
 *
 *   A. Telegram live   · live bridge status round-trip
 *   B. Installer       · marketplace install path
 *   C. Model validation· saved model-lab results
 *   D. Email runtime   · adapters only · planned
 *   E. News bulletin   · operator brief scaffolded · planned
 *   F. Cost layer      · mission cost board
 */

type BlockerState = "real" | "partial" | "planned" | "blocked";

interface Blocker {
  letter: string;
  label: string;
  detail: string;
  state: BlockerState;
}

const MODEL_LAB_KEY = "promptready-os.model-lab.results";

function countModelLabResults(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(MODEL_LAB_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function tgState(live: string): BlockerState {
  switch (live) {
    case "live-connected":
      return "real";
    case "live-ready":
      return "partial";
    case "error":
      return "blocked";
    default:
      return "planned";
  }
}

export function LaunchReadinessCard() {
  const history = useMissionStore((s) => s.history);

  // Cheap localStorage-derived snapshots; refreshed on a light interval.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 5000);
    return () => window.clearInterval(t);
  }, []);

  // `tick` is referenced so the re-read happens on each interval pulse.
  void tick;

  const tg = getTelegramBridgeStatus();
  const installed = listInstalledPacks();
  const modelResults = countModelLabResults();

  const blockers: Blocker[] = [
    {
      letter: "A",
      label: "Telegram live",
      detail: `${tg.live} · ${tg.source}`,
      state: tgState(tg.live)
    },
    {
      letter: "B",
      label: "Installer (Marketplace)",
      detail: `${installed.length} pack(s) installed · install path live`,
      state: installed.length > 0 ? "real" : "partial"
    },
    {
      letter: "C",
      label: "Model validation",
      detail:
        modelResults > 0
          ? `${modelResults} saved model test(s)`
          : "no saved model tests yet",
      state: modelResults > 0 ? "real" : "partial"
    },
    {
      letter: "D",
      label: "Email runtime",
      detail: "adapters scaffolded · no sync",
      state: "planned"
    },
    {
      letter: "E",
      label: "News bulletin",
      detail: "operator brief scaffolded · feeds offline",
      state: "planned"
    },
    {
      letter: "F",
      label: "Cost layer",
      detail: `${history.length} mission(s) costed · board live`,
      state: history.length > 0 ? "real" : "partial"
    }
  ];

  const total = blockers.length;
  const counts = blockers.reduce<Record<BlockerState, number>>(
    (acc, b) => {
      acc[b.state] += 1;
      return acc;
    },
    { real: 0, partial: 0, planned: 0, blocked: 0 }
  );

  // Readiness weight: real=1, partial=0.5, planned/blocked=0.
  const weight = counts.real + counts.partial * 0.5;
  const pct = Math.round((weight / total) * 100);

  const chips: string[] = [];
  if (counts.real) chips.push(`${counts.real} real`);
  if (counts.partial) chips.push(`${counts.partial} partial`);
  if (counts.planned) chips.push(`${counts.planned} planned`);
  if (counts.blocked) chips.push(`${counts.blocked} blocked`);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Launch Readiness</span>
        </div>
        <span className="rounded border border-accent/30 bg-accent/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-accent shadow-glow">
          {counts.real}/{total} real
        </span>
      </header>

      <p className="text-[11px] text-white/55">
        Six launch blockers, each derived from a real local condition. A
        blocker only flips to <span className="text-emerald-200">real</span> when
        something on this machine proves it works — never optimistic.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-md bg-white/[0.04]">
          <div
            className="h-full rounded-md bg-accent shadow-glow"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
          {pct}%
        </span>
      </div>

      <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-wider text-white/45">
        {chips.join(" · ")}
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {blockers.map((b) => (
          <li
            key={b.letter}
            className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.02] px-2.5 py-2"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-accent/30 bg-accent/[0.06] font-mono text-[10px] font-semibold text-accent">
                {b.letter}
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[12px] text-white">{b.label}</span>
                <span className="truncate text-[10.5px] text-white/55">{b.detail}</span>
              </div>
            </div>
            <span
              className={clsx(
                "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
                stateTone(b.state)
              )}
            >
              {b.state}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function stateTone(state: BlockerState): string {
  switch (state) {
    case "real":
      return "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200";
    case "partial":
      return "border-amber-400/30 bg-amber-500/[0.08] text-amber-200";
    case "blocked":
      return "border-rose-400/30 bg-rose-500/[0.08] text-rose-200";
    default:
      return "border-white/10 bg-white/[0.03] text-white/55";
  }
}
