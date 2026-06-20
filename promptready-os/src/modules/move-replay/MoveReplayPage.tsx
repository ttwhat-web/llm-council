"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Clock, Newspaper, Rewind, TrendingDown, TrendingUp, Volume2 } from "lucide-react";
import { binancePairFor, fetchKlines, type Candle, type BinanceInterval } from "@/services/providers/binance";
import { NeedsSetupBanner } from "@/components/market-lab/DecisionSupportPanels";

const SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "TSLA"] as const;
const WINDOWS: Array<{ id: "24h" | "7d" | "30d"; label: string; interval: BinanceInterval; limit: number }> = [
  { id: "24h", label: "last 24h", interval: "15m", limit: 96 },
  { id: "7d", label: "last 7d", interval: "1h", limit: 168 },
  { id: "30d", label: "last 30d", interval: "4h", limit: 180 }
];

type EventKind = "swing-up" | "swing-down" | "volume-spike";
interface TimelineEvent { t: number; kind: EventKind; detail: string; }

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function buildEvents(candles: Candle[]): TimelineEvent[] {
  if (candles.length < 8) return [];
  const vols = candles.map((c) => c.volume);
  const volMed = median(vols.slice(-Math.min(60, vols.length)));
  const events: TimelineEvent[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const pct = ((c.close - prev.close) / prev.close) * 100;
    if (pct >= 1.5) {
      events.push({ t: c.t, kind: "swing-up", detail: `${prev.close.toLocaleString()} → ${c.close.toLocaleString()} (+${pct.toFixed(2)}%)` });
    } else if (pct <= -1.5) {
      events.push({ t: c.t, kind: "swing-down", detail: `${prev.close.toLocaleString()} → ${c.close.toLocaleString()} (${pct.toFixed(2)}%)` });
    }
    if (volMed > 0 && c.volume >= volMed * 2) {
      events.push({ t: c.t, kind: "volume-spike", detail: `${c.volume.toFixed(2)} vs ${volMed.toFixed(2)} median (${(c.volume / volMed).toFixed(2)}×)` });
    }
  }
  return events.slice(-30);
}

export default function MoveReplayPage() {
  const [symbol, setSymbol] = useState<(typeof SYMBOLS)[number]>("BTC");
  const [windowId, setWindowId] = useState<(typeof WINDOWS)[number]["id"]>("24h");
  const replayWindow = WINDOWS.find((w) => w.id === windowId)!;
  const pair = binancePairFor(symbol);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!pair) { setCandles([]); setErr("no Binance pair"); return; }
    void fetchKlines(pair, replayWindow.interval, replayWindow.limit).then((r) => {
      if (cancelled) return;
      if (r.ok) { setCandles(r.candles); setErr(null); }
      else { setCandles([]); setErr(r.error ?? "fetch failed"); }
    });
    return () => { cancelled = true; };
  }, [pair, replayWindow.interval, replayWindow.limit]);

  const events = useMemo(() => buildEvents(candles), [candles]);

  return (
    <div className="mx-auto flex h-full w-full max-w-[1180px] min-w-0 flex-col gap-4 overflow-y-auto overflow-x-hidden px-6 py-6">
      <header className="flex max-w-full min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-[24px] font-semibold leading-tight text-white">Move Replay</h1>
          <p className="max-w-2xl text-[13px] leading-relaxed text-white/55">
            Walk through an asset&apos;s recent move as a single timeline. Swings and volume spikes come from Binance candles. News pins and funding flips appear once their provider archives are connected.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <div className="flex items-center gap-0.5 rounded border border-white/10 bg-white/[0.03] p-0.5">
            {WINDOWS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWindowId(w.id)}
                className={clsx(
                  "rounded px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider transition",
                  windowId === w.id ? "bg-accent/[0.18] text-accent" : "text-white/55 hover:bg-white/[0.07]"
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {!pair && <NeedsSetupBanner message={`${symbol} · no Binance pair. Add a market data provider to enable replay for equities/FX.`} />}
      {pair && err && <NeedsSetupBanner message={`Binance fetch failed · ${err}`} />}

      <section className="flex min-w-0 flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.012] p-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/85">timeline · {pair ?? symbol} · {replayWindow.label}</span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">{events.length} event{events.length === 1 ? "" : "s"} · {candles.length} candles</span>
        </header>
        {!pair || candles.length === 0 ? (
          <p className="rounded border border-dashed border-white/10 bg-white/[0.012] px-2 py-2 font-mono text-[9.5px] uppercase tracking-wider text-white/45">
            no candles to replay · pick a Binance-supported symbol
          </p>
        ) : events.length === 0 ? (
          <p className="rounded border border-dashed border-white/10 bg-white/[0.012] px-2 py-2 font-mono text-[9.5px] uppercase tracking-wider text-white/45">
            no notable swings or volume spikes detected in {replayWindow.label.toLowerCase()}
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5 border-l border-white/10 pl-3">
            {events.map((e, i) => (
              <li key={`${e.t}-${i}`} className="relative flex min-w-0 flex-col gap-0.5 rounded border border-white/10 bg-white/[0.018] px-2 py-1.5">
                <span aria-hidden className="absolute -left-[7px] top-2 h-2 w-2 rounded-full bg-accent/80" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex shrink-0 items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-px font-mono text-[9.5px] uppercase tracking-wider text-white/85">
                    <Clock className="h-3 w-3" /> {new Date(e.t).toLocaleString("en-GB", { hour12: false })}
                  </span>
                  <span className={clsx(
                    "inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider",
                    e.kind === "swing-up"
                      ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
                      : e.kind === "swing-down"
                        ? "border-rose-400/30 bg-rose-500/[0.06] text-rose-200"
                        : "border-accent/30 bg-accent/[0.08] text-accent"
                  )}>
                    {e.kind === "swing-up" ? <TrendingUp className="h-3 w-3" /> : e.kind === "swing-down" ? <TrendingDown className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                    {e.kind === "swing-up" ? "swing up" : e.kind === "swing-down" ? "swing down" : "volume spike"}
                  </span>
                  <span className="min-w-0 truncate font-mono text-[11px] tabular-nums text-white/85">{e.detail}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <NeedsSetupCard icon={Newspaper} title="News pins" message="Time-pinned headlines need a historical news archive (NewsAPI everything endpoint, CryptoPanic). Not wired yet." />
        <NeedsSetupCard icon={TrendingDown} title="Funding flips" message="Funding rate archive needs a derivatives provider (Binance futures, Coinglass). Not wired yet." />
        <NeedsSetupCard icon={Rewind} title="Liquidation cascade" message="Liquidation events need futures aggregator. Not wired yet." />
      </section>
    </div>
  );
}

function NeedsSetupCard({ icon: Icon, title, message }: { icon: typeof Clock; title: string; message: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-dashed border-white/12 bg-white/[0.012] p-3">
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/85">
        <Icon className="h-3 w-3 text-accent" />
        {title}
      </span>
      <span className="text-[11px] leading-snug text-white/55">{message}</span>
      <span className="mt-auto font-mono text-[9px] uppercase tracking-wider text-amber-200/80">needs setup</span>
    </div>
  );
}
