/**
 * Binance public market data provider · CORS-friendly, no key required.
 *
 * Endpoints used (all under api.binance.com, all public):
 *   /api/v3/klines  · OHLCV candles
 *   /api/v3/depth   · level-2 order book
 *   /api/v3/trades  · recent aggregated trades (Time & Sales)
 *
 * No fake fallback. On any failure the fetch returns ok:false and the
 * caller is expected to render an honest "adapter-ready / offline" cell.
 * Provider health is recorded per call so the Market Lab status row
 * reflects real latency.
 */

import { recordSuccess, recordError } from "@/services/providerHealth";

export const BINANCE_ADAPTER_ID = "binance";

const BASE = "https://api.binance.com/api/v3";

export interface Candle {
  t: number; // ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KlinesResult {
  ok: boolean;
  candles: Candle[];
  error?: string;
  at: number;
}

export type BinanceInterval =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "1h"
  | "4h"
  | "1d"
  | "1w";

export async function fetchKlines(
  symbol: string,
  interval: BinanceInterval = "1h",
  limit = 500
): Promise<KlinesResult> {
  const url = `${BASE}/klines?symbol=${encodeURIComponent(
    symbol
  )}&interval=${interval}&limit=${limit}`;
  const startedAt = Date.now();
  try {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as Array<
      [number, string, string, string, string, string, ...unknown[]]
    >;
    const candles: Candle[] = j.map((row) => ({
      t: row[0],
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5])
    }));
    recordSuccess(BINANCE_ADAPTER_ID, Date.now() - startedAt);
    return { ok: true, candles, at: Date.now() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    recordError(BINANCE_ADAPTER_ID, msg);
    return { ok: false, candles: [], error: msg, at: Date.now() };
  }
}

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdateId: number;
}

export interface OrderBookResult {
  ok: boolean;
  book: OrderBook | null;
  error?: string;
  at: number;
}

export async function fetchOrderBook(
  symbol: string,
  limit: 5 | 10 | 20 | 50 | 100 = 20
): Promise<OrderBookResult> {
  const url = `${BASE}/depth?symbol=${encodeURIComponent(symbol)}&limit=${limit}`;
  const startedAt = Date.now();
  try {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as {
      lastUpdateId: number;
      bids: Array<[string, string]>;
      asks: Array<[string, string]>;
    };
    const book: OrderBook = {
      bids: j.bids.map(([p, s]) => ({ price: Number(p), size: Number(s) })),
      asks: j.asks.map(([p, s]) => ({ price: Number(p), size: Number(s) })),
      lastUpdateId: j.lastUpdateId
    };
    recordSuccess(BINANCE_ADAPTER_ID, Date.now() - startedAt);
    return { ok: true, book, at: Date.now() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    recordError(BINANCE_ADAPTER_ID, msg);
    return { ok: false, book: null, error: msg, at: Date.now() };
  }
}

export interface Trade {
  id: number;
  t: number; // ms
  price: number;
  size: number;
  buyerMaker: boolean; // true → trade hit a bid (sell aggressor)
}

export interface TradesResult {
  ok: boolean;
  trades: Trade[];
  error?: string;
  at: number;
}

export async function fetchTrades(
  symbol: string,
  limit = 50
): Promise<TradesResult> {
  const url = `${BASE}/trades?symbol=${encodeURIComponent(symbol)}&limit=${limit}`;
  const startedAt = Date.now();
  try {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as Array<{
      id: number;
      price: string;
      qty: string;
      time: number;
      isBuyerMaker: boolean;
    }>;
    const trades: Trade[] = j.map((row) => ({
      id: row.id,
      t: row.time,
      price: Number(row.price),
      size: Number(row.qty),
      buyerMaker: row.isBuyerMaker
    }));
    recordSuccess(BINANCE_ADAPTER_ID, Date.now() - startedAt);
    return { ok: true, trades, at: Date.now() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    recordError(BINANCE_ADAPTER_ID, msg);
    return { ok: false, trades: [], error: msg, at: Date.now() };
  }
}

/**
 * Map an Operator.Center watchlist symbol to a Binance trading pair.
 * Returns null when no Binance pair exists (stocks, FX, commodities).
 */
export function binancePairFor(symbol: string): string | null {
  const u = symbol.toUpperCase();
  // Already a pair like BTCUSDT.
  if (/USDT$/.test(u)) return u;
  // Common spot pairs against USDT.
  const map: Record<string, string> = {
    BTC: "BTCUSDT",
    ETH: "ETHUSDT",
    SOL: "SOLUSDT",
    BNB: "BNBUSDT",
    XRP: "XRPUSDT",
    ADA: "ADAUSDT",
    DOGE: "DOGEUSDT",
    AVAX: "AVAXUSDT",
    MATIC: "MATICUSDT",
    LINK: "LINKUSDT"
  };
  return map[u] ?? null;
}
