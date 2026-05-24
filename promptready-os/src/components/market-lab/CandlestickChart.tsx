"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp
} from "lightweight-charts";
import {
  fetchKlines,
  binancePairFor,
  type Candle,
  type BinanceInterval
} from "@/services/providers/binance";

const INTERVALS: Array<{ id: BinanceInterval; label: string }> = [
  { id: "1m", label: "1m" },
  { id: "5m", label: "5m" },
  { id: "15m", label: "15m" },
  { id: "1h", label: "1h" },
  { id: "4h", label: "4h" },
  { id: "1d", label: "1D" },
  { id: "1w", label: "1W" }
];

interface Props {
  symbol: string;
  height?: number;
}

interface State {
  loading: boolean;
  error: string | null;
  candles: Candle[];
  fetchedAt: number | null;
}

export function CandlestickChart({ symbol, height = 320 }: Props) {
  const pair = binancePairFor(symbol);
  const [interval, setInterval] = useState<BinanceInterval>("1h");
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    candles: [],
    fetchedAt: null
  });

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Create chart once.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const chart = createChart(el, {
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255,255,255,0.55)",
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 10
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" }
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.06, bottom: 0.28 }
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false
      },
      crosshair: {
        vertLine: { color: "rgba(124,155,255,0.4)", width: 1, style: 0 },
        horzLine: { color: "rgba(124,155,255,0.4)", width: 1, style: 0 }
      },
      autoSize: true
    });
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: "rgb(52,211,153)",
      downColor: "rgb(248,113,113)",
      borderUpColor: "rgb(52,211,153)",
      borderDownColor: "rgb(248,113,113)",
      wickUpColor: "rgb(52,211,153)",
      wickDownColor: "rgb(248,113,113)"
    });
    const vol = chart.addSeries(HistogramSeries, {
      color: "rgba(124,155,255,0.45)",
      priceFormat: { type: "volume" },
      priceScaleId: "vol"
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 }
    });
    chartRef.current = chart;
    candleRef.current = candle;
    volRef.current = vol;
    return () => {
      try {
        chart.remove();
      } catch {
        // ignore
      }
      chartRef.current = null;
      candleRef.current = null;
      volRef.current = null;
    };
  }, []);

  // Fetch klines on symbol or interval change.
  useEffect(() => {
    if (!pair) {
      setState({ loading: false, error: "no Binance pair", candles: [], fetchedAt: Date.now() });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    void fetchKlines(pair, interval, 500).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setState({ loading: false, error: null, candles: r.candles, fetchedAt: r.at });
      } else {
        setState({ loading: false, error: r.error ?? "fetch failed", candles: [], fetchedAt: r.at });
      }
    });
    const t = window.setInterval(() => {
      if (cancelled || !pair) return;
      void fetchKlines(pair, interval, 500).then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setState({ loading: false, error: null, candles: r.candles, fetchedAt: r.at });
        }
      });
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [pair, interval]);

  // Push data when state changes.
  useEffect(() => {
    const c = candleRef.current;
    const v = volRef.current;
    if (!c || !v) return;
    if (!state.candles.length) {
      c.setData([]);
      v.setData([]);
      return;
    }
    const cdata = state.candles.map((k) => ({
      time: Math.floor(k.t / 1000) as UTCTimestamp,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close
    }));
    const vdata = state.candles.map((k) => ({
      time: Math.floor(k.t / 1000) as UTCTimestamp,
      value: k.volume,
      color:
        k.close >= k.open
          ? "rgba(52,211,153,0.35)"
          : "rgba(248,113,113,0.35)"
    }));
    c.setData(cdata);
    v.setData(vdata);
    chartRef.current?.timeScale().fitContent();
  }, [state.candles]);

  const last = state.candles[state.candles.length - 1];

  return (
    <div className="flex h-full flex-col gap-1.5">
      {/* header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/80">
            {symbol}{pair ? "/USDT" : ""}
          </span>
          {last && (
            <span
              className={clsx(
                "rounded border px-1.5 py-px font-mono text-[10.5px] tabular-nums",
                last.close >= last.open
                  ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-300"
                  : "border-rose-400/30 bg-rose-500/[0.08] text-rose-300"
              )}
            >
              {last.close.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div
            role="tablist"
            aria-label="Candle interval"
            className="flex items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.03] p-0.5"
          >
            {INTERVALS.map((iv) => {
              const active = iv.id === interval;
              return (
                <button
                  key={iv.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setInterval(iv.id)}
                  title={`Candle interval ${iv.label} · Binance · WORKS`}
                  className={clsx(
                    "rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
                    active ? "bg-accent/[0.18] text-accent" : "text-white/55 hover:bg-white/[0.07]"
                  )}
                >
                  {iv.label}
                </button>
              );
            })}
          </div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
            {state.loading
              ? "loading…"
              : state.error
                ? state.error
                : state.fetchedAt
                  ? `binance · ${new Date(state.fetchedAt).toLocaleTimeString()}`
                  : "binance"}
          </span>
        </div>
      </div>

      {/* chart */}
      {pair ? (
        <div
          ref={wrapRef}
          className="w-full overflow-hidden rounded-md border border-white/8 bg-black/40"
          style={{ height }}
        />
      ) : (
        <AdapterCell text={`no Binance pair for ${symbol}`} subtext="OHLC adapter-ready · equities/FX/commodities pending provider" h={height} />
      )}
    </div>
  );
}

function AdapterCell({ text, subtext, h }: { text: string; subtext: string; h: number }) {
  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-white/12 bg-white/[0.012] text-center"
      style={{ height: h }}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
        {text}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
        {subtext}
      </span>
    </div>
  );
}
