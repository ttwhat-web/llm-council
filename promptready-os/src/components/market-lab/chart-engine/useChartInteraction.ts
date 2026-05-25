"use client";

/**
 * Chart interaction hook · owns viewport + hover state, returns
 * pointer/wheel/keyboard handlers. The hook does NOT touch the
 * canvas — it just gives the consumer a fresh viewport whenever the
 * user interacts.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampViewport,
  defaultViewport,
  indexForX,
  panViewport,
  zoomViewport
} from "./chartMath";
import type { Viewport } from "./types";

interface Options {
  candleCount: number;
  defaultVisible?: number;
  width: number;
}

export function useChartInteraction({
  candleCount,
  defaultVisible = 120,
  width
}: Options) {
  const [vp, setVp] = useState<Viewport>(() =>
    defaultViewport(candleCount, defaultVisible)
  );
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const draggingRef = useRef<{ startX: number; startVp: Viewport } | null>(null);

  // Stick to the right edge when new candles arrive · if we were already there.
  const wasAtRightRef = useRef(true);
  useEffect(() => {
    if (candleCount === 0) {
      setVp({ startIdx: 0, endIdx: 0 });
      return;
    }
    setVp((prev: Viewport) => {
      const span = prev.endIdx - prev.startIdx;
      const atRight = prev.endIdx >= candleCount - 1;
      if (atRight || wasAtRightRef.current) {
        wasAtRightRef.current = true;
        const end = candleCount;
        const start = Math.max(0, end - Math.max(span, 10));
        return { startIdx: start, endIdx: end };
      }
      return clampViewport(prev, candleCount, Math.max(10, span));
    });
  }, [candleCount]);

  const reset = useCallback(() => {
    setVp(defaultViewport(candleCount, defaultVisible));
    wasAtRightRef.current = true;
  }, [candleCount, defaultVisible]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (candleCount === 0) return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const anchor = Math.max(0, Math.min(1, localX / rect.width));
      // wheel up (deltaY < 0) → zoom in
      const factor = e.deltaY < 0 ? 0.85 : 1.18;
      setVp((prev: Viewport) => {
        const next = zoomViewport(prev, factor, anchor, candleCount);
        wasAtRightRef.current = next.endIdx >= candleCount - 1;
        return next;
      });
    },
    [candleCount]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = { startX: e.clientX, startVp: vp };
  }, [vp]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const drag = draggingRef.current;
      if (drag) {
        const dxPx = e.clientX - drag.startX;
        const span = drag.startVp.endIdx - drag.startVp.startIdx;
        const deltaIdx = -(dxPx / rect.width) * span;
        const next = panViewport(drag.startVp, deltaIdx, candleCount);
        wasAtRightRef.current = next.endIdx >= candleCount - 1;
        setVp(next);
      } else {
        // hover index — round to nearest candle inside the viewport.
        const ix = indexForX(localX, vp, rect.width);
        const idx = Math.round(ix);
        if (idx >= vp.startIdx && idx < vp.endIdx && idx < candleCount) setHoverIdx(idx);
        else setHoverIdx(null);
      }
    },
    [candleCount, vp]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    draggingRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  const onPointerLeave = useCallback(() => {
    setHoverIdx(null);
    draggingRef.current = null;
  }, []);

  const onDoubleClick = useCallback(() => reset(), [reset]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (candleCount === 0) return;
      const span = vp.endIdx - vp.startIdx;
      switch (e.key) {
        case "+":
        case "=":
          e.preventDefault();
          setVp((prev) => zoomViewport(prev, 0.8, 0.5, candleCount));
          break;
        case "-":
        case "_":
          e.preventDefault();
          setVp((prev) => zoomViewport(prev, 1.25, 0.5, candleCount));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setVp((prev) => panViewport(prev, -Math.max(1, span * 0.1), candleCount));
          wasAtRightRef.current = false;
          break;
        case "ArrowRight":
          e.preventDefault();
          setVp((prev) => panViewport(prev, Math.max(1, span * 0.1), candleCount));
          break;
        case "r":
        case "R":
          e.preventDefault();
          reset();
          break;
      }
    },
    [candleCount, reset, vp]
  );

  return {
    viewport: vp,
    setViewport: setVp,
    hoverIdx,
    reset,
    width,
    handlers: {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave,
      onDoubleClick,
      onKeyDown
    }
  };
}
