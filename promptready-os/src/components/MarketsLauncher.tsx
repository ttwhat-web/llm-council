"use client";

import { Link } from "react-router-dom";
import { ArrowRight, Brain, LineChart, Rewind, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Markets launcher · premium card cluster for the home / cockpit
 * surfaces. Surfaces the four market workspaces with a one-sentence
 * reason to open each. No fake metrics, no live data — just clear
 * entry points into the real surfaces.
 */

interface Card {
  to: string;
  title: string;
  Icon: LucideIcon;
  blurb: string;
}

const CARDS: Card[] = [
  {
    to: "/markets",
    title: "Markets",
    Icon: LineChart,
    blurb: "Live chart workspace. TradingView in the hero slot."
  },
  {
    to: "/market-intel",
    title: "Market Intel",
    Icon: Brain,
    blurb: "Why a move happened — sourced and structured."
  },
  {
    to: "/move-replay",
    title: "Move Replay",
    Icon: Rewind,
    blurb: "Walk the last 24h / 7d / 30d as a single timeline."
  },
  {
    to: "/market-briefing",
    title: "Market Briefing",
    Icon: ShieldAlert,
    blurb: "Risks, opportunities, and what's ahead today."
  }
];

export function MarketsLauncher() {
  return (
    <section aria-label="Markets" className="flex min-w-0 flex-col gap-3">
      <header className="flex min-w-0 items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">markets</span>
          <h2 className="text-[16px] font-semibold leading-tight text-white">Market workspaces</h2>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group flex min-w-0 flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.012] px-4 py-3 transition hover:border-white/18 hover:bg-white/[0.035]"
          >
            <span className="flex min-w-0 items-center justify-between gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/[0.03] text-white/85 group-hover:text-accent">
                <c.Icon className="h-4 w-4" />
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-accent" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13.5px] font-medium text-white">{c.title}</span>
              <span className="text-[11.5px] leading-snug text-white/55">{c.blurb}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
