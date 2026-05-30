"use client";

import { useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { ChartCanvas } from "../chart-engine/ChartCanvas";
import { TerminalPanel } from "./TerminalPanel";
import { binancePairFor } from "@/services/providers/binance";
import type { Candle, Hline, Overlay, RsiPaneData } from "../chart-engine/types";

interface Props {
  symbol: string;
  onSymbol(sym: string): void;
  options: string[];
  height?: number;
  compact?: boolean;
  overlays?: Overlay[];
  hlinesMain?: Hline[];
  rsi?: RsiPaneData | null;
  onCandles?: (candles: Candle[]) => void;
  title?: string;
}

/**
 * A chart slot · symbol selector header + a ChartCanvas inside a
 * TerminalPanel. Used for the dominant main chart and every mini
 * chart in the 1+4 / wall layouts.
 */
export function ChartSlot({
  symbol,
  onSymbol,
  options,
  height = 320,
  compact = false,
  overlays,
  hlinesMain,
  rsi,
  onCandles,
  title
}: Props) {
  const [open, setOpen] = useState(false);
  const hasBinance = binancePairFor(symbol) != null;

  return (
    <TerminalPanel
      title={title ?? symbol}
      sub={hasBinance ? "binance · live ohlc" : "no source · adapter-ready"}
      tone={hasBinance ? "ok" : "muted"}
      right={
        <div className="relative min-w-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            title="Change symbol · WORKS"
            aria-label="Change symbol"
            className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/75 transition hover:bg-white/[0.06]"
          >
            {symbol}
            <ChevronDown className="h-3 w-3" />
          </button>
          {open && (
            <ul
              role="listbox"
              aria-label="Symbol options"
              className="absolute right-0 top-full z-30 mt-1 flex max-h-60 min-w-[100px] flex-col overflow-auto rounded-md border border-white/10 bg-black/95 p-1 shadow-2xl"
            >
              {options.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      onSymbol(s);
                      setOpen(false);
                    }}
                    title={`Select ${s} · WORKS`}
                    className={clsx(
                      "flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 font-mono text-[10px] uppercase tracking-wider transition",
                      s === symbol
                        ? "bg-accent/[0.18] text-accent"
                        : "text-white/65 hover:bg-white/[0.07] hover:text-white"
                    )}
                  >
                    <span>{s}</span>
                    {!binancePairFor(s) && (
                      <span className="text-[9px] text-white/35">adapter</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      }
      bodyClassName="p-1 min-h-0 min-w-0 overflow-hidden"
    >
      <div className="min-w-0 max-w-full overflow-hidden">
        <ChartCanvas
          symbol={symbol}
          height={height}
          compact={compact}
          overlays={overlays}
          hlinesMain={hlinesMain}
          rsi={rsi}
          onCandles={onCandles}
        />
      </div>
    </TerminalPanel>
  );
}
