"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  createChart,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp
} from "lightweight-charts";
import {
  fetchCoinHistory,
  coinIdFromSymbol,
  type HistoryPoint
} from "@/services/providers/coingecko";

export type Timeframe = "1D" | "7D" | "30D" | "90D" | "1Y";

const TIMEFRAMES: Array<{ id: Timeframe; days: number; label: string }> = [
  { id: "1D", days: 1, label: "1D" },
  { id: "7D", days: 7, label: "7D" },
  { id: "30D", days: 30, label: "1M" },
  { id: "90D", days: 90, label: "3M" },
  { id: "1Y", days: 365, label: "1Y" }
];

interface Props {
  symbol: string;
  up: boolean;
  fullscreen?: boolean;
}

interface State {
  loading: boolean;
  error: string | null;
  points: HistoryPoint[];
  fetchedAt: number | null;
  source: string;
}

const INITIAL_STATE: State = {
  loading: true,
  error: null,
  points: [],
  fetchedAt: null,
  source: "CoinGecko · line (OHLC adapter-ready)"
};

export function PriceChartLW({ symbol, up, fullscreen = false }: Props) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [state, setState] = useState<State>(INITIAL_STATE);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Fetch data when symbol or timeframe changes.
  useEffect(() => {
    const id = coinIdFromSymbol(symbol);
    if (!id) {
      setState({
        loading: false,
        error: "no provider for this symbol",
        points: [],
        fetchedAt: Date.now(),
        source: "OHLC adapter-ready"
      });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    const days = TIMEFRAMES.find((t) => t.id === timeframe)?.days ?? 1;
    void fetchCoinHistory(id, days).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setState({
          loading: false,
          error: null,
          points: r.points,
          fetchedAt: r.at,
          source: "CoinGecko · line (OHLC adapter-ready)"
        });
      } else {
        setState({
          loading: false,
          error: r.error ?? "fetch failed",
          points: [],
          fetchedAt: r.at,
          source: "CoinGecko · line"
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe]);

  // Create chart once on mount.
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
        scaleMargins: { top: 0.08, bottom: 0.28 }
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false
      },
      crosshair: {
        vertLine: { color: "rgba(124,155,255,0.35)", width: 1, style: 0 },
        horzLine: { color: "rgba(124,155,255,0.35)", width: 1, style: 0 }
      },
      autoSize: true
    });
    const line = chart.addSeries(LineSeries, {
      color: up ? "rgb(52,211,153)" : "rgb(248,113,113)",
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true
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
    lineRef.current = line;
    volRef.current = vol;
    return () => {
      try {
        chart.remove();
      } catch {
        // ignore
      }
      chartRef.current = null;
      lineRef.current = null;
      volRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update color when trend changes.
  useEffect(() => {
    lineRef.current?.applyOptions({
      color: up ? "rgb(52,211,153)" : "rgb(248,113,113)"
    });
  }, [up]);

  // Push data when state changes.
  useEffect(() => {
    const line = lineRef.current;
    const vol = volRef.current;
    if (!line || !vol) return;
    if (!state.points.length) {
      line.setData([]);
      vol.setData([]);
      return;
    }
    // De-dupe and sort by time. Lightweight charts requires strictly
    // ascending unique timestamps.
    const seen = new Set<number>();
    const sorted = state.points
      .map((p) => ({ t: Math.floor(p.t / 1000) as UTCTimestamp, price: p.price, volume: p.volume }))
      .sort((a, b) => a.t - b.t)
      .filter((p) => {
        if (seen.has(p.t as number)) return false;
        seen.add(p.t as number);
        return true;
      });
    line.setData(sorted.map((p) => ({ time: p.t, value: p.price })));
    vol.setData(
      sorted.map((p) => ({
        time: p.t,
        value: p.volume,
        color:
          state.points[sorted.indexOf(sorted[0])] && p.price >= sorted[0].price
            ? "rgba(52,211,153,0.35)"
            : "rgba(248,113,113,0.35)"
      }))
    );
    chartRef.current?.timeScale().fitContent();
  }, [state.points]);

  const h = fullscreen ? 380 : 240;
  const last = state.points[state.points.length - 1] ?? null;
  const first = state.points[0] ?? null;
  const periodChange =
    first && last ? ((last.price - first.price) / first.price) * 100 : null;

  return (
    <div className="flex flex-col gap-1.5">
      {/* timeframe + status row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Chart timeframe"
          className="flex items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.03] p-0.5"
        >
          {TIMEFRAMES.map((tf) => {
            const active = tf.id === timeframe;
            return (
              <button
                key={tf.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTimeframe(tf.id)}
                title={`${tf.label} window · CoinGecko · WORKS`}
                className={clsx(
                  "rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
                  active
                    ? "bg-accent/[0.18] text-accent"
                    : "text-white/55 hover:bg-white/[0.07]"
                )}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider">
          {periodChange != null && (
            <span
              className={clsx(
                "tabular-nums",
                periodChange >= 0 ? "text-emerald-300" : "text-rose-300"
              )}
            >
              {periodChange >= 0 ? "+" : ""}
              {periodChange.toFixed(2)}% · {timeframe}
            </span>
          )}
          {state.loading && <span className="text-white/45">loading…</span>}
          {state.error && <span className="text-rose-300/80">{state.error}</span>}
          {!state.loading && !state.error && state.fetchedAt && (
            <span className="text-white/40">
              fetched {new Date(state.fetchedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* chart container */}
      <div
        ref={wrapRef}
        className="w-full overflow-hidden rounded-xl border border-white/8 bg-black/40"
        style={{ height: h }}
      />

      {/* footer line · honest source */}
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-white/40">
        <span>{state.source}</span>
        <span>volume · 24h rolling · same provider</span>
      </div>
    </div>
  );
}
