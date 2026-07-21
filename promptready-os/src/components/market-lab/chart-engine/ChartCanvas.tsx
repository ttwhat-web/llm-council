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
const MALFORMED_CANDLES_MESSAGE =
  "chart data unavailable · provider returned incomplete candles";

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
  const [renderError, setRenderError] = useState<string | null>(null);
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
          const normalized = normalizeCandles(r.candles as BinanceCandle[]);
          if (normalized.malformed) {
            setState({
              loading: false,
              error: MALFORMED_CANDLES_MESSAGE,
              candles: [],
              fetchedAt: r.at
            });
            onCandles?.([]);
            return;
          }
          const candles = normalized.candles;
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
    if (state.candles.length === 0) {
      drawNoData(ctx, cssW, cssH, state.error ?? "chart data unavailable · no candles returned");
      return;
    }
    try {
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
      setRenderError(null);
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "chart rendering failed");
      drawNoData(ctx, cssW, cssH, MALFORMED_CANDLES_MESSAGE);
    }
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
    try {
      drawRsiPane({
        ctx,
        width: cssW,
        height: cssH,
        vp: viewport,
        rsi,
        hoverIdx
      });
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "RSI rendering failed");
    }
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
  const hovered =
    hoverIdx != null && hoverIdx >= 0 && hoverIdx < state.candles.length
      ? state.candles[hoverIdx]
      : null;
  const noDataMessage =
    !state.loading && state.candles.length === 0
      ? state.error ?? "chart data unavailable · no candles returned"
      : null;
  const visibleChartError = renderError
    ? `${MALFORMED_CANDLES_MESSAGE} · ${renderError}`
    : noDataMessage;

  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col gap-1 overflow-hidden">
      {/* compact header strip */}
      <div className="flex max-w-full min-w-0 flex-wrap items-center justify-between gap-2 overflow-hidden">
        <div className="flex min-w-0 items-center gap-2">
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
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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
        className="relative flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-1 overflow-hidden rounded-md border border-white/10 bg-black/60 outline-none focus-visible:border-accent/40"
        onWheel={handlers.onWheel}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerLeave={handlers.onPointerLeave}
        onDoubleClick={handlers.onDoubleClick}
        onKeyDown={handlers.onKeyDown}
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          style={{ flexShrink: 0, cursor: "crosshair", maxWidth: "100%", minWidth: 0 }}
        />
        {rsi && (
          <canvas
            ref={rsiCanvasRef}
            style={{ flexShrink: 0, cursor: "crosshair", maxWidth: "100%", minWidth: 0 }}
          />
        )}
        {hovered && !compact && (
          <TooltipBadge candle={hovered} interval={interval} />
        )}
        {visibleChartError && (
          <div
            role={state.error || renderError ? "alert" : "status"}
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-blur-sm"
          >
            <div className="flex max-w-[80%] flex-col items-center gap-1 rounded border border-rose-400/40 bg-rose-500/[0.08] px-3 py-2 text-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-200">
                {renderError || state.error === MALFORMED_CANDLES_MESSAGE
                  ? MALFORMED_CANDLES_MESSAGE
                  : state.error
                    ? "binance fetch failed"
                    : "no chart data"}
              </span>
              <span className="break-all font-mono text-[11px] text-white/85">{visibleChartError}</span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
                {symbol} · {interval} · check network / API rate limit
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TooltipBadge({ candle, interval }: { candle: Candle; interval: BinanceInterval }) {
  const up = candle.close >= candle.open;
  const cell = (label: string, value: string, valueCls?: string) => (
    <div className="flex flex-col leading-tight">
      <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/40">{label}</span>
      <span className={clsx("font-mono text-[10.5px] tabular-nums", valueCls ?? "text-white/85")}>
        {value}
      </span>
    </div>
  );
  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-1 rounded-md border border-white/10 bg-black/80 px-2 py-1.5 backdrop-blur">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/55">
        {formatTime(candle.t, interval)}
      </span>
      <div className="flex items-end gap-3">
        {cell("o", formatPrice(candle.open))}
        {cell("h", formatPrice(candle.high))}
        {cell("l", formatPrice(candle.low))}
        {cell(
          "c",
          formatPrice(candle.close),
          up ? "text-emerald-300" : "text-rose-300"
        )}
        {cell("v", candle.volume.toLocaleString("en-US", { maximumFractionDigits: 2 }))}
      </div>
    </div>
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidCandle(value: unknown): value is Candle {
  if (!value || typeof value !== "object") return false;
  const candle = value as Partial<Candle>;
  return (
    isFiniteNumber(candle.t) &&
    isFiniteNumber(candle.open) &&
    isFiniteNumber(candle.high) &&
    isFiniteNumber(candle.low) &&
    isFiniteNumber(candle.close) &&
    isFiniteNumber(candle.volume)
  );
}

function normalizeCandles(input: unknown[]): { candles: Candle[]; malformed: boolean } {
  if (!Array.isArray(input)) return { candles: [], malformed: true };
  const candles: Candle[] = [];
  for (const item of input) {
    if (!isValidCandle(item)) return { candles: [], malformed: true };
    candles.push(item);
  }
  return { candles, malformed: false };
}

interface VisibleIndexes {
  start: number;
  end: number;
  vp: import("./types").Viewport;
  span: number;
}

function clampVisibleIndexes(
  length: number,
  vp: import("./types").Viewport
): VisibleIndexes | null {
  if (length <= 0) return null;
  const maxIdx = length - 1;
  const rawStart = Number.isFinite(vp.startIdx) ? Math.floor(vp.startIdx) : 0;
  const rawExclusiveEnd = Number.isFinite(vp.endIdx) ? Math.ceil(vp.endIdx) : length;
  const start = Math.max(0, Math.min(maxIdx, rawStart));
  const exclusiveEnd = Math.max(start + 1, Math.min(length, rawExclusiveEnd));
  const end = Math.max(start, Math.min(maxIdx, exclusiveEnd - 1));
  const safeVp = {
    startIdx: Math.max(0, Math.min(maxIdx, Number.isFinite(vp.startIdx) ? vp.startIdx : start)),
    endIdx: Math.max(start + 1, Math.min(length, Number.isFinite(vp.endIdx) ? vp.endIdx : end + 1))
  };
  const span = Math.max(1, safeVp.endIdx - safeVp.startIdx);
  return { start, end, vp: safeVp, span };
}

function drawNoData(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  message: string
) {
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, width / 2, height / 2);
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
  const visible = clampVisibleIndexes(candles.length, vp);
  if (!visible) {
    drawNoData(ctx, width, height, "chart data unavailable · no candles returned");
    return;
  }
  const safeVp = visible.vp;
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
  const span = visible.span;
  const stepIdx = Math.max(1, Math.floor(span / (compact ? 4 : 6)));
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  for (let i = Math.ceil(visible.start / stepIdx) * stepIdx; i <= visible.end; i += stepIdx) {
    const candle = candles[i];
    if (!candle) continue;
    const x = xForIndex(i, safeVp, plotRight);
    ctx.beginPath();
    ctx.moveTo(x, plotTop);
    ctx.lineTo(x, plotBottom);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(formatTime(candle.t, interval), x, height - 6);
  }

  // Volume bars.
  const visibleCandles: Array<{ i: number; candle: Candle }> = [];
  for (let i = visible.start; i <= visible.end; i++) {
    const candle = candles[i];
    if (!candle) continue;
    visibleCandles.push({ i, candle });
  }
  const volumeValues = visibleCandles
    .map(({ candle }) => candle.volume)
    .filter((value) => Number.isFinite(value) && value >= 0);
  const volMax = volumeValues.length > 0 ? Math.max(...volumeValues) : 0;
  const candleSpan = (plotRight - PAD_LEFT) / span;
  const bodyW = Math.max(1, candleSpan * 0.72);
  for (const { i, candle } of visibleCandles) {
    const x = xForIndex(i + 0.5, safeVp, plotRight) - bodyW / 2;
    const volume = Number.isFinite(candle.volume) && candle.volume >= 0 ? candle.volume : 0;
    const h = volMax > 0 ? (volume / volMax) * (plotBottom - volumeTop - 2) : 0;
    ctx.fillStyle =
      candle.close >= candle.open ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)";
    ctx.fillRect(x, plotBottom - h, bodyW, h);
  }

  // hlines on main pane.
  for (const h of hlines) {
    if (!Number.isFinite(h.value)) continue;
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
      drawSeries(ctx, o.values, safeVp, plotRight, range, priceHeight, plotTop);
    } else {
      // Upper / lower dashed, mid solid, optional fill between.
      ctx.fillStyle = `${o.color}1a`; // ~10% alpha when hex; rgb() lengths vary so this is best-effort
      drawBandFill(ctx, o.upper, o.lower, safeVp, plotRight, range, priceHeight, plotTop);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      drawSeries(ctx, o.upper, safeVp, plotRight, range, priceHeight, plotTop);
      drawSeries(ctx, o.lower, safeVp, plotRight, range, priceHeight, plotTop);
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      drawSeries(ctx, o.mid, safeVp, plotRight, range, priceHeight, plotTop);
    }
  }

  // Candles.
  for (let i = visible.start; i <= visible.end; i++) {
    const candle = candles[i];
    if (!candle) continue;
    const cx = xForIndex(i + 0.5, safeVp, plotRight);
    const x = cx - bodyW / 2;
    const isUp = candle.close >= candle.open;
    const color = isUp ? "rgb(52,211,153)" : "rgb(248,113,113)";
    const yOpen = yForPrice(candle.open, range, priceHeight, plotTop, 0);
    const yClose = yForPrice(candle.close, range, priceHeight, plotTop, 0);
    const yHigh = yForPrice(candle.high, range, priceHeight, plotTop, 0);
    const yLow = yForPrice(candle.low, range, priceHeight, plotTop, 0);
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
  if (hoverIdx != null && hoverIdx >= visible.start && hoverIdx <= visible.end) {
    const candle = candles[hoverIdx];
    if (candle) {
      const cx = xForIndex(hoverIdx + 0.5, safeVp, plotRight);
      const cy = yForPrice(candle.close, range, priceHeight, plotTop, 0);
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
      ctx.fillText(formatPrice(candle.close), plotRight + 4, cy);
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
  if (!Array.isArray(values)) return;
  const visible = clampVisibleIndexes(values.length, vp);
  if (!visible) return;
  ctx.beginPath();
  let started = false;
  for (let i = visible.start; i <= visible.end; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) {
      started = false;
      continue;
    }
    const x = xForIndex(i + 0.5, visible.vp, plotRight);
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
  if (!Array.isArray(upper) || !Array.isArray(lower)) return;
  const visible = clampVisibleIndexes(Math.max(upper.length, lower.length), vp);
  if (!visible) return;
  ctx.beginPath();
  let started = false;
  for (let i = visible.start; i <= visible.end; i++) {
    const v = upper[i];
    if (!Number.isFinite(v)) continue;
    const x = xForIndex(i + 0.5, visible.vp, plotRight);
    const y = yForPrice(v, range, priceHeight, plotTop, 0);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  if (!started) return;
  let lowerStarted = false;
  for (let i = visible.end; i >= visible.start; i--) {
    const v = lower[i];
    if (!Number.isFinite(v)) continue;
    const x = xForIndex(i + 0.5, visible.vp, plotRight);
    const y = yForPrice(v, range, priceHeight, plotTop, 0);
    ctx.lineTo(x, y);
    lowerStarted = true;
  }
  if (!lowerStarted) return;
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
  const rsiPlots = Array.isArray(rsi.plots) ? rsi.plots : [];
  const rsiHlines = Array.isArray(rsi.hlines) ? rsi.hlines : [];
  const rsiLength = Math.max(
    0,
    ...rsiPlots.map((plot) => (Array.isArray(plot.values) ? plot.values.length : 0))
  );
  const visible = clampVisibleIndexes(rsiLength, vp);
  const safeVp = visible?.vp ?? { startIdx: 0, endIdx: 1 };

  // Compute range from plot series + hline values.
  let min = Infinity;
  let max = -Infinity;
  for (const p of rsiPlots) {
    if (!Array.isArray(p.values)) continue;
    if (!visible) continue;
    for (let i = visible.start; i <= visible.end; i++) {
      const v = p.values[i];
      if (Number.isFinite(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  }
  for (const h of rsiHlines) {
    if (!Number.isFinite(h.value)) continue;
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
  for (const h of rsiHlines) {
    if (!Number.isFinite(h.value)) continue;
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
  for (const p of rsiPlots) {
    if (!Array.isArray(p.values)) continue;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    drawSeries(ctx, p.values, safeVp, plotRight, range, heightPx, top);
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
  if (hoverIdx != null && visible && hoverIdx >= visible.start && hoverIdx <= visible.end) {
    const cx = xForIndex(hoverIdx + 0.5, safeVp, plotRight);
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
