"use client";

import { useEffect, useState } from "react";
import { Briefcase, Building2, Users, User } from "lucide-react";

/**
 * Operator mode selector · Phase 25.
 *
 * Persisted local label · drives nothing yet but declares the operator
 * posture for future role / pricing / runtime gates.
 */

type Mode = "solo" | "team" | "agency" | "enterprise";

const MODES: Array<{ id: Mode; label: string; Icon: typeof User; blurb: string }> = [
  { id: "solo", label: "Solo Operator", Icon: User, blurb: "one operator · one brain · local-first" },
  { id: "team", label: "Team Operator", Icon: Users, blurb: "small team · shared spaces · role labels" },
  { id: "agency", label: "Agency", Icon: Briefcase, blurb: "multi-client brains · per-client receipts" },
  { id: "enterprise", label: "Enterprise", Icon: Building2, blurb: "audit · compliance · self-host · BYOK" }
];

const STORAGE_KEY = "promptready-os.operator-mode";

function load(): Mode {
  if (typeof window === "undefined") return "solo";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "solo" || raw === "team" || raw === "agency" || raw === "enterprise") return raw;
  } catch {
    // ignore
  }
  return "solo";
}

export function OperatorModeCard() {
  const [mode, setMode] = useState<Mode>(load);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Operator mode</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          declares posture · runtime gates ship with desktop
        </span>
      </header>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {MODES.map((m) => {
          const on = mode === m.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setMode(m.id)}
                className={
                  on
                    ? "flex w-full flex-col items-start gap-1 rounded-xl border border-accent/40 bg-accent/[0.08] p-3 shadow-glow"
                    : "flex w-full flex-col items-start gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:border-accent/25 hover:bg-white/[0.04]"
                }
              >
                <div className="flex items-center gap-1.5">
                  <m.Icon className={on ? "h-3.5 w-3.5 text-accent" : "h-3.5 w-3.5 text-white/65"} />
                  <span className={on ? "text-[12.5px] font-semibold text-white" : "text-[12.5px] text-white/85"}>
                    {m.label}
                  </span>
                </div>
                <span className="text-[11px] text-white/55">{m.blurb}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
