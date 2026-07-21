# Market Lab Crash Audit

## Root Cause

`ChartCanvas.drawChart` used viewport indexes directly while candle data could update underneath it. When the viewport end/start drifted outside the candle array, the volume pass read `candles[i].volume` before confirming `candles[i]` existed, causing Market Lab to crash.

## Files Changed

- `promptready-os/src/components/market-lab/chart-engine/ChartCanvas.tsx`
- `promptready-os/src/components/market-lab/chart-engine/chartMath.ts`
- `promptready-os/src/components/market-lab/chart-engine/useChartInteraction.ts`
- `promptready-os/src/routes.tsx`

## Before

- Draw loops mixed exclusive viewport bounds with direct array reads.
- Volume max used `candles[i].volume` without first validating `candles[i]`.
- Overlay and RSI loops trusted array lengths.
- Malformed provider candles could enter chart state.
- A render crash on `/market-lab` could show the raw React/Vite crash screen.

## After

- Visible draw indexes are clamped before rendering.
- Candle loops use `const candle = candles[i]; if (!candle) continue;`.
- Volume, overlays, bands, RSI plots, and hlines ignore missing or non-finite values.
- Incomplete provider candles render `chart data unavailable · provider returned incomplete candles`.
- `/market-lab` has a route-level error element so the app shows a controlled inline recovery panel.
