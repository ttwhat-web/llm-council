"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
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

export interface Overlay {
  kind: "line" | "bands";
  label: string;
  color: string;
  values?: number[];
  upper?: number[];
  mid?: number[];
  lower?: number[];
}

export interface HlineMain {
  value: number;
  label: string;
  color: string;
}

export interface RsiPane {
  plots: Array<{ values: number[]; label: string; color: string }>;
  hlines: Array<{ value: number; label: string; color: string }>;
}

interface Props {
  symbol: string;
  height?: number;
  /** Called once after each successful Binance fetch so a parent can run scripts. */
  onCandles?: (candles: Candle[]) => void;
  /** Indicator overlays drawn on the main chart. Tear-down on change. */
  overlays?: Overlay[];
  /** Horizontal lines pinned to the main candle price scale. */
  hlinesMain?: HlineMain[];
  /** Optional RSI-style lower pane. Null → not rendered. */
  rsi?: RsiPane | null;
}

interface State {
  loading: boolean;
  error: string | null;
  candles: Candle[];
  fetchedAt: number | null;
}

const CHART_LAYOUT = {
  background: { color: "transparent" } as const,
  textColor: "rgba(255,255,255,0.55)",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 10
};

const CHART_GRID = {
  vertLines: { color: "rgba(255,255,255,0.04)" },
  horzLines: { color: "rgba(255,255,255,0.04)" }
};

