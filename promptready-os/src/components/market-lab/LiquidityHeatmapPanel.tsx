"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchOrderBook, binancePairFor, type OrderBook } from "@/services/providers/binance";
import { TerminalPanel } from "./panels/TerminalPanel";
import { EmptyAdapterPanel } from "./panels/EmptyAdapterPanel";

interface Props {
  symbol: string;
}

interface Snapshot {
  at: number;
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
}

/**
 * Liquidity heatmap · honest by default.
 *
 * A real Bookmap-style heatmap needs a high-frequency depth-stream
 * archive (websocket diff + reconstruction). We only have point-in-time
 * REST snapshots from /api/v3/depth, so we render an honest light
 * version: each row at the current snapshot, intensity = sqrt(size).
 * A pinned banner makes the limitation explicit. We never invent
 * historical density.
 */
const SNAPSHOT_REFRESH_MS = 4_000;
const ROWS = 16;

export function LiquidityHeatmapPanel({ symbol }: Props) {
  const pair = binancePairFor(symbol);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!pair) {
      setSnap(null);
      setErr(null);
      return;
    }
    let cancelled = false;
    const poll = () => {
      void fetchOrderBook(pair, 50).then((r) => {
        if (cancelled) return;
        if (r.ok && r.book) {
          setSnap(toSnapshot(r.book));
          setErr(null);
          setFetchedAt(r.at);
        } else {
          setErr(r.error ?? "fetch failed");
          setFetchedAt(r.at);
        }
      });
    };
    poll();
    const t = window.setInterval(poll, SNAPSHOT_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [pair]);

  const rows = useMemo(() => {
    if (!snap) return null;
    const asks = snap.asks.slice(0, ROWS / 2);
    const bids = snap.bids.slice(0, ROWS / 2);
    const all = [...asks, ...bids].map((l) => l.size);
    const max = Math.max(...all, 0.0001);
    return { asks, bids, max };
  }, [snap]);

  return (
    <TerminalPanel
      title="liquidity heatmap"
      sub={pair ? `${pair} · snapshot only` : "no source"}
      status={
        err
          ? err
          : fetchedAt
            ? `${new Date(fetchedAt).toLocaleTimeString("en-GB", { hour12: false })}`
            : pair
              ? "loading…"
              : ""
      }
      tone={err ? "bad" : pair ? "warn" : "muted"}
    >
      {!pair && (
        <EmptyAdapterPanel
          text="bookmap heatmap adapter-ready"
          subtext={`no depth source for ${symbol}`}
        />
      )}
      {pair && (
        <>
          <div className="rounded border border-amber-400/25 bg-amber-500/[0.04] px-2 py-1 font-mono text-[8.5px] uppercase tracking-wider text-amber-200/80">
            bookmap heatmap adapter-ready · requires depth snapshot history
          </div>
          {rows && (
            <div className="mt-1 flex min-h-0 flex-col gap-px overflow-hidden font-mono text-[9.5px] tabular-nums">
              {[...rows.asks].reverse().map((l, i) => (
                <Row key={`a-${i}`} price={l.price} size={l.size} max={rows.max} side="ask" />
              ))}
              {rows.bids.map((l, i) => (
                <Row key={`b-${i}`} price={l.price} size={l.size} max={rows.max} side="bid" />
              ))}
            </div>
          )}
        </>
      )}
    </TerminalPanel>
  );
}

function Row({
  price,
  size,
  max,
  side
}: {
  price: number;
  size: number;
  max: number;
  side: "ask" | "bid";
}) {
  const intensity = Math.min(1, Math.sqrt(size / max));
  const color =
    side === "ask"
      ? `rgba(248,113,113,${(0.05 + intensity * 0.55).toFixed(3)})`
      : `rgba(52,211,153,${(0.05 + intensity * 0.55).toFixed(3)})`;
  return (
    <div
      className="relative grid grid-cols-[1fr_auto] items-center gap-2 rounded-sm px-1.5 py-px"
      style={{ background: color }}
    >
      <span className={side === "ask" ? "text-rose-200" : "text-emerald-200"}>
        {price.toLocaleString("en-US", { maximumFractionDigits: 4 })}
      </span>
      <span className="text-white/65">
        {size.toLocaleString("en-US", { maximumFractionDigits: 4 })}
      </span>
    </div>
  );
}

function toSnapshot(book: OrderBook): Snapshot {
  return { at: Date.now(), bids: book.bids, asks: book.asks };
}
