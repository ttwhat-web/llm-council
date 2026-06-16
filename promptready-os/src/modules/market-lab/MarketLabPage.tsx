"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { AdvancedTradingChart } from "@/components/market-lab/AdvancedTradingChart";
import { useCryptoFeed, useNewsFeed } from "@/services/marketFeed";
import { binancePairFor, fetchKlines, type Candle } from "@/services/providers/binance";

/**
 * Markets · single workspace.
 *
 * One chart, one rail, one drawer. No tabs spawning subroutes, no
 * dense dev-dashboard density. Inspired by Linear / Arc / Granola
 * surfaces: generous spacing, calm typography, one focal point.
 *
 * Right rail tabs (Intel / Replay / Briefing / Alerts) live INSIDE
 * this workspace — no route hopping. Each tab shows the highlights
 * of the underlying real data; nothing is fabricated.
 */

const WATCHLIST: string[] = ["BTC", "ETH", "SOL", "BNB", "XRP", "AAPL", "TSLA", "NVDA"];

type RightTab = "intel" | "replay" | "briefing" | "alerts";

const RIGHT_TABS: Array<{ id: RightTab; label: string }> = [
  { id: "intel", label: "Intel" },
  { id: "replay", label: "Replay" },
  { id: "briefing", label: "Briefing" },
  { id: "alerts", label: "Alerts" }
];

const SYMBOL_PARAM_KEY = "symbol";
const TAB_PARAM_KEY = "tab";
const SYMBOL_STORAGE_KEY = "operator.markets.symbol";
const RIGHT_TAB_KEY = "operator.markets.rightTab";

const VALID_TABS: RightTab[] = ["intel", "replay", "briefing", "alerts"];

function readStorage(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota */
  }
}

export default function MarketLabPage() {
  const initialSymbol = useMemo(() => {
    if (typeof window === "undefined") return "BTC";
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get(SYMBOL_PARAM_KEY);
    return (fromUrl ?? readStorage(SYMBOL_STORAGE_KEY, "BTC")).toUpperCase();
  }, []);

  const initialTab = useMemo<RightTab>(() => {
    if (typeof window === "undefined") return "intel";
    const fromUrl = new URL(window.location.href).searchParams.get(TAB_PARAM_KEY);
    if (fromUrl && (VALID_TABS as string[]).includes(fromUrl)) return fromUrl as RightTab;
    const stored = readStorage(RIGHT_TAB_KEY, "intel");
    return (VALID_TABS as string[]).includes(stored) ? (stored as RightTab) : "intel";
  }, []);

  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [rightTab, setRightTab] = useState<RightTab>(initialTab);

  useEffect(() => {
    writeStorage(SYMBOL_STORAGE_KEY, symbol);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set(SYMBOL_PARAM_KEY, symbol);
      window.history.replaceState({}, "", url.toString());
    }
  }, [symbol]);
  useEffect(() => writeStorage(RIGHT_TAB_KEY, rightTab), [rightTab]);

  // Layout · hero chart.
  //   * grid: 1fr main column + fixed 280px rail (max).
  //   * full height = whatever the shell hands us via h-full.
  //   * no symbol bar above the chart, no bottom drawer — those used
  //     to steal ~80px of vertical space. The chart now owns
  //     calc(100vh - header - small padding).
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 px-4 pt-2 pb-2 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="flex min-h-0 min-w-0 flex-col">
          <AdvancedTradingChart symbol={symbol} />
        </main>

        <aside className="flex min-h-0 min-w-0 flex-col gap-4 pb-1">
          <SymbolStrip symbol={symbol} />
          <Watchlist symbol={symbol} onSelect={setSymbol} />
          <RightTabBar active={rightTab} onChange={setRightTab} />
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {rightTab === "intel" && <IntelTab symbol={symbol} />}
            {rightTab === "replay" && <ReplayTab symbol={symbol} />}
            {rightTab === "briefing" && <BriefingTab />}
            {rightTab === "alerts" && <AlertsTab />}
          </div>
        </aside>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Symbol strip (lives in the right rail; the chart owns the hero area)
