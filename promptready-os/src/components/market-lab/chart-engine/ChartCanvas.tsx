"use client";

/**
 * Custom canvas chart engine.
 *
 * - Pure React + HTML5 canvas. No lightweight-charts, no TradingView.
 * - Renders real OHLC candles from Binance.
 * - Mouse: wheel zoom, drag pan, double-click reset, hover tooltip.
 * - Keyboard: +/- zoom, arrows pan, R reset.
 * - Overlays from Script Lab: SMA / EMA lines, Bollinger bands, hlines.
 * - Optional lower pane (RSI etc) rendered in a second canvas.
 * - No fake fallback: when no Binance pair exists, an adapter-ready
 *   cell replaces the chart.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  fetchKlines,
  binancePairFor,
  type Candle as BinanceCandle,
  type BinanceInterval
} from "@/services/providers/binance";
import { useChartInteraction } from "./useChartInteraction";
import {
  formatPrice,
  formatTime,
  niceTicks,
  priceRange,
  xForIndex,
  yForPrice
} from "./chartMath";
import type { Candle, Hline, Overlay, RsiPaneData } from "./types";

const INTERVALS: Array<{ id: BinanceInterval; label: string }> = [
  { id: "1m", label: "1m" },
  { id: "5m", label: "5m" },
  { id: "15m", label: "15m" },
  { id: "1h", label: "1h" },
  { id: "4h", label: "4h" },
  { id: "1d", label: "1D" }
];

interface Props {
  symbol: string;
  height?: number;
  compact?: boolean;
  initialInterval?: BinanceInterval;
  onCandles?: (candles: Candle[]) => void;
  overlays?: Overlay[];
  hlinesMain?: Hline[];
  rsi?: RsiPaneData | null;
  /** When true, the chart container is allowed to grab keyboard focus. */
  focusable?: boolean;
}

interface State {
  loading: boolean;
  error: string | null;
  candles: Candle[];
  fetchedAt: number | null;
}

const PAD_RIGHT = 56; // price axis width
const PAD_BOTTOM = 22; // time axis height
const PAD_TOP = 6;
const PAD_LEFT = 0;
const VOL_FRACTION = 0.22; // bottom 22% of the chart for volume
const RSI_HEIGHT = 110;

