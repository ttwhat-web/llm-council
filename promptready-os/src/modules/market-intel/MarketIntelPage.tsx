"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Brain, ExternalLink, LineChart, Newspaper, Users } from "lucide-react";
import { binancePairFor, fetchKlines, type Candle } from "@/services/providers/binance";
import { useCryptoFeed } from "@/services/marketFeed";
import { fetchNewsBest, timeAgo, type NewsItem } from "@/services/providers/news";
import { NeedsSetupBanner } from "@/components/market-lab/DecisionSupportPanels";

const SYMBOLS = ["BTC", "ETH", "SOL", "AAPL", "TSLA", "NVDA", "GOLD", "EURUSD"] as const;
type SymbolKey = (typeof SYMBOLS)[number];

interface PriceMove { h1: number | null; h4: number | null; d1: number | null; d7: number | null; }

function pctChange(candles: Candle[], lookback: number): number | null {
  if (candles.length === 0) return null;
  const last = candles[candles.length - 1];
  const ref = candles[Math.max(0, candles.length - 1 - lookback)];
  if (!last || !ref || ref.close === 0) return null;
  return ((last.close - ref.close) / ref.close) * 100;
}

export default function MarketIntelPage() {
  const [symbol, setSymbol] = useState<SymbolKey>("BTC");
  const [klines, setKlines] = useState<Candle[]>([]);
  const [klinesErr, setKlinesErr] = useState<string | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsErr, setNewsErr] = useState<string | null>(null);
  const crypto = useCryptoFeed();
  const pair = binancePairFor(symbol);

  useEffect(() => {
    let cancelled = false;
    if (!pair) { setKlines([]); setKlinesErr("no source"); return; }
    void fetchKlines(pair, "1h", 200).then((r) => {
      if (cancelled) return;
      if (r.ok) { setKlines(r.candles); setKlinesErr(null); }
      else { setKlines([]); setKlinesErr(r.error ?? "fetch failed"); }
    });
    return () => { cancelled = true; };
  }, [pair]);

  useEffect(() => {
    let cancelled = false;
    void fetchNewsBest("Markets", 6).then((r) => {
      if (cancelled) return;
      if (r.ok) { setNews(r.items); setNewsErr(null); }
      else { setNews([]); setNewsErr(r.error ?? "fetch failed"); }
    });
    return () => { cancelled = true; };
  }, [symbol]);

  const moves: PriceMove = useMemo(() => ({
    h1: pctChange(klines, 1),
    h4: pctChange(klines, 4),
    d1: pctChange(klines, 24),
    d7: pctChange(klines, 24 * 7)
  }), [klines]);

  const correlated = useMemo(
    () => crypto.quotes.filter((q) => q.symbol !== symbol).slice(0, 4).map((q) => ({ symbol: q.symbol, change: q.change24h ?? null })),
    [crypto.quotes, symbol]
  );

  return (
    <div className="mx-auto flex h-full w-full max-w-[1280px] min-w-0 flex-col gap-4 overflow-y-auto overflow-x-hidden px-6 py-6">
      <header className="flex max-w-full min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-[24px] font-semibold leading-tight text-white">Market Intel</h1>
          <p className="max-w-2xl text-[13px] leading-relaxed text-white/55">
            Pick an asset and Operator Center assembles the picture: what moved, what likely drove it, and what to watch next. Every claim is sourced. If a source isn&apos;t connected, the section says so plainly.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSymbol(s)}
              className={clsx(
                "rounded border px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider transition",
                s === symbol ? "border-accent/40 bg-accent/[0.1] text-accent" : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <Section title="1 · Price Move" icon={LineChart} source={pair ? `Binance · ${pair} · 1h candles` : "no Binance pair"}>
        {pair ? (
          <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
            <Bucket label="1h" value={moves.h1} />
            <Bucket label="4h" value={moves.h4} />
            <Bucket label="24h" value={moves.d1} />
            <Bucket label="7d" value={moves.d7} />
          </div>
        ) : (
          <NeedsSetupBanner message={`${symbol} · needs a market data provider (TwelveData, FMP, etc.) before we can compute price moves.`} />
        )}
        {pair && klinesErr && <NeedsSetupBanner message={`Binance fetch failed · ${klinesErr}`} />}
      </Section>

      <Section title="2 · News Drivers" icon={Newspaper} source="HackerNews / NewsAPI fallback">
        {newsErr ? <NeedsSetupBanner message={`News fetch failed · ${newsErr}`} /> : news.length === 0 ? (
          <NeedsSetupBanner message="No headlines available right now. NewsAPI key would expand coverage." />
        ) : (
          <ul className="flex flex-col gap-1">
            {news.slice(0, 5).map((n, i) => (
              <li key={`${i}-${n.title.slice(0, 24)}`}>
                <a href={n.url ?? "#"} target="_blank" rel="noopener noreferrer" className="flex w-full min-w-0 items-center justify-between gap-2 rounded border border-white/8 bg-white/[0.012] px-2 py-1 text-left transition hover:border-accent/30 hover:bg-accent/[0.05]">
                  <span className="min-w-0 truncate text-[11.5px] text-white/90">{n.title}</span>
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-white/40">{n.source} · {timeAgo(n.time)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="3 · Order Flow Drivers" icon={LineChart} source="adapter required">
        <NeedsSetupBanner message="Funding · Open Interest · Liquidations · Volume spikes need a derivatives source (Binance futures, Coinglass, etc.). Until then we won't guess." />
        <div className="mt-1 grid grid-cols-2 gap-1.5 md:grid-cols-4">
          {["funding", "open interest", "liquidations", "volume spike"].map((k) => <NeedsSetupCell key={k} label={k} />)}
        </div>
      </Section>

      <Section title="4 · Social Drivers" icon={Users} source="adapter required">
        <NeedsSetupBanner message="X / Twitter and Reddit sentiment require an authenticated API + topic mapping. Not wired today." />
        <div className="mt-1 grid grid-cols-2 gap-1.5 md:grid-cols-3">
          {["X mentions", "Reddit mentions", "Sentiment direction"].map((k) => <NeedsSetupCell key={k} label={k} />)}
        </div>
      </Section>

      <Section title="5 · Correlated Assets" icon={LineChart} source="CoinGecko · 24h % for crypto only">
        {crypto.state !== "ok" || correlated.length === 0 ? (
          <NeedsSetupBanner message="CoinGecko feed offline or empty · equity/FX correlations need a separate provider." />
        ) : (
          <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
            {correlated.map((c) => <Bucket key={c.symbol} label={c.symbol} value={c.change} />)}
          </div>
        )}
      </Section>

      <Section title="6 · AI Explanation" icon={Brain} source="provider required">
        <NeedsSetupBanner message="We won't summarize a story we can't source. Connect an AI provider (OpenAI / Anthropic / local Ollama) in Settings · Providers to unlock a one-paragraph 'why this moved' here." />
        <a href="/settings" className="inline-flex w-fit items-center gap-1 rounded border border-accent/40 bg-accent/[0.1] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15]">
          <ExternalLink className="h-3 w-3" /> open settings · providers
        </a>
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, source, children }: { title: string; icon: typeof Brain; source: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.012] p-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/85">
          <Icon className="h-3 w-3 text-accent" />
          {title}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">source · {source}</span>
      </header>
      {children}
    </section>
  );
}

function Bucket({ label, value }: { label: string; value: number | null }) {
  const up = value != null && value >= 0;
  return (
    <div className={clsx(
      "flex flex-col gap-0.5 rounded border px-2 py-1.5",
      value == null
        ? "border-white/10 bg-white/[0.012] text-white/55"
        : up
          ? "border-emerald-400/25 bg-emerald-500/[0.05] text-emerald-200"
          : "border-rose-400/25 bg-rose-500/[0.06] text-rose-200"
    )}>
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/55">{label}</span>
      <span className="font-mono text-[14px] tabular-nums">{value == null ? "—" : `${up ? "+" : ""}${value.toFixed(2)}%`}</span>
    </div>
  );
}

function NeedsSetupCell({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded border border-dashed border-white/12 bg-white/[0.012] px-2 py-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/55">{label}</span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">needs setup</span>
    </div>
  );
}
