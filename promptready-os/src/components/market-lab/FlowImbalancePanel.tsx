"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  fetchOrderBook,
  fetchTrades,
  binancePairFor,
  type OrderBook,
  type Trade
} from "@/services/providers/binance";
import { TerminalPanel } from "./panels/TerminalPanel";
import { EmptyAdapterPanel } from "./panels/EmptyAdapterPanel";

interface Props {
  symbol: string;
}

/**
 * Flow imbalance · derived only from the current orderbook + recent
 * trades. Numbers shown:
 *
 *   bid Σ size (top 20)  · ask Σ size (top 20)
 *   imbalance %          · (bid - ask) / (bid + ask)
 *   spread abs · bps     · best bid / ask
 *   recent buy / sell    · count of last 50 trades grouped by aggressor
 *   net taker flow       · sum(buyer aggressor sizes) − sum(seller aggressor sizes)
 *
 * If the symbol has no Binance pair, the panel shows the honest
 * adapter-ready cell. No fabricated bids/asks/trades.
 */

const REFRESH_MS = 3_000;

interface Snapshot {
  book: OrderBook | null;
  trades: Trade[];
  err: string | null;
  fetchedAt: number;
}

export function FlowImbalancePanel({ symbol }: Props) {
  const pair = binancePairFor(symbol);
  const [snap, setSnap] = useState<Snapshot>({ book: null, trades: [], err: null, fetchedAt: 0 });

  useEffect(() => {
    if (!pair) {
      setSnap({ book: null, trades: [], err: null, fetchedAt: Date.now() });
      return;
    }
    let cancelled = false;
    const poll = async () => {
      const [b, t] = await Promise.all([fetchOrderBook(pair, 20), fetchTrades(pair, 50)]);
      if (cancelled) return;
      const err =
        !b.ok ? (b.error ?? "depth error") : !t.ok ? (t.error ?? "trades error") : null;
      setSnap({
        book: b.ok ? b.book : null,
        trades: t.ok ? t.trades : [],
        err,
        fetchedAt: Date.now()
      });
    };
    void poll();
    const id = window.setInterval(poll, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pair]);

  const stats = useMemo(() => {
    if (!snap.book) return null;
    const bids = snap.book.bids.slice(0, 20);
    const asks = snap.book.asks.slice(0, 20);
    const bidSum = bids.reduce((acc, l) => acc + l.size, 0);
    const askSum = asks.reduce((acc, l) => acc + l.size, 0);
    const total = bidSum + askSum;
    const imbalance = total === 0 ? 0 : ((bidSum - askSum) / total) * 100;
    const bestBid = bids[0]?.price ?? Number.NaN;
    const bestAsk = asks[0]?.price ?? Number.NaN;
    const spreadAbs = bestAsk - bestBid;
    const spreadBps = bestBid > 0 ? (spreadAbs / bestBid) * 10_000 : Number.NaN;
    const buys = snap.trades.filter((t) => !t.buyerMaker);
    const sells = snap.trades.filter((t) => t.buyerMaker);
    const buyVol = buys.reduce((a, t) => a + t.size, 0);
    const sellVol = sells.reduce((a, t) => a + t.size, 0);
    const net = buyVol - sellVol;
    return { bidSum, askSum, imbalance, bestBid, bestAsk, spreadAbs, spreadBps, buys: buys.length, sells: sells.length, buyVol, sellVol, net };
  }, [snap]);

  return (
    <TerminalPanel
      title="flow imbalance"
      sub={pair ? `${pair} · depth ⋅ tape` : "no source"}
      status={
        snap.err
          ? snap.err
          : snap.fetchedAt
            ? new Date(snap.fetchedAt).toLocaleTimeString("en-GB", { hour12: false })
            : pair
              ? "loading…"
              : ""
      }
      tone={snap.err ? "bad" : pair ? "ok" : "muted"}
    >
      {!pair && (
        <EmptyAdapterPanel
          text="flow imbalance adapter-ready"
          subtext={`no orderbook / tape source for ${symbol}`}
        />
      )}

      {pair && stats && (
        <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
          <Stat label="bid Σ" value={stats.bidSum} fmt="size" tone="ok" />
          <Stat label="ask Σ" value={stats.askSum} fmt="size" tone="bad" />
          <Stat
            label="imbalance"
            value={stats.imbalance}
            fmt="pct"
            tone={stats.imbalance > 5 ? "ok" : stats.imbalance < -5 ? "bad" : "muted"}
          />
          <Stat label="spread" value={stats.spreadBps} fmt="bps" tone="muted" />
          <Stat label="best bid" value={stats.bestBid} fmt="price" tone="ok" />
          <Stat label="best ask" value={stats.bestAsk} fmt="price" tone="bad" />
          <Stat label="buys (50)" value={stats.buys} fmt="int" tone="ok" />
          <Stat label="sells (50)" value={stats.sells} fmt="int" tone="bad" />
          <Stat label="buy vol" value={stats.buyVol} fmt="size" tone="ok" />
          <Stat label="sell vol" value={stats.sellVol} fmt="size" tone="bad" />
          <ImbalanceBar value={stats.imbalance} />
          <Stat
            label="net taker"
            value={stats.net}
            fmt="size"
            tone={stats.net > 0 ? "ok" : stats.net < 0 ? "bad" : "muted"}
          />
        </div>
      )}
    </TerminalPanel>
  );
}

type Tone = "ok" | "bad" | "muted";

const TONE_TEXT: Record<Tone, string> = {
  ok: "text-emerald-300",
  bad: "text-rose-300",
  muted: "text-white/65"
};

function Stat({ label, value, fmt, tone }: { label: string; value: number; fmt: "size" | "pct" | "bps" | "price" | "int"; tone: Tone }) {
  const v = format(value, fmt);
  return (
    <div className="flex flex-col rounded border border-white/8 bg-white/[0.012] px-2 py-1">
      <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/45">{label}</span>
      <span className={clsx("tabular-nums", TONE_TEXT[tone])}>{v}</span>
    </div>
  );
}

function format(n: number, fmt: "size" | "pct" | "bps" | "price" | "int"): string {
  if (!Number.isFinite(n)) return "—";
  switch (fmt) {
    case "size": return n.toLocaleString("en-US", { maximumFractionDigits: 3 });
    case "pct": return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
    case "bps": return `${n.toFixed(1)} bps`;
    case "price": return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
    case "int": return Math.round(n).toString();
  }
}

function ImbalanceBar({ value }: { value: number }) {
  const clamped = Math.max(-100, Math.min(100, value));
  const pct = Math.abs(clamped);
  const side = clamped >= 0 ? "right" : "left";
  return (
    <div className="col-span-2 flex flex-col gap-0.5 rounded border border-white/8 bg-white/[0.012] px-2 py-1">
      <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/45">
        imbalance bar
      </span>
      <div className="relative h-2 rounded bg-white/[0.04]">
        <div
          className={clsx(
            "absolute top-0 h-full rounded",
            side === "right" ? "left-1/2 bg-emerald-400/60" : "right-1/2 bg-rose-400/60"
          )}
          style={{ width: `${pct / 2}%` }}
        />
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-white/30" />
      </div>
    </div>
  );
}
