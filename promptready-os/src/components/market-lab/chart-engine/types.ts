/**
 * Custom chart engine · shared types.
 *
 * The engine is canvas-based, framework-agnostic from these types,
 * and never fabricates a candle or overlay value. All series must
 * be the same length as `candles`. NaN is the only valid "no value
 * yet" marker — never zero.
 */

export interface Candle {
  t: number; // ms epoch
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Viewport {
  /** Inclusive start index into the candle array. */
  startIdx: number;
  /** Exclusive end index. */
  endIdx: number;
}

export interface PriceRange {
  min: number;
  max: number;
}

export type Overlay =
  | { kind: "line"; values: number[]; label: string; color: string }
  | {
      kind: "bands";
      upper: number[];
      mid: number[];
      lower: number[];
      label: string;
      color: string;
    };

export interface Hline {
  value: number;
  label: string;
  color: string;
}

export interface RsiPaneData {
  plots: Array<{ values: number[]; label: string; color: string }>;
  hlines: Array<{ value: number; label: string; color: string }>;
}

export interface CrosshairInfo {
  idx: number;
  x: number;
  y: number;
  candle: Candle;
}
