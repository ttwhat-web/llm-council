/**
 * Technical indicators · pure functions on number[] arrays.
 *
 * No external dependencies. All inputs may contain NaN for "no value
 * yet" slots; outputs likewise return NaN where there isn't enough
 * data. Length-mismatched outputs would break lightweight-charts so
 * every function returns an array the same length as the input.
 */

const NaNs = (n: number): number[] => new Array(n).fill(Number.NaN);

export function sma(source: number[], length: number): number[] {
  if (length <= 0 || source.length === 0) return NaNs(source.length);
  const out: number[] = new Array(source.length).fill(Number.NaN);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < source.length; i++) {
    const v = source[i];
    if (Number.isFinite(v)) {
      sum += v;
      count++;
    }
    if (i >= length) {
      const drop = source[i - length];
      if (Number.isFinite(drop)) {
        sum -= drop;
        count--;
      }
    }
    if (i >= length - 1 && count === length) out[i] = sum / length;
  }
  return out;
}

export function ema(source: number[], length: number): number[] {
  if (length <= 0 || source.length === 0) return NaNs(source.length);
  const out: number[] = new Array(source.length).fill(Number.NaN);
  const k = 2 / (length + 1);
  // Seed EMA with the SMA of the first `length` valid values.
  let seedSum = 0;
  let seedCount = 0;
  let prev = Number.NaN;
  for (let i = 0; i < source.length; i++) {
    const v = source[i];
    if (!Number.isFinite(v)) continue;
    if (seedCount < length) {
      seedSum += v;
      seedCount++;
      if (seedCount === length) {
        prev = seedSum / length;
        out[i] = prev;
      }
    } else {
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

/** Wilder's RSI with smoothing (length-1)/length on gains and losses. */
export function rsi(source: number[], length: number): number[] {
  if (length <= 0 || source.length === 0) return NaNs(source.length);
  const out: number[] = new Array(source.length).fill(Number.NaN);
  let avgGain = 0;
  let avgLoss = 0;
  // Seed: simple average of first `length` diffs.
  let seeded = false;
  let seedSumGain = 0;
  let seedSumLoss = 0;
  let seedCount = 0;
  for (let i = 1; i < source.length; i++) {
    const prev = source[i - 1];
    const cur = source[i];
    if (!Number.isFinite(prev) || !Number.isFinite(cur)) continue;
    const diff = cur - prev;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    if (!seeded) {
      seedSumGain += gain;
      seedSumLoss += loss;
      seedCount++;
      if (seedCount === length) {
        avgGain = seedSumGain / length;
        avgLoss = seedSumLoss / length;
        seeded = true;
        const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
        out[i] = 100 - 100 / (1 + rs);
      }
    } else {
      avgGain = (avgGain * (length - 1) + gain) / length;
      avgLoss = (avgLoss * (length - 1) + loss) / length;
      const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
      out[i] = 100 - 100 / (1 + rs);
    }
  }
  return out;
}

function stddev(source: number[], length: number, mean: number[]): number[] {
  const out: number[] = new Array(source.length).fill(Number.NaN);
  for (let i = length - 1; i < source.length; i++) {
    const m = mean[i];
    if (!Number.isFinite(m)) continue;
    let sumSq = 0;
    let n = 0;
    for (let j = i - length + 1; j <= i; j++) {
      const v = source[j];
      if (!Number.isFinite(v)) continue;
      const d = v - m;
      sumSq += d * d;
      n++;
    }
    if (n === length) out[i] = Math.sqrt(sumSq / length);
  }
  return out;
}

export interface BollingerBands {
  upper: number[];
  mid: number[];
  lower: number[];
}

export function bb(source: number[], length: number, mult: number): BollingerBands {
  const mid = sma(source, length);
  const sd = stddev(source, length, mid);
  const upper: number[] = new Array(source.length).fill(Number.NaN);
  const lower: number[] = new Array(source.length).fill(Number.NaN);
  for (let i = 0; i < source.length; i++) {
    if (Number.isFinite(mid[i]) && Number.isFinite(sd[i])) {
      upper[i] = mid[i] + mult * sd[i];
      lower[i] = mid[i] - mult * sd[i];
    }
  }
  return { upper, mid, lower };
}
