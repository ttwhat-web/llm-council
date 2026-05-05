"use client";

import clsx from "clsx";
import { Check, Crown, Wrench, Zap } from "lucide-react";

interface Plan {
  id: "free" | "pro" | "operator";
  name: string;
  price: string;
  blurb: string;
  Icon: typeof Zap;
  features: string[];
  highlight?: boolean;
  cta: string;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    blurb: "Get a feel for the engine.",
    Icon: Zap,
    features: [
      "10 cloud fixes / day",
      "Rules engine — unlimited",
      "Basic modes (General, Claude, ChatGPT, Dev)",
      "Fast model only"
    ],
    cta: "Start free"
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12 / mo",
    blurb: "Daily-driver model quality + history.",
    Icon: Crown,
    highlight: true,
    features: [
      "Smart, Expert & Code models",
      "Unlimited modes",
      "Local prompt history",
      "Templates",
      "Output variants (Shorter / Stronger / Convert / …)",
      "Higher daily quota"
    ],
    cta: "Go Pro"
  },
  {
    id: "operator",
    name: "Operator",
    price: "$39 / mo",
    blurb: "Power users running real ops.",
    Icon: Wrench,
    features: [
      "Everything in Pro",
      "Terminal & AS400 modes with safety screen",
      "Local Ollama (Mac) — unlimited & private",
      "Floating desktop assistant",
      "Project folders (soon)"
    ],
    cta: "Talk to us"
  }
];

export function Pricing({ compact }: { compact?: boolean }) {
  return (
    <div className={clsx("flex flex-col gap-3", compact && "gap-2")}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-white/45">
        Plans
      </div>
      {PLANS.map((p) => (
        <PlanCard key={p.id} plan={p} compact={compact} />
      ))}
      <div className="text-[10px] text-white/35">
        Auth and billing are not yet enforced — every plan is free during the preview.
        The selector will start gating models once auth ships.
      </div>
    </div>
  );
}

function PlanCard({ plan, compact }: { plan: Plan; compact?: boolean }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border bg-white/[0.02] p-4 transition",
        plan.highlight
          ? "border-accent/30 shadow-glow"
          : "border-white/8 hover:border-white/14",
        compact && "p-3"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <plan.Icon
            className={clsx("h-4 w-4", plan.highlight ? "text-accent" : "text-white/65")}
          />
          <span className="text-sm font-semibold text-white">{plan.name}</span>
        </div>
        <span className="text-xs text-white/65">{plan.price}</span>
      </div>
      <div className="mt-1 text-[11px] text-white/50">{plan.blurb}</div>
      <ul className="mt-3 space-y-1.5 text-[12px] text-white/75">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check
              className={clsx(
                "mt-0.5 h-3.5 w-3.5 shrink-0",
                plan.highlight ? "text-accent" : "text-white/55"
              )}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled
        className={clsx(
          "mt-3 inline-flex w-full items-center justify-center rounded-xl px-3 py-1.5 text-xs font-medium transition",
          plan.highlight
            ? "bg-accent/90 text-white shadow-glow"
            : "border border-white/10 bg-white/[0.03] text-white/80",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {plan.cta}
      </button>
    </div>
  );
}
