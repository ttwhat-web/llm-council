"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, CreditCard } from "lucide-react";
import { PLANS, getCurrentPlan, setCurrentPlan, type PlanTier } from "@/services/plan";

/**
 * Plans card · Sprint I. Shows CORE / DESK / ELITE tiers and what each
 * unlocks. NO payments — early access keeps every feature unlocked. The
 * tier selector only changes which badges/labels the UI shows; it never
 * locks an existing user out (grandfathered). ELITE is "contact sales".
 */

export function PlansCard() {
  const [plan, setPlan] = useState<PlanTier>(() => getCurrentPlan());

  const choose = (t: PlanTier) => {
    setPlan(t);
    setCurrentPlan(t);
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Plans &amp; Access</span>
        </div>
        <span className="rounded border border-emerald-400/30 bg-emerald-500/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-emerald-200">
          early access · all unlocked
        </span>
      </header>

      <p className="text-[11px] text-white/55">
        Feature tiers · no payments yet. Early users stay fully unlocked — these
        badges just label which tier a surface belongs to. Pricing shown for
        reference; nothing is charged or locked.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {PLANS.map((p) => {
          const active = plan === p.id;
          return (
            <article
              key={p.id}
              className={clsx(
                "flex flex-col gap-2 rounded-xl border p-3",
                active
                  ? "border-accent/40 bg-accent/[0.05] shadow-glow"
                  : "border-white/8 bg-white/[0.012]"
              )}
            >
              <header className="flex items-center justify-between">
                <span
                  className={clsx(
                    "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]",
                    p.id === "core"
                      ? "border-white/15 bg-white/[0.04] text-white/70"
                      : p.id === "desk"
                        ? "border-accent/40 bg-accent/[0.1] text-accent"
                        : "border-amber-400/40 bg-amber-500/[0.1] text-amber-200"
                  )}
                >
                  {p.badge}
                </span>
                <span className="font-mono text-[10px] text-white/55">{p.priceMonthly}</span>
              </header>
              <div className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
                {p.priceYearly}
              </div>
              <p className="text-[10px] text-white/45">{p.target}</p>
              <ul className="flex max-h-[170px] flex-col gap-0.5 overflow-auto pr-1">
                {p.includes.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11px] text-white/75">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              {p.id === "elite" ? (
                <span className="mt-auto rounded-md border border-amber-400/30 bg-amber-500/[0.06] px-2 py-1 text-center font-mono text-[10px] uppercase tracking-wider text-amber-200">
                  contact sales · custom deployment
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => choose(p.id)}
                  className={clsx(
                    "mt-auto rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition",
                    active
                      ? "border-accent/40 bg-accent/[0.1] text-accent"
                      : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                  )}
                >
                  {active ? "current view" : `view as ${p.badge}`}
                </button>
              )}
            </article>
          );
        })}
      </div>
      <p className="font-mono text-[9px] uppercase tracking-wider text-white/35">
        "view as" only changes which tier badges show · it never locks features.
      </p>
    </section>
  );
}