export function CandlestickChart({
  symbol,
  height = 320,
  onCandles,
  overlays,
  hlinesMain,
  rsi
}: Props) {
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
  const overlayRefs = useRef<ISeriesApi<"Line">[]>([]);
  const priceLineRefs = useRef<IPriceLine[]>([]);

  const rsiWrapRef = useRef<HTMLDivElement | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRefs = useRef<ISeriesApi<"Line">[]>([]);
  const rsiPriceLineRefs = useRef<IPriceLine[]>([]);

  // Track latest candle timestamps so we can align overlay points to them.
  const timestampsRef = useRef<UTCTimestamp[]>([]);

  // Create chart once.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const chart = createChart(el, {
      layout: CHART_LAYOUT,
      grid: CHART_GRID,
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
      overlayRefs.current = [];
      priceLineRefs.current = [];
    };
  }, []);

  // RSI pane chart lifecycle · only created when `rsi` is non-null.
  useEffect(() => {
    if (!rsi) {
      if (rsiChartRef.current) {
        try {
          rsiChartRef.current.remove();
        } catch {
          // ignore
        }
        rsiChartRef.current = null;
        rsiSeriesRefs.current = [];
        rsiPriceLineRefs.current = [];
      }
      return;
    }
    const el = rsiWrapRef.current;
    if (!el || rsiChartRef.current) return;
    const chart = createChart(el, {
      layout: CHART_LAYOUT,
      grid: CHART_GRID,
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
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
    rsiChartRef.current = chart;
  }, [rsi != null]);

  // Fetch klines on symbol / interval change.
  useEffect(() => {
    if (!pair) {
      setState({ loading: false, error: "no Binance pair", candles: [], fetchedAt: Date.now() });
      onCandles?.([]);
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    const poll = () => {
      void fetchKlines(pair, interval, 500).then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setState({ loading: false, error: null, candles: r.candles, fetchedAt: r.at });
          onCandles?.(r.candles);
        } else {
          setState({ loading: false, error: r.error ?? "fetch failed", candles: [], fetchedAt: r.at });
        }
      });
    };
    poll();
    const t = window.setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
    // onCandles intentionally excluded · stable parent callback expected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, interval]);

  // Push candle + volume data when state changes.
  useEffect(() => {
    const c = candleRef.current;
    const v = volRef.current;
    if (!c || !v) return;
    if (!state.candles.length) {
      c.setData([]);
      v.setData([]);
      timestampsRef.current = [];
      return;
    }
    const timestamps = state.candles.map((k) => Math.floor(k.t / 1000) as UTCTimestamp);
    timestampsRef.current = timestamps;
    c.setData(
      state.candles.map((k, i) => ({
        time: timestamps[i],
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close
      }))
    );
    v.setData(
      state.candles.map((k, i) => ({
        time: timestamps[i],
        value: k.volume,
        color:
          k.close >= k.open ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)"
      }))
    );
    chartRef.current?.timeScale().fitContent();
  }, [state.candles]);

  // Sync overlay series on each overlay change. Tear down → rebuild.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    // Tear down previous overlay line series.
    for (const s of overlayRefs.current) {
      try {
        chart.removeSeries(s);
      } catch {
        // ignore
      }
    }
    overlayRefs.current = [];
    const timestamps = timestampsRef.current;
    if (!overlays || !overlays.length || !timestamps.length) return;
    const next: ISeriesApi<"Line">[] = [];
    for (const ov of overlays) {
      if (ov.kind === "line" && ov.values) {
        const s = chart.addSeries(LineSeries, {
          color: ov.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false
        });
        s.setData(
          ov.values
            .map((v, i) => ({ time: timestamps[i], value: v }))
            .filter((p) => Number.isFinite(p.value))
        );
        next.push(s);
      } else if (ov.kind === "bands" && ov.upper && ov.mid && ov.lower) {
        const colors = ov.color;
        const su = chart.addSeries(LineSeries, { color: colors, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
        const sm = chart.addSeries(LineSeries, { color: colors, lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
        const sl = chart.addSeries(LineSeries, { color: colors, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
        su.setData(ov.upper.map((v, i) => ({ time: timestamps[i], value: v })).filter((p) => Number.isFinite(p.value)));
        sm.setData(ov.mid.map((v, i) => ({ time: timestamps[i], value: v })).filter((p) => Number.isFinite(p.value)));
        sl.setData(ov.lower.map((v, i) => ({ time: timestamps[i], value: v })).filter((p) => Number.isFinite(p.value)));
        next.push(su, sm, sl);
      }
    }
    overlayRefs.current = next;
  }, [overlays, state.candles]);

  // Main-pane hlines · drawn as price-lines on the candle series.
  useEffect(() => {
    const c = candleRef.current;
    if (!c) return;
    for (const pl of priceLineRefs.current) {
      try {
        c.removePriceLine(pl);
      } catch {
        // ignore
      }
    }
    priceLineRefs.current = [];
    if (!hlinesMain || !hlinesMain.length) return;
    for (const h of hlinesMain) {
      const pl = c.createPriceLine({
        price: h.value,
        color: h.color,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: h.label
      });
      priceLineRefs.current.push(pl);
    }
  }, [hlinesMain]);

  // Sync RSI lower-pane series + hlines.
  useEffect(() => {
    const chart = rsiChartRef.current;
    if (!chart) return;
    // Tear down old series + price lines.
    for (const s of rsiSeriesRefs.current) {
      try {
        chart.removeSeries(s);
      } catch {
        // ignore
      }
    }
    rsiSeriesRefs.current = [];
    rsiPriceLineRefs.current = [];
    if (!rsi || !timestampsRef.current.length) return;
    for (const p of rsi.plots) {
      const s = chart.addSeries(LineSeries, {
        color: p.color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true
      });
      s.setData(
        p.values
          .map((v, i) => ({ time: timestampsRef.current[i], value: v }))
          .filter((pt) => Number.isFinite(pt.value))
      );
      for (const h of rsi.hlines) {
        const pl = s.createPriceLine({
          price: h.value,
          color: h.color,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: h.label
        });
        rsiPriceLineRefs.current.push(pl);
      }
      rsiSeriesRefs.current.push(s);
    }
    chart.timeScale().fitContent();
  }, [rsi, state.candles]);

  const last = state.candles[state.candles.length - 1];

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
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
          {overlays && overlays.length > 0 && (
            <span className="rounded border border-accent/30 bg-accent/[0.08] px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-accent">
              {overlays.length} overlay
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
        <div className="flex min-h-0 flex-1 flex-col gap-1">
          <div
            ref={wrapRef}
            className="w-full overflow-hidden rounded-md border border-white/8 bg-black/40"
            style={{ height, flexShrink: 0 }}
          />
          {rsi && (
            <div
              ref={rsiWrapRef}
              className="w-full overflow-hidden rounded-md border border-white/8 bg-black/40"
              style={{ height: 110, flexShrink: 0 }}
              aria-label="RSI lower pane"
            />
          )}
        </div>
      ) : (
        <AdapterCell
          text={`no Binance pair for ${symbol}`}
          subtext="OHLC adapter-ready · equities/FX/commodities pending provider"
          h={height}
        />
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
