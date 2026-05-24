"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp
} from "lightweight-charts";
import {
  fetchCoinHistory,
  coinIdFromSymbol,
  type HistoryPoint
} from "@/services/providers/coingecko";
import { PanelHeader } from "./OrderBookPanel";

interface Props {
  symbols: [string, string];
  days?: number;
  height?: number;
}

interface Series {
  symbol: string;
  points: HistoryPoint[];
  color: string;
  error: string | null;
}

const PALETTE = ["rgb(124,155,255)", "rgb(245,196,120)"];

export function ComparisonChart({ symbols, days = 7, height = 180 }: Props) {
  const [a, setA] = useState<Series>({ symbol: symbols[0], points: [], color: PALETTE[0], error: null });
  const [b, setB] = useState<Series>({ symbol: symbols[1], points: [], color: PALETTE[1], error: null });
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesARef = useRef<ISeriesApi<"Line"> | null>(null);
  const seriesBRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const chart = createChart(el, {
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255,255,255,0.55)",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 10
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" }
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
      timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: false },
      autoSize: true
    });
    const sA = chart.addSeries(LineSeries, { color: PALETTE[0], lineWidth: 2 });
    const sB = chart.addSeries(LineSeries, { color: PALETTE[1], lineWidth: 2 });
    chartRef.current = chart;
    seriesARef.current = sA;
    seriesBRef.current = sB;
    return () => {
      try {
        chart.remove();
      } catch {
        // ignore
      }
      chartRef.current = null;
      seriesARef.current = null;
      seriesBRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const idA = coinIdFromSymbol(symbols[0]);
    const idB = coinIdFromSymbol(symbols[1]);
    const fetches = [
      idA ? fetchCoinHistory(idA, days) : Promise.resolve({ ok: false as const, points: [], at: Date.now(), error: "no provider" }),
      idB ? fetchCoinHistory(idB, days) : Promise.resolve({ ok: false as const, points: [], at: Date.now(), error: "no provider" })
    ];
    void Promise.all(fetches).then(([rA, rB]) => {
      if (cancelled) return;
      setA({
        symbol: symbols[0],
        points: rA.ok ? rA.points : [],
        color: PALETTE[0],
        error: rA.ok ? null : rA.error ?? "fetch failed"
      });
      setB({
        symbol: symbols[1],
        points: rB.ok ? rB.points : [],
        color: PALETTE[1],
        error: rB.ok ? null : rB.error ?? "fetch failed"
      });
      setLoading(false);
      setFetchedAt(Date.now());
    });
    return () => {
      cancelled = true;
    };
  }, [symbols, days]);

  useEffect(() => {
    const push = (
      ref: React.MutableRefObject<ISeriesApi<"Line"> | null>,
      pts: HistoryPoint[]
    ) => {
      const s = ref.current;
      if (!s) return;
      if (!pts.length) {
        s.setData([]);
        return;
      }
      const first = pts[0].price;
      const seen = new Set<number>();
      const data = pts
        .map((p) => ({ time: Math.floor(p.t / 1000) as UTCTimestamp, value: (p.price / first) * 100 }))
        .filter((p) => {
          if (seen.has(p.time as number)) return false;
          seen.add(p.time as number);
          return true;
        });
      s.setData(data);
    };
    push(seriesARef, a.points);
    push(seriesBRef, b.points);
    chartRef.current?.timeScale().fitContent();
  }, [a.points, b.points]);

  return (
    <div className="flex h-full flex-col gap-1.5">
      <PanelHeader
        label={`Compare · ${symbols[0]} vs ${symbols[1]}`}
        sub={`CoinGecko · normalized 100 · ${days}d`}
        status={loading ? "loading…" : fetchedAt ? new Date(fetchedAt).toLocaleTimeString() : ""}
        tone="ok"
      />
      <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-wider">
        <Legend color={PALETTE[0]} label={a.symbol} err={a.error} />
        <Legend color={PALETTE[1]} label={b.symbol} err={b.error} />
      </div>
      <div ref={wrapRef} className="w-full overflow-hidden rounded-md border border-white/8 bg-black/40" style={{ height }} />
    </div>
  );
}

function Legend({ color, label, err }: { color: string; label: string; err: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-white/65">
      <span aria-hidden className="h-1.5 w-3 rounded" style={{ background: color }} />
      {label}
      {err && <span className="text-rose-300/80">· {err}</span>}
    </span>
  );
}