// ---------------------------------------------------------------------------

function SymbolStrip({ symbol }: { symbol: string }) {
  const crypto = useCryptoFeed();
  const quote = crypto.quotes.find((q) => q.symbol === symbol);
  const change = quote?.change24h ?? null;
  const up = change != null && change >= 0;
  return (
    <header className="flex min-w-0 flex-col gap-1 pt-1">
      <span className="flex items-baseline gap-2">
        <h1 className="text-[18px] font-semibold leading-none text-white">{symbol}</h1>
        {quote?.price != null && (
          <span className="text-[13px] tabular-nums text-white/65">
            ${quote.price.toLocaleString()}
          </span>
        )}
      </span>
      {change != null && (
        <span
          className={clsx(
            "text-[12px] font-medium tabular-nums",
            up ? "text-emerald-300" : "text-rose-300"
          )}
        >
          {up ? "+" : ""}
          {change.toFixed(2)}% · 24h
        </span>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------

function Watchlist({ symbol, onSelect }: { symbol: string; onSelect: (s: string) => void }) {
  const crypto = useCryptoFeed();
  return (
    <section className="flex flex-col gap-2">
      <RailHeading>Watchlist</RailHeading>
      <ul className="flex flex-col">
        {WATCHLIST.map((s, i) => {
          const q = crypto.quotes.find((x) => x.symbol === s);
          const change = q?.change24h ?? null;
          const up = change != null && change >= 0;
          const active = s === symbol;
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => onSelect(s)}
                className={clsx(
                  "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition",
                  active ? "bg-white/[0.05]" : "hover:bg-white/[0.03]",
                  i > 0 && "mt-[1px]"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={clsx(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      change == null
                        ? "bg-white/15"
                        : up
                          ? "bg-emerald-300/80"
                          : "bg-rose-300/80"
                    )}
                  />
                  <span className={clsx("text-[13.5px]", active ? "text-white" : "text-white/80")}>{s}</span>
                </span>
                <span className="flex items-baseline gap-2">
                  {q?.price != null && (
                    <span className="text-[12px] tabular-nums text-white/55">${formatPrice(q.price)}</span>
                  )}
                  <span
                    className={clsx(
                      "min-w-[3.25rem] text-right text-[12px] tabular-nums",
                      change == null ? "text-white/30" : up ? "text-emerald-300" : "text-rose-300"
                    )}
                  >
                    {change == null ? "—" : `${up ? "+" : ""}${change.toFixed(2)}%`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

// ---------------------------------------------------------------------------
// Right rail tabs
// ---------------------------------------------------------------------------

function RightTabBar({ active, onChange }: { active: RightTab; onChange: (t: RightTab) => void }) {
  return (
    <nav className="flex items-center gap-4 border-b border-white/[0.06]">
      {RIGHT_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={clsx(
            "relative -mb-px py-2 text-[13px] font-medium transition",
            active === t.id ? "text-white" : "text-white/45 hover:text-white/75"
          )}
        >
          {t.label}
          {active === t.id && (
            <span aria-hidden className="absolute -bottom-px left-0 right-0 h-px bg-white" />
          )}
        </button>
      ))}
    </nav>
  );
}

function IntelTab({ symbol }: { symbol: string }) {
  const pair = binancePairFor(symbol);
  const [candles, setCandles] = useState<Candle[]>([]);
  const news = useNewsFeed();

  useEffect(() => {
    let cancelled = false;
    if (!pair) {
      setCandles([]);
      return;
    }
    void fetchKlines(pair, "1h", 200).then((r) => {
      if (!cancelled && r.ok) setCandles(r.candles);
    });
    return () => {
      cancelled = true;
    };
  }, [pair]);

  const moves = useMemo(() => {
    const pct = (lookback: number): number | null => {
      if (candles.length === 0) return null;
      const last = candles[candles.length - 1];
      const ref = candles[Math.max(0, candles.length - 1 - lookback)];
      if (!last || !ref || ref.close === 0) return null;
      return ((last.close - ref.close) / ref.close) * 100;
    };
    return { h1: pct(1), h4: pct(4), d1: pct(24), d7: pct(24 * 7) };
  }, [candles]);

  return (
    <div className="flex flex-col gap-5 pt-4">
      <Block title="Move">
        {pair ? (
          <div className="grid grid-cols-4 gap-2">
            {[
              ["1h", moves.h1],
              ["4h", moves.h4],
              ["24h", moves.d1],
              ["7d", moves.d7]
            ].map(([label, val]) => (
              <PctCell key={label as string} label={label as string} value={val as number | null} />
            ))}
          </div>
        ) : (
          <EmptyHint text={`${symbol} · needs a market-data provider for price-move math.`} />
        )}
      </Block>

      <Block title="News">
        {news.items.length === 0 ? (
          <EmptyHint text={news.state === "ok" ? "No headlines right now." : "News feed offline."} />
        ) : (
          <ul className="flex flex-col gap-2">
            {news.items.slice(0, 4).map((n, i) => (
              <li key={`${i}-${n.title.slice(0, 20)}`}>
                <a
                  href={n.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 transition hover:bg-white/[0.03]"
                >
                  <span className="line-clamp-2 text-[13px] leading-snug text-white/85">{n.title}</span>
                  <span className="text-[11.5px] text-white/40">{n.source}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Why drivers">
        <EmptyHint text="Funding · OI · liquidations · social need provider setup. We won't guess." />
      </Block>
    </div>
  );
}

function ReplayTab({ symbol }: { symbol: string }) {
  const pair = binancePairFor(symbol);
  const [candles, setCandles] = useState<Candle[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!pair) {
      setCandles([]);
      return;
    }
    void fetchKlines(pair, "15m", 96).then((r) => {
      if (!cancelled && r.ok) setCandles(r.candles);
    });
    return () => {
      cancelled = true;
    };
  }, [pair]);

  const events = useMemo(() => buildReplayEvents(candles), [candles]);

  return (
    <div className="flex flex-col gap-5 pt-4">
      <Block title="Last 24h timeline">
        {!pair ? (
          <EmptyHint text={`${symbol} · no Binance pair, replay unavailable.`} />
        ) : candles.length === 0 ? (
          <EmptyHint text="Loading candles…" />
        ) : events.length === 0 ? (
          <EmptyHint text="No notable swings or volume spikes in 24h." />
        ) : (
          <ul className="flex flex-col gap-1">
            {events.slice(0, 6).map((e, i) => (
              <li
                key={`${e.t}-${i}`}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white/[0.03]"
              >
                <span
                  className={clsx(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    e.kind === "up" ? "bg-emerald-300/80" : e.kind === "down" ? "bg-rose-300/80" : "bg-white/40"
                  )}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[12.5px] text-white/85">{e.label}</span>
                  <span className="text-[11px] text-white/40">{new Date(e.t).toLocaleString()}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </div>
  );
}

function BriefingTab() {
  const crypto = useCryptoFeed();
  const { risks, opps } = useMemo(() => {
    const r: Array<{ symbol: string; change: number }> = [];
    const o: Array<{ symbol: string; change: number }> = [];
    for (const q of crypto.quotes) {
      if (q.change24h == null) continue;
      if (q.change24h <= -5) r.push({ symbol: q.symbol, change: q.change24h });
      else if (q.change24h >= 5) o.push({ symbol: q.symbol, change: q.change24h });
    }
    return { risks: r.sort((a, b) => a.change - b.change), opps: o.sort((a, b) => b.change - a.change) };
  }, [crypto.quotes]);

  return (
    <div className="flex flex-col gap-5 pt-4">
      <Block title="Risks">
        {risks.length === 0 ? (
          <EmptyHint text="Nothing past the −5% threshold." />
        ) : (
          <ul className="flex flex-col gap-1">
            {risks.slice(0, 4).map((r) => (
              <SignalRow key={r.symbol} symbol={r.symbol} change={r.change} tone="bad" />
            ))}
          </ul>
        )}
      </Block>
      <Block title="Opportunities">
        {opps.length === 0 ? (
          <EmptyHint text="Nothing past the +5% threshold." />
        ) : (
          <ul className="flex flex-col gap-1">
            {opps.slice(0, 4).map((o) => (
              <SignalRow key={o.symbol} symbol={o.symbol} change={o.change} tone="ok" />
            ))}
          </ul>
        )}
      </Block>
      <Block title="Today's events">
        <EmptyHint text="Economic calendar needs a provider. We won't invent dates." />
      </Block>
    </div>
  );
}

function AlertsTab() {
  return (
    <div className="flex flex-col gap-5 pt-4">
      <Block title="Watch rules">
        <EmptyHint text="No rules yet. The evaluator that fires them is coming." />
      </Block>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable bits
// ---------------------------------------------------------------------------

function RailHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[13px] font-medium tracking-tight text-white/45">{children}</h2>;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[12px] font-medium uppercase tracking-wider text-white/35">{title}</h3>
      {children}
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-[12.5px] leading-relaxed text-white/45">{text}</p>;
}

function PctCell({ label, value }: { label: string; value: number | null }) {
  const up = value != null && value >= 0;
  return (
    <div className="flex flex-col items-start gap-0.5 rounded-md bg-white/[0.018] px-2.5 py-2">
      <span className="text-[10.5px] uppercase tracking-wider text-white/40">{label}</span>
      <span
        className={clsx(
          "text-[14px] font-medium tabular-nums",
          value == null ? "text-white/35" : up ? "text-emerald-300" : "text-rose-300"
        )}
      >
        {value == null ? "—" : `${up ? "+" : ""}${value.toFixed(2)}%`}
      </span>
    </div>
  );
}

function SignalRow({ symbol, change, tone }: { symbol: string; change: number; tone: "ok" | "bad" }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-white/[0.03]">
      <span className="flex items-center gap-2">
        <span
          className={clsx("h-1.5 w-1.5 rounded-full", tone === "ok" ? "bg-emerald-300/80" : "bg-rose-300/80")}
        />
        <span className="text-[13px] text-white/85">{symbol}</span>
      </span>
      <span
        className={clsx(
          "text-[12.5px] tabular-nums",
          tone === "ok" ? "text-emerald-300" : "text-rose-300"
        )}
      >
        {change >= 0 ? "+" : ""}
        {change.toFixed(2)}%
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Replay events
// ---------------------------------------------------------------------------

interface ReplayEvent {
  t: number;
  kind: "up" | "down" | "vol";
  label: string;
}

function buildReplayEvents(candles: Candle[]): ReplayEvent[] {
  if (candles.length < 8) return [];
  const volMed = median(candles.slice(-60).map((c) => c.volume));
  const events: ReplayEvent[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const pct = ((c.close - prev.close) / prev.close) * 100;
    if (pct >= 1.5)
      events.push({ t: c.t, kind: "up", label: `Swing up · +${pct.toFixed(2)}%` });
    else if (pct <= -1.5)
      events.push({ t: c.t, kind: "down", label: `Swing down · ${pct.toFixed(2)}%` });
    if (volMed > 0 && c.volume >= volMed * 2)
      events.push({
        t: c.t,
        kind: "vol",
        label: `Volume spike · ${(c.volume / volMed).toFixed(1)}× median`
      });
  }
  return events.reverse().slice(0, 12);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

