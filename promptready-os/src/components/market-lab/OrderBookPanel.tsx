"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  fetchOrderBook,
  binancePairFor,
  type OrderBook
} from "@/services/providers/binance";

interface Props {
  symbol: string;
  rows?: number;
}

interface State {
  loading: boolean;
  error: string | null;
  book: OrderBook | null;
  fetchedAt: number | null;
}

const REFRESH_MS = 2_000;

export function OrderBookPanel({ symbol, rows = 14 }: Props) {
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
      void fetchOrderBook(pair, 20).then((r) => {
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

  const slicedBids = useMemo(
    () => (state.book ? state.book.bids.slice(0, rows) : []),
    [state.book, rows]
  );
  const slicedAsks = useMemo(
    () => (state.book ? state.book.asks.slice(0, rows) : []),
    [state.book, rows]
  );

  const maxSize = useMemo(() => {
    const arr = [...slicedBids, ...slicedAsks].map((l) => l.size);
    return arr.length ? Math.max(...arr) : 0;
  }, [slicedBids, slicedAsks]);

  const spread = useMemo(() => {
    if (!state.book || !state.book.bids[0] || !state.book.asks[0]) return null;
    const bestBid = state.book.bids[0].price;
    const bestAsk = state.book.asks[0].price;
    const abs = bestAsk - bestBid;
    const bps = (abs / bestBid) * 10_000;
    return { bestBid, bestAsk, abs, bps };
  }, [state.book]);

  return (
    <div className="flex h-full flex-col gap-1.5">
      <PanelHeader
        label="Order Book"
        sub={pair ? `Binance · ${pair} · L2 depth · ${REFRESH_MS / 1000}s` : "no source"}
        status={state.loading ? "loading…" : state.error ?? (state.fetchedAt ? new Date(state.fetchedAt).toLocaleTimeString() : "")}
        tone={state.error ? "bad" : pair ? "ok" : "muted"}
      />

      {!pair && (
        <AdapterCell
          text="Binance depth adapter-ready"
          subtext={`no live order book source for ${symbol}`}
        />
      )}

      {pair && state.book && (
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden font-mono text-[10.5px] tabular-nums">
          {/* asks · top → reversed so best ask sits closest to spread */}
          <ul className="flex flex-col gap-px">
            {[...slicedAsks].reverse().map((l, i) => (
              <Row key={`a-${i}`} side="ask" price={l.price} size={l.size} max={maxSize} />
            ))}
          </ul>

          {/* spread row · sits between asks and bids, centered key on left */}
          {spread && (
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-white/70">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">spread</span>
              <span className="h-px bg-white/10" aria-hidden />
              <span className="tabular-nums">
                {spread.abs.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                <span className="ml-1.5 text-white/45">{spread.bps.toFixed(1)} bps</span>
              </span>
            </div>
          )}

          {/* bids */}
          <ul className="flex flex-col gap-px">
            {slicedBids.map((l, i) => (
              <Row key={`b-${i}`} side="bid" price={l.price} size={l.size} max={maxSize} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ side, price, size, max }: { side: "bid" | "ask"; price: number; size: number; max: number }) {
  const pct = max > 0 ? (size / max) * 100 : 0;
  return (
    <li
      className={clsx(
        "relative grid grid-cols-[1fr_1fr] items-center gap-2 rounded-sm px-1.5 py-px",
        side === "ask" ? "text-rose-300/90" : "text-emerald-300/90"
      )}
    >
      <span
        aria-hidden
        className={clsx(
          "pointer-events-none absolute inset-y-0 right-0 rounded-sm",
          side === "ask" ? "bg-rose-500/[0.08]" : "bg-emerald-500/[0.08]"
        )}
        style={{ width: `${pct}%` }}
      />
      <span className="relative text-right">{price.toLocaleString("en-US", { maximumFractionDigits: 4 })}</span>
      <span className="relative text-right text-white/65">{size.toLocaleString("en-US", { maximumFractionDigits: 4 })}</span>
    </li>
  );
}

function AdapterCell({ text, subtext }: { text: string; subtext: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-white/12 bg-white/[0.012] p-3 text-center">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">{text}</span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">{subtext}</span>
    </div>
  );
}

type Tone = "ok" | "bad" | "muted";

const TONE: Record<Tone, string> = {
  ok: "text-emerald-300/80",
  bad: "text-rose-300/80",
  muted: "text-white/40"
};

export function PanelHeader({
  label,
  sub,
  status,
  tone = "muted"
}: {
  label: string;
  sub: string;
  status?: string;
  tone?: Tone;
}) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-white/8 pb-1.5">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/85">
          {label}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">{sub}</span>
      </div>
      {status && (
        <span className={clsx("font-mono text-[9px] uppercase tracking-wider", TONE[tone])}>
          {status}
        </span>
      )}
    </header>
  );
}
