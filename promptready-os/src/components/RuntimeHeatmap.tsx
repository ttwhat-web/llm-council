"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { readRuntimeHeat, type RuntimeHeat } from "@/services/operatorRank";

/**
 * Runtime Heatmap · UX RESET 03.
 *
 * Read-only horizontal bars per runtime · scaled against the max
 * counter so the operator sees relative weight at a glance. No
 * animation · no fake values.
 */

const BLOCK = "▒";
const MAX_BLOCKS = 12;

export function RuntimeHeatmap() {
  const [rows, setRows] = useState<RuntimeHeat[]>(() => readRuntimeHeat());

  useEffect(() => {
    const refresh = () => setRows(readRuntimeHeat());
    const t = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(t);
  }, []);

  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-3.5 w-3.5 text-accent" />
          <span className="text-[13px] font-semibold text-white">Runtime Heatmap</span>
        </div>
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
          real local counters · no animation
        </span>
      </header>
      <ul className="flex flex-col gap-0.5 font-mono text-[11px]">
        {rows.map((r) => {
          const filled = Math.round((r.value / max) * MAX_BLOCKS);
          return (
            <li
              key={r.label}
              title={`${r.label} · ${r.value} · ${r.source}`}
              className="grid grid-cols-[80px_1fr_36px] items-center gap-2"
            >
              <span className="uppercase tracking-[0.18em] text-white/55">{r.label}</span>
              <span className="tracking-[0.05em] text-accent">
                {BLOCK.repeat(filled)}
                <span className="text-white/15">{BLOCK.repeat(MAX_BLOCKS - filled)}</span>
              </span>
              <span className="tabular-nums text-right text-white/75">{r.value}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
