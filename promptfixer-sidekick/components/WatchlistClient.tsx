"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  addSymbol,
  loadWatchlist,
  removeSymbol,
  type WatchSymbol
} from "@/lib/watchlist";

/**
 * Local manual watchlist.
 *
 * No live quotes — the operator captures the symbols they care about
 * so that, when the Terminal market-feed adapters land, the panel
 * already has the right tickers staged. Until then, the list is honest
 * about not carrying prices.
 */

const KIND_OPTIONS = [
  { id: "stock", label: "Stock" },
  { id: "crypto", label: "Crypto" },
  { id: "fx", label: "FX" },
  { id: "other", label: "Other" }
] as const;

export function WatchlistClient() {
  const [list, setList] = useState<WatchSymbol[] | null>(null);
  const [ticker, setTicker] = useState("");
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<string>("stock");

  useEffect(() => {
    setList(loadWatchlist());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "pf.terminal.watchlist.v1" || e.key === null) {
        setList(loadWatchlist());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;
    setList(addSymbol({ ticker, label, kind }));
    setTicker("");
    setLabel("");
  };

  if (list === null) {
    return (
      <p className="text-[11px] text-white/55">
        <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Loading watchlist…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={submit}
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3"
      >
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Ticker (AAPL, BTCUSDT, EURUSD)"
          className="no-drag w-32 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 font-mono text-[11.5px] uppercase tracking-wider text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Optional label"
          className="no-drag flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[11.5px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="no-drag rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[11.5px] text-white focus:border-accent/40 focus:outline-none"
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.id} value={o.id} className="bg-bg">
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!ticker.trim()}
          className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/[0.08] px-2.5 py-1 text-[12px] font-medium text-accent transition hover:bg-accent/[0.16] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </form>

      {list.length === 0 ? (
        <p className="text-[11.5px] text-white/55">
          No symbols yet. Capture the tickers you care about — when live data
          adapters ship, this list seeds the Terminal market panel.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/8 bg-white/[0.02]">
          {list.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-2">
              <span className="font-mono text-[12.5px] uppercase tracking-wider text-white">
                {s.ticker}
              </span>
              {s.kind && (
                <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55">
                  {s.kind}
                </span>
              )}
              {s.label && (
                <span className="truncate text-[11.5px] text-white/55">
                  {s.label}
                </span>
              )}
              <span className="ml-auto font-mono text-[9.5px] uppercase tracking-wider text-white/35">
                no live price
              </span>
              <button
                type="button"
                title="Remove"
                onClick={() => setList(removeSymbol(s.id))}
                className="rounded-md border border-white/10 bg-white/[0.03] p-1 text-white/45 transition hover:border-rose-400/40 hover:bg-rose-500/[0.08] hover:text-rose-200"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
