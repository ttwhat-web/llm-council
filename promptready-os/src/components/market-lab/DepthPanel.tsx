"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchOrderBook,
  binancePairFor,
  type OrderBook
} from "@/services/providers/binance";
import { PanelHeader } from "./OrderBookPanel";

interface Props {
  symbol: string;
  height?: number;
}

interface State {
  loading: boolean;
  error: string | null;
  book: OrderBook | null;
  fetchedAt: number | null;
}

const REFRESH_MS = 4_000;

/**
 * Cumulative liquidity / depth chart from a snapshot of /api/v3/depth.
 * Plots cumulative bid size on the left half and cumulative ask size on
 * the right, both growing outward from the mid price. Pure SVG so there
 * is no second lightweight-charts instance to allocate.
 */
export function DepthPanel({ symbol, height = 160 }: Props) {
  const pair = binancePairFor(symbol);
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    book: null,
    fetchedAt: null
  });

  useEffect(() => {
    if (!pair) {
      setState({ loading: false, error: "no Binance pair", book: null, fetchedAt: Date.now() });
      return;
    }
    let cancelled = false;
    const poll = () => {
      void fetchOrderBook(pair, 100).then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setState({ loading: false, error: null, book: r.book, fetchedAt: r.at });
        } else {
          setState((prev) => ({ ...prev, error: r.error ?? "fetch failed", fetchedAt: r.at, loading: false }));
        }
      });
    };
    poll();
    const t = window.setInterval(poll, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [pair]);

  const series = useMemo(() => {
    if (!state.book) return null;
    const bids = state.book.bids.slice(0, 80);
    const asks = state.book.asks.slice(0, 80);
    if (!bids.length || !asks.length) return null;

    let cum = 0;
    const bidPoints = bids.map((l) => {
      cum += l.size;
      return { price: l.price, cum };
    });
    cum = 0;
    const askPoints = asks.map((l) => {
      cum += l.size;
      return { price: l.price, cum };
    });

    const minBid = bidPoints[bidPoints.length - 1].price;
    const maxAsk = askPoints[askPoints.length - 1].price;
    const maxCum = Math.max(
      bidPoints[bidPoints.length - 1].cum,
      askPoints[askPoints.length - 1].cum
    );

    return { bidPoints, askPoints, minBid, maxAsk, maxCum };
  }, [state.book]);

  return (
    <div className="flex h-full flex-col gap-1.5">
      <PanelHeader
        label="Liquidity / Depth"
        sub={pair ? `Binance · ${pair} · cum L2` : "no source"}
        status={
          state.loading
            ? "loading…"
            : state.error ?? (state.fetchedAt ? new Date(state.fetchedAt).toLocaleTimeString() : "")
        }
        tone={state.error ? "bad" : pair ? "ok" : "muted"}
      />

      {!pair && (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-white/12 bg-white/[0.012] p-3 text-center">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
            Liquidity adapter-ready
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
            no depth source for {symbol}
          </span>
        </div>
      )}

      {pair && series && <DepthSvg height={height} series={series} />}
    </div>
  );
}

function DepthSvg({
  height,
  series
}: {
  height: number;
  series: {
    bidPoints: Array<{ price: number; cum: number }>;
    askPoints: Array<{ price: number; cum: number }>;
    minBid: number;
    maxAsk: number;
    maxCum: number;
  };
}) {
  const W = 600;
  const H = height;
  const pad = 6;
  const { bidPoints, askPoints, minBid, maxAsk, maxCum } = series;
  const range = maxAsk - minBid || 1;

  const xFor = (price: number) => ((price - minBid) / range) * (W - pad * 2) + pad;
  const yFor = (cum: number) => H - (cum / maxCum) * (H - pad * 2) - pad;

  const bidPath = bidPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.price).toFixed(1)} ${yFor(p.cum).toFixed(1)}`)
    .join(" ");
  const askPath = askPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.price).toFixed(1)} ${yFor(p.cum).toFixed(1)}`)
    .join(" ");

  // Fills extend down to the baseline.
  const bidFirst = bidPoints[0];
  const bidLast = bidPoints[bidPoints.length - 1];
  const askFirst = askPoints[0];
  const askLast = askPoints[askPoints.length - 1];
  const bidArea =
    `M ${xFor(bidFirst.price).toFixed(1)} ${(H - pad).toFixed(1)} ` +
    bidPath.replace(/^M /, "L ") +
    ` L ${xFor(bidLast.price).toFixed(1)} ${(H - pad).toFixed(1)} Z`;
  const askArea =
    `M ${xFor(askFirst.price).toFixed(1)} ${(H - pad).toFixed(1)} ` +
    askPath.replace(/^M /, "L ") +
    ` L ${xFor(askLast.price).toFixed(1)} ${(H - pad).toFixed(1)} Z`;

  const midX = (xFor(bidFirst.price) + xFor(askFirst.price)) / 2;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      className="rounded-md border border-white/8 bg-black/40"
    >
      <path d={bidArea} fill="rgba(52,211,153,0.18)" />
      <path d={bidPath} stroke="rgb(52,211,153)" strokeWidth={1.2} fill="none" />
      <path d={askArea} fill="rgba(248,113,113,0.18)" />
      <path d={askPath} stroke="rgb(248,113,113)" strokeWidth={1.2} fill="none" />
      <line x1={midX} y1={pad} x2={midX} y2={H - pad} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />
      <text
        x={midX + 4}
        y={pad + 10}
        fill="rgba(255,255,255,0.45)"
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 9 }}
      >
        mid
      </text>
    </svg>
  );
}
