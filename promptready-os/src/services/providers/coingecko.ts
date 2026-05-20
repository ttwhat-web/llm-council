/**
 * CoinGecko provider · Sprint C · first REAL market feed.
 *
 * Public API · no key required · CORS-enabled (works from the browser).
 * We fetch live USD price, 24h change and market cap for a fixed coin
 * set. NO fake prices: on any failure we record the error and return
 * ok:false so the UI shows "error" / "offline" honestly.
 *
 * Rate limits: the free endpoint allows a handful of calls per minute;
 * a 429 surfaces as a recorded "rate limited" error.
 */

import { recordSuccess, recordError } from "@/services/providerHealth";
import { recordSamples } from "@/services/marketSamples";

export const COINGECKO_ADAPTER_ID = "coingecko";

const ENDPOINT = "https://api.coingecko.com/api/v3/simple/price";

export interface CoinDef {
  id: string; // CoinGecko id
  symbol: string;
  name: string;
}

export const COINS: CoinDef[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "ripple", symbol: "XRP", name: "XRP" }
];

export interface CryptoQuote {
  symbol: string;
  name: string;
  price: number | null;
  change24h: number | null;
  marketCap: number | null;
}

export interface CryptoFetchResult {
  ok: boolean;
  quotes: CryptoQuote[];
  error?: string;
  at: number;
}

type SimplePriceResponse = Record<
  string,
  { usd?: number; usd_24h_change?: number; usd_market_cap?: number }
>;

export async function fetchCryptoPrices(): Promise<CryptoFetchResult> {
  const ids = COINS.map((c) => c.id).join(",");
  const url = `${ENDPOINT}?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
  const startedAt = Date.now();
  try {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (r.status === 429) throw new Error("rate limited (429) · try again shortly");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as SimplePriceResponse;
    const quotes: CryptoQuote[] = COINS.map((c) => ({
      symbol: c.symbol,
      name: c.name,
      price: j[c.id]?.usd ?? null,
      change24h: j[c.id]?.usd_24h_change ?? null,
      marketCap: j[c.id]?.usd_market_cap ?? null
    }));
    const anyData = quotes.some((q) => q.price != null);
    if (!anyData) throw new Error("empty response");
    recordSuccess(COINGECKO_ADAPTER_ID, Date.now() - startedAt);
    recordSamples(quotes.map((q) => ({ symbol: q.symbol, price: q.price })));
    return { ok: true, quotes, at: Date.now() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    recordError(COINGECKO_ADAPTER_ID, msg);
    return { ok: false, quotes: [], error: msg, at: Date.now() };
  }
}

export function formatPrice(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

export function formatChange(n: number | null): string {
  if (n == null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatMarketCap(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}
