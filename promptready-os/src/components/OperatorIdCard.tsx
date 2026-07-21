"use client";

import { useMemo } from "react";
import { Dna } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";

/**
 * Operator ID · UX RESET 02.
 *
 * Compact identity card · brain name, mode, runtime, and a real DNA
 * breakdown computed from mission history mode distribution.
 *
 * The DNA percentages are NOT invented. We sum recent receipts grouped
 * by mode, then normalize. With fewer than 3 receipts we show a
 * "needs missions" hint instead of fake numbers. When demo data is
 * loaded the card surfaces a clear DEMO badge.
 */

const MODE_LABEL: Record<string, string> = {
  builder: "Builder",
  researcher: "Researcher",
  founder: "Founder",
  operator: "Operator",
  trader: "Trader",
  architect: "Architect",
  dev: "Builder",
  business: "Operator",
  research: "Researcher",
  claude: "Builder",
  chatgpt: "Builder",
  cursor: "Builder",
  terminal: "Builder",
  general: "Operator",
  auto: "Operator",
  custom: "Custom"
};

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

interface DnaSlice {
  label: string;
  pct: number;
}

function computeDna(modes: string[]): DnaSlice[] {
  if (modes.length === 0) return [];
  const counts = new Map<string, number>();
  for (const m of modes) {
    const norm = MODE_LABEL[m.toLowerCase()] ?? "Operator";
    counts.set(norm, (counts.get(norm) ?? 0) + 1);
  }
  const total = modes.length;
  const slices = Array.from(counts.entries())
    .map(([label, n]) => ({ label, pct: Math.round((n / total) * 100) }))
    .sort((a, b) => b.pct - a.pct);
  // Normalize to exactly 100 to handle rounding drift.
  if (slices.length > 0) {
    const sum = slices.reduce((a, s) => a + s.pct, 0);
    slices[0].pct += 100 - sum;
  }
  return slices.slice(0, 4);
}

export function OperatorIdCard() {
  const identity = useBrainStore((s) => s.identity);
  const demo = useBrainStore((s) => s.demo);
  const history = useMissionStore((s) => s.history);

  const tier = readOperatorTier();
  const brain = identity?.name ?? "—";
  const mode = identity?.mode ? capitalize(identity.mode) : "—";

  const dna = useMemo(() => computeDna(history.map((m) => m.mode)), [history]);
  const hasEnough = history.length >= 3;

  return (
    <section className="rounded-2xl border border-accent/25 bg-accent/[0.04] p-4 shadow-glow">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dna className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Operator ID</span>
        </div>
        {demo && (
          <span className="rounded border border-accent/30 bg-accent/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-accent">
            demo
          </span>
        )}
      </header>

      <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1 font-mono text-[12px]">
        <dt className="text-[10px] uppercase tracking-[0.22em] text-white/40">operator</dt>
        <dd className="text-white">{tier}</dd>
        <dt className="text-[10px] uppercase tracking-[0.22em] text-white/40">brain</dt>
        <dd className={brain === "—" ? "text-white/40" : "text-white"}>{brain}</dd>
        <dt className="text-[10px] uppercase tracking-[0.22em] text-white/40">mode</dt>
        <dd className={mode === "—" ? "text-white/40" : "text-white"}>{mode}</dd>
      </dl>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
            DNA · from mission history
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
            {history.length} receipt{history.length === 1 ? "" : "s"}
          </span>
        </div>

        {hasEnough ? (
          <ul className="flex flex-col gap-1.5">
            {dna.map((s) => (
              <li key={s.label} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-white/85">{s.label}</span>
                  <span className="tabular-nums text-white/85">{s.pct}%</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-accent/80"
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-white/10 bg-white/[0.008] p-2 font-mono text-[10.5px] uppercase tracking-wider text-white/45">
            needs at least 3 missions · DNA emerges from real receipts
          </p>
        )}
      </div>
    </section>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
