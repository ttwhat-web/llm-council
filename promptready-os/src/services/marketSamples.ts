/**
 * Market samples · Sprint G.
 *
 * Stores REAL crypto price samples collected this session/device from
 * successful CoinGecko fetches, so the Market Pulse mini-chart has
 * something honest to plot. NO synthetic points — a sample is only ever
 * appended when a real fetch returned a real price. Capped ring buffer
 * per symbol in localStorage.
 */

const KEY = "promptready-os.market-samples";
const MAX_PER_SYMBOL = 60;

export interface Sample {
  t: number; // epoch ms
  price: number;
}

type Store = Record<string, Sample[]>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(s: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

/** Append real samples · only call with prices from a successful fetch. */
export function recordSamples(points: Array<{ symbol: string; price: number | null }>): void {
  const s = read();
  const now = Date.now();
  for (const p of points) {
    if (p.price == null || !Number.isFinite(p.price)) continue;
    const arr = s[p.symbol] ?? [];
    // de-dupe identical consecutive prices recorded within 2s
    const last = arr[arr.length - 1];
    if (last && last.price === p.price && now - last.t < 2000) continue;
    arr.push({ t: now, price: p.price });
    s[p.symbol] = arr.slice(-MAX_PER_SYMBOL);
  }
  write(s);
}

export function getSamples(symbol: string): Sample[] {
  return read()[symbol] ?? [];
}
