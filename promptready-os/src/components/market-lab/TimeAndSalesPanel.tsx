"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  fetchTrades,
  binancePairFor,
  type Trade
} from "@/services/providers/binance";
import { PanelHeader } from "./OrderBookPanel";

interface Props {
  symbol: string;
  rows?: number;
}

interface State {
  loading: boolean;
  error: string | null;
  trades: Trade[];
  fetchedAt: number | null;
}

const REFRESH_MS = 3_000;

export function TimeAndSalesPanel({ symbol, rows = 16 }: Props) {
  const pair = binancePairFor(symbol);
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    trades: [],
    fetchedAt: null
  });

  useEffect(() => {
    if (!pair) {
      setState({ loading: false, error: "no Binance pair", trades: [], fetchedAt: Date.now() });
      return;
    }
    let cancelled = false;
    const poll = () => {
      void fetchTrades(pair, 50).then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setState({ loading: false, error: null, trades: r.trades.reverse(), fetchedAt: r.at });
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

  const visible = state.trades.slice(0, rows);

  return (
    <div className="flex h-full flex-col gap-1.5">
      <PanelHeader
        label="Time & Sales"
        sub={pair ? `Binance · ${pair} · ${REFRESH_MS / 1000}s` : "no source"}
        status={state.loading ? "loading…" : state.error ?? (state.fetchedAt ? new Date(state.fetchedAt).toLocaleTimeString() : "")}
        tone={state.error ? "bad" : pair ? "ok" : "muted"}
      />

      {!pair && (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-white/12 bg-white/[0.012] p-3 text-center">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/55">
            Time &amp; Sales adapter-ready
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
            no trade tape for {symbol}
          </span>
        </div>
      )}

      {pair && visible.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden font-mono text-[10.5px] tabular-nums">
          <div className="grid grid-cols-[3fr_3fr_2fr] gap-1.5 border-b border-white/10 px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
            <span className="text-right">price</span>
            <span className="text-right">size</span>
            <span className="text-right">time</span>
          </div>
          <ul className="flex min-h-0 flex-1 flex-col overflow-auto scrollbar-thin">
            {visible.map((t, i) => {
              const aggressorIsBuyer = !t.buyerMaker;
              return (
                <li
                  key={t.id}
                  className={clsx(
                    "grid grid-cols-[3fr_3fr_2fr] gap-1.5 px-1.5 py-px",
                    aggressorIsBuyer ? "text-emerald-300/90" : "text-rose-300/90",
                    // subtle zebra · readability without distraction
                    i % 2 === 1 && "bg-white/[0.018]"
                  )}
                >
                  <span className="text-right">{t.price.toLocaleString("en-US", { maximumFractionDigits: 4 })}</span>
                  <span className="text-right text-white/65">
                    {t.size.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                  </span>
                  <span className="text-right text-white/45">
                    {new Date(t.t).toLocaleTimeString("en-GB", { hour12: false })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
