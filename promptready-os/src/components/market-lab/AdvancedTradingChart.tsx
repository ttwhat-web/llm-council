"use client";

/**
 * Advanced Trading Chart · TradingView ONLY.
 *
 * Uses TradingView's public Advanced Chart embed (`tv.js`). No
 * license, no API key, no proprietary `charting_library/` files,
 * no canvas fallback, no ECharts. If the widget fails to load or
 * mount the user sees an explicit error panel with the reason.
 */

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import { binancePairFor } from "@/services/providers/binance";

const TV_SCRIPT_SRC = "https://s3.tradingview.com/tv.js";
const TV_SCRIPT_ID = "tradingview-widget-loader";

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: Record<string, unknown>) => unknown;
    };
  }
}

type Status = "loading" | "ready" | "error" | "no-pair";

interface Props {
  symbol: string;
  height?: number;
}

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.TradingView?.widget) return Promise.resolve();
  const existing = document.getElementById(TV_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    if (existing.dataset.loaded === "1") return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("tradingview tv.js failed to load")),
        { once: true }
      );
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.id = TV_SCRIPT_ID;
    s.src = TV_SCRIPT_SRC;
    s.async = true;
    s.onload = () => {
      s.dataset.loaded = "1";
      resolve();
    };
    s.onerror = () => reject(new Error("tradingview tv.js failed to load"));
    document.head.appendChild(s);
  });
}

export function AdvancedTradingChart({ symbol, height = 520 }: Props) {
  const pair = binancePairFor(symbol);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerId = useId().replace(/[^a-z0-9]/gi, "");
  const [status, setStatus] = useState<Status>(pair ? "loading" : "no-pair");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!pair) {
      setStatus("no-pair");
      return;
    }
    setStatus("loading");
    setError(null);
    let cancelled = false;
    let mounted: HTMLDivElement | null = null;
    const mount = () => {
      const el = containerRef.current;
      if (!el || cancelled) return;
      el.innerHTML = "";
      const inner = document.createElement("div");
      inner.id = `tv_${containerId}_${pair}`;
      inner.style.width = "100%";
      inner.style.height = "100%";
      el.appendChild(inner);
      mounted = inner;
      try {
        new window.TradingView!.widget({
          autosize: true,
          symbol: `BINANCE:${pair}`,
          interval: "60",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#02040a",
          enable_publishing: false,
          allow_symbol_change: true,
          hide_side_toolbar: false,
          withdateranges: true,
          studies: [],
          container_id: inner.id,
          backgroundColor: "rgba(2,4,10,1)",
          gridColor: "rgba(255,255,255,0.04)"
        });
        if (!cancelled) setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setError(e instanceof Error ? e.message : "widget construction threw");
        }
      }
    };

    loadScript()
      .then(() => {
        if (cancelled) return;
        Promise.resolve().then(() => {
          if (cancelled) return;
          if (!window.TradingView?.widget) {
            setStatus("error");
            setError("window.TradingView.widget not defined after script load");
            return;
          }
          mount();
        });
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setStatus("error");
        setError(e.message);
      });

    return () => {
      cancelled = true;
      if (mounted && mounted.parentNode === containerRef.current) {
        try {
          mounted.remove();
        } catch {
          // ignore
        }
      }
    };
  }, [pair, containerId, reloadKey]);

  const externalHref = pair
    ? `https://www.tradingview.com/chart/?symbol=BINANCE:${pair}`
    : "https://www.tradingview.com";

  return (
    <section className="flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden rounded-md border border-white/10 bg-black/60">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/90">
            {pair ? `${pair} · TradingView` : `${symbol} · no Binance pair`}
          </span>
          <StatusBadge status={status} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            title="Reload chart"
            aria-label="Reload chart"
            className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] hover:text-white"
          >
            <RefreshCw className="h-3 w-3" /> reload
          </button>
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in tradingview.com"
            aria-label="Open in tradingview.com"
            className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] hover:text-white"
          >
            <ExternalLink className="h-3 w-3" /> tradingview
          </a>
        </div>
      </header>

      {status === "no-pair" && (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-2 p-3 text-center"
          style={{ minHeight: height }}
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/75">
            {symbol} · needs setup
          </span>
          <span className="max-w-md text-[11.5px] leading-snug text-white/60">
            Equities, FX and metals need a market data provider (TwelveData, FMP, etc.). Crypto pairs on Binance work out of the box.
          </span>
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/[0.1] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15]"
          >
            <ExternalLink className="h-3 w-3" /> open in tradingview
          </a>
        </div>
      )}

      {status !== "no-pair" && (
        <div
          ref={containerRef}
          data-tradingview-container={pair ?? "none"}
          aria-label={`TradingView chart · ${pair ?? symbol}`}
          className="min-h-0 min-w-0 max-w-full flex-1 overflow-hidden"
          style={{ height, width: "100%" }}
        />
      )}

      {status === "error" && (
        <div
          role="alert"
          className="flex shrink-0 flex-col gap-1 border-t border-rose-400/30 bg-rose-500/[0.06] px-2 py-1.5"
        >
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-rose-200">
            <XCircle className="h-3 w-3" /> TradingView Failed · no fallback chart engine
          </span>
          <span className="break-all font-mono text-[10.5px] text-white/85">{error ?? "unknown error"}</span>
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              title="Retry mounting the TradingView widget"
              aria-label="Retry"
              className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/75 transition hover:bg-white/[0.06] hover:text-white"
            >
              <RefreshCw className="h-3 w-3" /> retry
            </button>
            <a
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded border border-accent/40 bg-accent/[0.1] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15]"
            >
              <ExternalLink className="h-3 w-3" /> open in tradingview
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "ready") {
    return (
      <span
        data-tradingview-status="connected"
        className={clsx(
          "inline-flex items-center gap-1 rounded border px-1.5 py-px font-mono text-[10.5px] uppercase tracking-wider",
          "border-emerald-400/40 bg-emerald-500/[0.1] text-emerald-200"
        )}
      >
        <CheckCircle2 className="h-3 w-3" /> TradingView Connected
      </span>
    );
  }
  if (status === "loading") {
    return (
      <span
        data-tradingview-status="loading"
        className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/[0.04] px-1.5 py-px font-mono text-[10.5px] uppercase tracking-wider text-white/70"
      >
        TradingView Loading…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        data-tradingview-status="failed"
        className="inline-flex items-center gap-1 rounded border border-rose-400/40 bg-rose-500/[0.1] px-1.5 py-px font-mono text-[10.5px] uppercase tracking-wider text-rose-200"
      >
        <XCircle className="h-3 w-3" /> TradingView Failed
      </span>
    );
  }
  return (
    <span
      data-tradingview-status="no-pair"
      className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-500/[0.08] px-1.5 py-px font-mono text-[10.5px] uppercase tracking-wider text-amber-200"
    >
      TradingView · no Binance pair
    </span>
  );
}
