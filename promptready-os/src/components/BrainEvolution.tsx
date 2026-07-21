"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { readOperatorRank, type OperatorRankSnapshot } from "@/services/operatorRank";

/**
 * Brain Evolution · UX RESET 03.
 *
 * Compact HUD block · AGE · MATURITY% · LEVEL. Every number comes from
 * real local counters · brain.identity.createdAt, mission history,
 * imports, snapshots, etc. No invented values · "needs a brain" state
 * when no identity exists.
 */

export function BrainEvolution() {
  const [snap, setSnap] = useState<OperatorRankSnapshot>(() => readOperatorRank());

  useEffect(() => {
    const refresh = () => setSnap(readOperatorRank());
    const t = window.setInterval(refresh, 8000);
    return () => window.clearInterval(t);
  }, []);

  const maturityTone =
    snap.maturityPct >= 75 ? "ok" : snap.maturityPct >= 50 ? "warn" : "bad";

  return (
    <div className="flex items-center gap-4 rounded-lg border border-accent/25 bg-accent/[0.04] px-3 py-1.5">
      <Field label="age" value={`${snap.ageDays}d`} mono="white" />
      <span className="h-6 w-px bg-white/8" aria-hidden />
      <Field
        label="maturity"
        value={`${snap.maturityPct}%`}
        mono={maturityTone === "ok" ? "ok" : maturityTone === "warn" ? "warn" : "bad"}
      />
      <span className="h-6 w-px bg-white/8" aria-hidden />
      <Field label="level" value={snap.levelLabel} mono="accent" />
      {snap.demo && (
        <span className="rounded border border-accent/30 bg-accent/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-accent">
          demo
        </span>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono
}: {
  label: string;
  value: string;
  mono: "white" | "accent" | "ok" | "warn" | "bad";
}) {
  const valueCls = {
    white: "text-white",
    accent: "text-accent",
    ok: "text-emerald-200",
    warn: "text-amber-200",
    bad: "text-rose-200"
  }[mono];
  return (
    <div className="flex flex-col items-start leading-tight">
      <span className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-white/40">
        {label}
      </span>
      <span className={clsx("font-mono text-[14px] font-semibold tabular-nums", valueCls)}>
        {value}
      </span>
    </div>
  );
}
