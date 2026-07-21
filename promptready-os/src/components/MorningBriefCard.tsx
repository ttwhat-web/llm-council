"use client";

import { useEffect, useState } from "react";
import { Coffee } from "lucide-react";
import { readMorningBrief, type MorningBrief } from "@/services/operatorRank";

/**
 * Morning Brief · UX RESET 03.
 *
 * Yesterday's count + today's pending approvals + a single honest
 * suggestion. All from real local stores.
 */

export function MorningBriefCard() {
  const [b, setB] = useState<MorningBrief>(() => readMorningBrief());

  useEffect(() => {
    const refresh = () => setB(readMorningBrief());
    const t = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Morning Brief</span>
        </div>
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
          local timezone · yesterday 00:00 → today 00:00
        </span>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-md border border-white/8 bg-white/[0.012] p-3">
          <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
            yesterday
          </div>
          <ul className="flex flex-col gap-0.5 font-mono text-[11.5px]">
            <Row k="missions" v={b.yesterday.missions} />
            <Row k="receipts" v={b.yesterday.receipts} />
            <Row k="imports" v={b.yesterday.imports} />
            <Row k="snapshots" v={b.yesterday.snapshots} />
          </ul>
        </div>

        <div className="flex flex-col gap-2 rounded-md border border-white/8 bg-white/[0.012] p-3">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
            now
          </div>
          <ul className="flex flex-col gap-0.5 font-mono text-[11.5px]">
            <Row k="pending approvals" v={b.pendingApprovals} tone={b.pendingApprovals > 0 ? "warn" : "ok"} />
            <Row k="health" v={`${b.healthPct}%`} tone={b.healthPct >= 75 ? "ok" : b.healthPct >= 50 ? "warn" : "bad"} />
          </ul>
          {b.suggestion && (
            <div className="mt-1 rounded-md border border-accent/25 bg-accent/[0.06] px-2 py-1 font-mono text-[10.5px] text-accent">
              suggestion · {b.suggestion}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Row({
  k,
  v,
  tone
}: {
  k: string;
  v: number | string;
  tone?: "ok" | "warn" | "bad";
}) {
  const valueCls =
    tone === "ok"
      ? "text-emerald-200"
      : tone === "warn"
        ? "text-amber-200"
        : tone === "bad"
          ? "text-rose-200"
          : "text-white/85";
  return (
    <li className="flex items-center justify-between">
      <span className="uppercase tracking-[0.18em] text-white/45">{k}</span>
      <span className={`tabular-nums ${valueCls}`}>{v}</span>
    </li>
  );
}
