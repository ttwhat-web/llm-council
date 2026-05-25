/**
 * Chart math · pure functions on the viewport / price-range model.
 *
 * No DOM. No canvas. No React. All inputs are simple numbers and arrays.
 */

import type { Candle, Overlay, PriceRange, Viewport } from "./types";

/** Build the default right-anchored viewport showing the last `visible` bars. */
export function defaultViewport(total: number, visible = 120): Viewport {
  const endIdx = total;
  const startIdx = Math.max(0, total - visible);
  return { startIdx, endIdx };
}

/** Min/max price across the visible candles + visible overlay values, padded 5%. */
export function priceRange(
  candles: Candle[],
  vp: Viewport,
  overlays: Overlay[] = []
): PriceRange {
  let min = Infinity;
  let max = -Infinity;
  const a = Math.max(0, Math.floor(vp.startIdx));
  const b = Math.min(candles.length, Math.ceil(vp.endIdx));
  for (let i = a; i < b; i++) {
    const c = candles[i];
    if (!c) continue;
    if (c.low < min) min = c.low;
    if (c.high > max) max = c.high;
  }
  for (const o of overlays) {
    const fields =
      o.kind === "line" ? [o.values] : [o.upper, o.mid, o.lower];
    for (const arr of fields) {
      for (let i = a; i < b; i++) {
        const v = arr[i];
        if (Number.isFinite(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) {
    const eps = Math.abs(min) * 0.005 || 1;
    min -= eps;
    max += eps;
  }
  const span = max - min;
  return { min: min - span * 0.05, max: max + span * 0.05 };
}

/** Pixel X for a fractional candle index. */
export function xForIndex(idx: number, vp: Viewport, width: number): number {
  const span = vp.endIdx - vp.startIdx;
  if (span <= 0) return 0;
  return ((idx - vp.startIdx) / span) * width;
}

/** Fractional candle index for a pixel X. */
export function indexForX(x: number, vp: Viewport, width: number): number {
  const span = vp.endIdx - vp.startIdx;
  if (span <= 0) return vp.startIdx;
  return vp.startIdx + (x / width) * span;
}

/** Pixel Y for a price within the price range. */
export function yForPrice(
  price: number,
  range: PriceRange,
  height: number,
  padTop = 0,
  padBottom = 0
): number {
  const usable = Math.max(1, height - padTop - padBottom);
  return padTop + usable - ((price - range.min) / (range.max - range.min)) * usable;
}

/** Inverse of yForPrice — useful for pinch-zoom or scale-aware crosshair. */
export function priceForY(
  y: number,
  range: PriceRange,
  height: number,
  padTop = 0,
  padBottom = 0
): number {
  const usable = Math.max(1, height - padTop - padBottom);
  return (
    range.min + ((padTop + usable - y) / usable) * (range.max - range.min)
  );
}

const MIN_SPAN = 10;

/** Clamp viewport to [0,total]. */
export function clampViewport(
  vp: Viewport,
  total: number,
  minSpan = MIN_SPAN
): Viewport {
  if (total <= 0) return { startIdx: 0, endIdx: 0 };
  let span = vp.endIdx - vp.startIdx;
  if (span < minSpan) span = Math.min(minSpan, total);
  if (span > total) span = total;
  let start = vp.startIdx;
  let end = start + span;
  if (start < 0) {
    start = 0;
    end = span;
  }
  if (end > total) {
    end = total;
    start = total - span;
  }
  return { startIdx: start, endIdx: end };
}

/** Zoom by `factor` (`< 1` zooms in, `> 1` zooms out). Anchor in [0,1]. */
export function zoomViewport(
  vp: Viewport,
  factor: number,
  anchor: number,
  total: number
): Viewport {
  const span = vp.endIdx - vp.startIdx;
  const newSpan = Math.max(MIN_SPAN, Math.min(total, span * factor));
  const anchorIdx = vp.startIdx + span * anchor;
  const start = anchorIdx - newSpan * anchor;
  return clampViewport({ startIdx: start, endIdx: start + newSpan }, total);
}

/** Pan by a fractional candle delta (positive = right). */
export function panViewport(
  vp: Viewport,
  deltaIdx: number,
  total: number
): Viewport {
  const span = vp.endIdx - vp.startIdx;
  return clampViewport(
    { startIdx: vp.startIdx + deltaIdx, endIdx: vp.endIdx + deltaIdx },
    total,
    span
  );
}

/** "Nice" tick step for a range. Returns step + first tick price. */
export function niceTicks(min: number, max: number, target = 6): number[] {
  const span = max - min;
  if (span <= 0) return [min];
  const rough = span / target;
  const exp = Math.floor(Math.log10(rough));
  const base = Math.pow(10, exp);
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * base);
  const step =
    candidates.find((c) => c >= rough) ?? candidates[candidates.length - 1];
  const first = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = first; v <= max; v += step) {
    out.push(Number(v.toFixed(10)));
  }
  return out;
}

/** Format a price with adaptive precision. */
export function formatPrice(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (Math.abs(v) >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

/** Format a UTC time short label. */
export function formatTime(t: number, interval: string): string {
  const d = new Date(t);
  if (interval === "1m" || interval === "5m" || interval === "15m") {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (interval === "1h" || interval === "4h") {
    return d.toLocaleString("en-GB", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return d.toLocaleDateString("en-GB", { month: "short", day: "2-digit" });
}
