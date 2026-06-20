"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { AlertTriangle, CalendarClock, ShieldAlert, TrendingUp } from "lucide-react";
import { useCryptoFeed } from "@/services/marketFeed";
import { NeedsSetupBanner } from "@/components/market-lab/DecisionSupportPanels";

interface Item { title: string; why: string; source: string; impact: 1 | 2 | 3; confidence: 1 | 2 | 3; }
const IMPACT_LABEL: Record<Item["impact"], string> = { 1: "low", 2: "med", 3: "high" };
const CONF_LABEL: Record<Item["confidence"], string> = { 1: "low", 2: "med", 3: "high" };

export default function MarketBriefingPage() {
  const crypto = useCryptoFeed();

  const { risks, opportunities } = useMemo(() => {
    const r: Item[] = [];
    const o: Item[] = [];
    for (const q of crypto.quotes) {
      if (q.change24h == null) continue;
      if (q.change24h <= -5) {
        r.push({
          title: `${q.symbol} down ${q.change24h.toFixed(2)}% in 24h`,
          why: "Large drawdown — review positioning and watch funding/liquidations if leveraged.",
          source: "CoinGecko · 24h %",
          impact: q.change24h <= -10 ? 3 : 2,
          confidence: 3
        });
      } else if (q.change24h >= 5) {
        o.push({
          title: `${q.symbol} up ${q.change24h.toFixed(2)}% in 24h`,
          why: "Notable strength — consider relative-strength setups or trim into momentum.",
          source: "CoinGecko · 24h %",
          impact: q.change24h >= 10 ? 3 : 2,
          confidence: 3
        });
      }
    }
    return { risks: r, opportunities: o };
  }, [crypto.quotes]);

  return (
    <div className="mx-auto flex h-full w-full max-w-[1200px] min-w-0 flex-col gap-4 overflow-y-auto overflow-x-hidden px-6 py-6">
      <header className="flex max-w-full min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-[24px] font-semibold leading-tight text-white">Market Briefing</h1>
          <p className="max-w-2xl text-[13px] leading-relaxed text-white/55">
            Today&apos;s risks, opportunities, and what&apos;s ahead. Each item is sourced and ranked by impact and confidence. Macro calendar items appear once an economic-calendar connector is added.
          </p>
        </div>
      </header>

      <section className="flex min-w-0 flex-col gap-2 rounded-lg border border-rose-400/20 bg-rose-500/[0.04] p-3">
        <SectionHeader title="Current risks" icon={AlertTriangle} count={risks.length} />
        {crypto.state !== "ok" && <NeedsSetupBanner message="CoinGecko feed offline · most risk surfacing depends on the live crypto feed." />}
        {risks.length === 0 ? (
          <EmptyCell message="No risks above threshold right now." />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {risks.map((r, i) => <ItemRow key={`r-${i}`} item={r} tone="bad" />)}
          </ul>
        )}
      </section>

      <section className="flex min-w-0 flex-col gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/[0.04] p-3">
        <SectionHeader title="Current opportunities" icon={TrendingUp} count={opportunities.length} />
        {opportunities.length === 0 ? (
          <EmptyCell message="No opportunities above threshold right now." />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {opportunities.map((o, i) => <ItemRow key={`o-${i}`} item={o} tone="ok" />)}
          </ul>
        )}
      </section>

      <section className="flex min-w-0 flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.012] p-3">
        <SectionHeader title="Upcoming events" icon={CalendarClock} count={0} />
        <NeedsSetupBanner message="FOMC · CPI · earnings · ETF decisions need an economic-calendar source (TradingEconomics, ForexFactory, etc.). Not wired today — we will not invent dates." />
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
          {["FOMC", "CPI", "Earnings", "ETF decisions"].map((k) => (
            <div key={k} className="flex flex-col gap-0.5 rounded border border-dashed border-white/12 bg-white/[0.012] px-2 py-1.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/55">{k}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">needs setup</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, icon: Icon, count }: { title: string; icon: typeof AlertTriangle; count: number }) {
  return (
    <header className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/85">
        <Icon className="h-3 w-3 text-accent" />
        {title}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">{count} item{count === 1 ? "" : "s"}</span>
    </header>
  );
}

function EmptyCell({ message }: { message: string }) {
  return (
    <p className="rounded border border-dashed border-white/10 bg-white/[0.012] px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-white/45">
      {message}
    </p>
  );
}

function ItemRow({ item, tone }: { item: Item; tone: "ok" | "bad" }) {
  return (
    <li className={clsx(
      "flex min-w-0 flex-col gap-1 rounded border px-2 py-1.5",
      tone === "bad" ? "border-rose-400/25 bg-rose-500/[0.04]" : "border-emerald-400/25 bg-emerald-500/[0.04]"
    )}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 truncate text-[12px] font-medium text-white">{item.title}</span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-white/55">
          <Pill label={`impact ${IMPACT_LABEL[item.impact]}`} />
          <Pill label={`conf ${CONF_LABEL[item.confidence]}`} />
        </span>
      </div>
      <span className="min-w-0 text-[11px] leading-snug text-white/75">{item.why}</span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">source · {item.source}</span>
    </li>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-white/75">
      {label}
    </span>
  );
}