export function ChartCanvas({
  symbol,
  height = 480,
  compact = false,
  initialInterval = "1h",
  onCandles,
  overlays,
  hlinesMain,
  rsi,
  focusable = true
}: Props) {
  const pair = binancePairFor(symbol);
  const [interval, setInterval] = useState<BinanceInterval>(initialInterval);
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    candles: [],
    fetchedAt: null
  });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rsiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Resize tracking · cssWidth × cssHeight in CSS pixels.
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 600, h: 320 });
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const target = rsi ? Math.max(120, r.height - RSI_HEIGHT - 4) : r.height;
      setSize({ w: r.width, h: target });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rsi != null]);

  // Fetch candles · poll every 30s.
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
          const candles: Candle[] = r.candles as BinanceCandle[];
          setState({ loading: false, error: null, candles, fetchedAt: r.at });
          onCandles?.(candles);
        } else {
          setState((prev) => ({ ...prev, loading: false, error: r.error ?? "fetch failed", fetchedAt: r.at }));
        }
      });
    };
    poll();
    const t = window.setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, interval]);

  const { viewport, hoverIdx, handlers } = useChartInteraction({
    candleCount: state.candles.length,
    defaultVisible: compact ? 90 : 140,
    width: size.w
  });

  // Compute price range for visible candles + overlays.
  const range = useMemo(
    () => priceRange(state.candles, viewport, overlays ?? []),
    [state.candles, viewport, overlays]
  );

  // Main canvas redraw.
  useLayoutEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(60, size.w);
    const cssH = Math.max(80, size.h);
    if (c.width !== Math.floor(cssW * dpr) || c.height !== Math.floor(cssH * dpr)) {
      c.width = Math.floor(cssW * dpr);
      c.height = Math.floor(cssH * dpr);
      c.style.width = `${cssW}px`;
      c.style.height = `${cssH}px`;
    }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    if (state.candles.length === 0) return;
    drawChart({
      ctx,
      width: cssW,
      height: cssH,
      candles: state.candles,
      vp: viewport,
      range,
      overlays: overlays ?? [],
      hlines: hlinesMain ?? [],
      hoverIdx,
      compact,
      interval
    });
  }, [state.candles, viewport, range, overlays, hlinesMain, hoverIdx, size, compact, interval]);

  // RSI lower pane redraw.
  useLayoutEffect(() => {
    const c = rsiCanvasRef.current;
    if (!c || !rsi) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(60, size.w);
    const cssH = RSI_HEIGHT;
    if (c.width !== Math.floor(cssW * dpr) || c.height !== Math.floor(cssH * dpr)) {
      c.width = Math.floor(cssW * dpr);
      c.height = Math.floor(cssH * dpr);
      c.style.width = `${cssW}px`;
      c.style.height = `${cssH}px`;
    }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    if (state.candles.length === 0) return;
    drawRsiPane({
      ctx,
      width: cssW,
      height: cssH,
      vp: viewport,
      rsi,
      hoverIdx
    });
  }, [state.candles, viewport, rsi, size, hoverIdx]);

  if (!pair) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-white/12 bg-white/[0.012] text-center"
        style={{ minHeight: height }}
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
          no Binance pair for {symbol}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
          OHLC adapter-ready · equities / FX / commodities pending provider
        </span>
      </div>
    );
  }

  const last = state.candles[state.candles.length - 1];
  const hovered = hoverIdx != null ? state.candles[hoverIdx] : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      {/* compact header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/85">
            {symbol}/USDT
          </span>
          {last && (
            <span
              className={clsx(
                "rounded border px-1.5 py-px font-mono text-[10.5px] tabular-nums",
                last.close >= last.open
                  ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-300"
                  : "border-rose-400/30 bg-rose-500/[0.08] text-rose-300"
              )}
              title="last close"
            >
              {formatPrice(last.close)}
            </span>
          )}
          {overlays && overlays.length > 0 && (
            <span className="rounded border border-accent/30 bg-accent/[0.08] px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-accent">
              {overlays.length} overlay
            </span>
          )}
        </div>
        {!compact && (
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
                    title={`Interval ${iv.label} · Binance · WORKS`}
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
        )}
      </div>

      <div
        ref={containerRef}
        tabIndex={focusable ? 0 : -1}
        aria-label={`${symbol} chart · wheel = zoom · drag = pan · double-click = reset · R / arrows / + - keyboard`}
        className="relative flex min-h-0 flex-1 flex-col gap-1 rounded-md border border-white/10 bg-black/60 outline-none focus-visible:border-accent/40"
        onWheel={handlers.onWheel}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerLeave={handlers.onPointerLeave}
        onDoubleClick={handlers.onDoubleClick}
        onKeyDown={handlers.onKeyDown}
        style={{ height }}
      >
        <canvas ref={canvasRef} style={{ flexShrink: 0, cursor: "crosshair" }} />
        {rsi && (
          <canvas
            ref={rsiCanvasRef}
            style={{ flexShrink: 0, cursor: "crosshair" }}
          />
        )}
        {hovered && !compact && (
          <TooltipBadge candle={hovered} interval={interval} />
        )}
      </div>
    </div>
  );
}

function TooltipBadge({ candle, interval }: { candle: Candle; interval: BinanceInterval }) {
  const up = candle.close >= candle.open;
  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-wrap items-center gap-1 rounded-md border border-white/10 bg-black/80 px-2 py-1 font-mono text-[10px] tabular-nums text-white/85 backdrop-blur">
      <span className="text-white/50">{formatTime(candle.t, interval)}</span>
      <span className="text-white/40">O</span>
      <span>{formatPrice(candle.open)}</span>
      <span className="text-white/40">H</span>
      <span>{formatPrice(candle.high)}</span>
      <span className="text-white/40">L</span>
      <span>{formatPrice(candle.low)}</span>
      <span className="text-white/40">C</span>
      <span className={up ? "text-emerald-300" : "text-rose-300"}>{formatPrice(candle.close)}</span>
      <span className="text-white/40">V</span>
      <span>{candle.volume.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draw routines
// ---------------------------------------------------------------------------

interface DrawArgs {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  candles: Candle[];
  vp: import("./types").Viewport;
  range: import("./types").PriceRange;
  overlays: Overlay[];
  hlines: Hline[];
  hoverIdx: number | null;
  compact: boolean;
  interval: BinanceInterval;
}

function drawChart({
  ctx,
  width,
  height,
  candles,
  vp,
  range,
  overlays,
  hlines,
  hoverIdx,
  compact,
  interval
}: DrawArgs) {
  const plotRight = width - PAD_RIGHT;
  const plotBottom = height - PAD_BOTTOM;
  const plotTop = PAD_TOP;
  const plotHeight = plotBottom - plotTop;
  const volumeTop = plotBottom - plotHeight * VOL_FRACTION;
  const priceHeight = volumeTop - plotTop;

  // Background.
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, width, height);

  // Horizontal price gridlines.
  const ticks = niceTicks(range.min, range.max, compact ? 4 : 6);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  for (const t of ticks) {
    const y = yForPrice(t, range, priceHeight, plotTop, 0);
    if (y < plotTop || y > volumeTop) continue;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(formatPrice(t), plotRight + 4, y);
  }

  // Vertical time gridlines · pick ~5 visible candle indices.
  const span = vp.endIdx - vp.startIdx;
  const stepIdx = Math.max(1, Math.floor(span / (compact ? 4 : 6)));
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  for (let i = Math.ceil(vp.startIdx / stepIdx) * stepIdx; i < vp.endIdx; i += stepIdx) {
    const candle = candles[i];
    if (!candle) continue;
    const x = xForIndex(i, vp, plotRight);
    ctx.beginPath();
    ctx.moveTo(x, plotTop);
    ctx.lineTo(x, plotBottom);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(formatTime(candle.t, interval), x, height - 6);
  }

  // Volume bars.
  let volMax = 0;
  for (let i = Math.max(0, vp.startIdx); i < Math.min(candles.length, vp.endIdx); i++) {
    if (candles[i].volume > volMax) volMax = candles[i].volume;
  }
  const candleSpan = (plotRight - PAD_LEFT) / span;
  const bodyW = Math.max(1, candleSpan * 0.72);
  for (let i = Math.max(0, vp.startIdx); i < Math.min(candles.length, vp.endIdx); i++) {
    const c = candles[i];
    const x = xForIndex(i + 0.5, vp, plotRight) - bodyW / 2;
    const h = volMax > 0 ? (c.volume / volMax) * (plotBottom - volumeTop - 2) : 0;
    ctx.fillStyle =
      c.close >= c.open ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)";
    ctx.fillRect(x, plotBottom - h, bodyW, h);
  }

  // hlines on main pane.
  for (const h of hlines) {
    if (h.value < range.min || h.value > range.max) continue;
    const y = yForPrice(h.value, range, priceHeight, plotTop, 0);
    ctx.strokeStyle = h.color;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = h.color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(h.label, PAD_LEFT + 4, y - 8);
  }

  // Overlays (lines + bands), drawn before candles so candles overdraw.
  for (const o of overlays) {
    ctx.strokeStyle = o.color;
    ctx.lineWidth = 2;
    if (o.kind === "line") {
      drawSeries(ctx, o.values, vp, plotRight, range, priceHeight, plotTop);
    } else {
      // Upper / lower dashed, mid solid, optional fill between.
      ctx.fillStyle = `${o.color}1a`; // ~10% alpha when hex; rgb() lengths vary so this is best-effort
      drawBandFill(ctx, o.upper, o.lower, vp, plotRight, range, priceHeight, plotTop);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      drawSeries(ctx, o.upper, vp, plotRight, range, priceHeight, plotTop);
      drawSeries(ctx, o.lower, vp, plotRight, range, priceHeight, plotTop);
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      drawSeries(ctx, o.mid, vp, plotRight, range, priceHeight, plotTop);
    }
  }

  // Candles.
  for (let i = Math.max(0, vp.startIdx); i < Math.min(candles.length, vp.endIdx); i++) {
    const c = candles[i];
    const cx = xForIndex(i + 0.5, vp, plotRight);
    const x = cx - bodyW / 2;
    const isUp = c.close >= c.open;
    const color = isUp ? "rgb(52,211,153)" : "rgb(248,113,113)";
    const yOpen = yForPrice(c.open, range, priceHeight, plotTop, 0);
    const yClose = yForPrice(c.close, range, priceHeight, plotTop, 0);
    const yHigh = yForPrice(c.high, range, priceHeight, plotTop, 0);
    const yLow = yForPrice(c.low, range, priceHeight, plotTop, 0);
    const bodyTop = Math.min(yOpen, yClose);
    const bodyH = Math.max(1, Math.abs(yClose - yOpen));
    // wick
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, yHigh);
    ctx.lineTo(cx, yLow);
    ctx.stroke();
    // body
    ctx.fillStyle = color;
    ctx.fillRect(x, bodyTop, bodyW, bodyH);
  }

  // Crosshair on hover.
  if (hoverIdx != null) {
    const c = candles[hoverIdx];
    if (c) {
      const cx = xForIndex(hoverIdx + 0.5, vp, plotRight);
      const cy = yForPrice(c.close, range, priceHeight, plotTop, 0);
      ctx.strokeStyle = "rgba(124,155,255,0.55)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, plotTop);
      ctx.lineTo(cx, plotBottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(plotRight, cy);
      ctx.stroke();
      ctx.setLineDash([]);
      // Price chip on right axis.
      ctx.fillStyle = "rgba(124,155,255,0.85)";
      ctx.fillRect(plotRight, cy - 8, PAD_RIGHT, 16);
      ctx.fillStyle = "rgb(2,4,10)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(formatPrice(c.close), plotRight + 4, cy);
    }
  }

  // Vertical separator at right axis edge.
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(plotRight, plotTop);
  ctx.lineTo(plotRight, plotBottom);
  ctx.stroke();
}

function drawSeries(
  ctx: CanvasRenderingContext2D,
  values: number[],
  vp: import("./types").Viewport,
  plotRight: number,
  range: import("./types").PriceRange,
  priceHeight: number,
  plotTop: number
) {
  ctx.beginPath();
  let started = false;
  for (let i = Math.max(0, vp.startIdx); i < Math.min(values.length, vp.endIdx); i++) {
    const v = values[i];
    if (!Number.isFinite(v)) {
      started = false;
      continue;
    }
    const x = xForIndex(i + 0.5, vp, plotRight);
    const y = yForPrice(v, range, priceHeight, plotTop, 0);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

function drawBandFill(
  ctx: CanvasRenderingContext2D,
  upper: number[],
  lower: number[],
  vp: import("./types").Viewport,
  plotRight: number,
  range: import("./types").PriceRange,
  priceHeight: number,
  plotTop: number
) {
  ctx.beginPath();
  let started = false;
  for (let i = Math.max(0, vp.startIdx); i < Math.min(upper.length, vp.endIdx); i++) {
    const v = upper[i];
    if (!Number.isFinite(v)) continue;
    const x = xForIndex(i + 0.5, vp, plotRight);
    const y = yForPrice(v, range, priceHeight, plotTop, 0);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  for (let i = Math.min(lower.length, vp.endIdx) - 1; i >= Math.max(0, vp.startIdx); i--) {
    const v = lower[i];
    if (!Number.isFinite(v)) continue;
    const x = xForIndex(i + 0.5, vp, plotRight);
    const y = yForPrice(v, range, priceHeight, plotTop, 0);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

interface RsiArgs {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  vp: import("./types").Viewport;
  rsi: RsiPaneData;
  hoverIdx: number | null;
}

function drawRsiPane({ ctx, width, height, vp, rsi, hoverIdx }: RsiArgs) {
  const plotRight = width - PAD_RIGHT;
  const top = 2;
  const bottom = height - 2;

  // Compute range from plot series + hline values.
  let min = Infinity;
  let max = -Infinity;
  for (const p of rsi.plots) {
    for (let i = vp.startIdx; i < vp.endIdx; i++) {
      const v = p.values[i];
      if (Number.isFinite(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  }
  for (const h of rsi.hlines) {
    if (h.value < min) min = h.value;
    if (h.value > max) max = h.value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 100;
  }
  const pad = (max - min) * 0.1 || 1;
  min -= pad;
  max += pad;
  const range = { min, max };
  const heightPx = bottom - top;

  // Background.
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, width, height);

  // hlines.
  for (const h of rsi.hlines) {
    const y = yForPrice(h.value, range, heightPx, top, 0);
    ctx.strokeStyle = h.color;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = h.color;
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${h.label} ${h.value.toFixed(0)}`, 4, y - 8);
  }

  // Plot lines.
  for (const p of rsi.plots) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    drawSeries(ctx, p.values, vp, plotRight, range, heightPx, top);
  }

  // Right-axis labels.
  const ticks = niceTicks(range.min, range.max, 3);
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (const t of ticks) {
    const y = yForPrice(t, range, heightPx, top, 0);
    ctx.fillText(formatPrice(t), plotRight + 4, y);
  }

  // Crosshair.
  if (hoverIdx != null) {
    const cx = xForIndex(hoverIdx + 0.5, vp, plotRight);
    ctx.strokeStyle = "rgba(124,155,255,0.55)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
