/**
 * Market feed · Sprint I.1.
 *
 * Single controlled refresh path for the public feeds the cockpit shares
 * (CoinGecko crypto + the default AI news wire). Components subscribe via
 * the hooks instead of each starting their own interval, so there is
 * exactly ONE poll loop per feed regardless of how many panels are
 * mounted. Ref-counted: the interval starts on the first subscriber and
 * stops when the last unmounts.
 *
 * No fake data — snapshots only ever hold real fetch results (or empty +
 * a "loading"/"error" state). Sample recording stays in the CoinGecko
 * fetcher; here we just expose the shared snapshot.
 */

import { useEffect, useState } from "react";
import { fetchCryptoPrices, type CryptoQuote } from "@/services/providers/coingecko";
import { fetchNewsBest, type NewsItem } from "@/services/providers/news";

type FeedState = "loading" | "ok" | "error";

const CRYPTO_INTERVAL_MS = 60_000;
const NEWS_INTERVAL_MS = 120_000;

// ---------------------------------------------------------------------------
// Crypto feed
// ---------------------------------------------------------------------------

export interface CryptoSnapshot {
  quotes: CryptoQuote[];
  state: FeedState;
  at: number | null;
  error: string | null;
}

let cryptoSnap: CryptoSnapshot = { quotes: [], state: "loading", at: null, error: null };
const cryptoSubs = new Set<() => void>();
let cryptoTimer: number | null = null;
let cryptoRefs = 0;
let cryptoInFlight = false;

async function pollCrypto(): Promise<void> {
  if (cryptoInFlight) return;
  cryptoInFlight = true;
  try {
    const r = await fetchCryptoPrices();
    cryptoSnap = r.ok
      ? { quotes: r.quotes, state: "ok", at: r.at, error: null }
      : { quotes: cryptoSnap.quotes, state: "error", at: r.at, error: r.error ?? "fetch failed" };
    cryptoSubs.forEach((cb) => cb());
  } finally {
    cryptoInFlight = false;
  }
}

export function getCryptoSnapshot(): CryptoSnapshot {
  return cryptoSnap;
}

export async function refreshCryptoNow(): Promise<void> {
  await pollCrypto();
}

export function useCryptoFeed(): CryptoSnapshot {
  const [, force] = useState(0);
  useEffect(() => {
    cryptoRefs += 1;
    const cb = () => force((n) => n + 1);
    cryptoSubs.add(cb);
    if (cryptoTimer == null) {
      void pollCrypto();
      cryptoTimer = window.setInterval(() => void pollCrypto(), CRYPTO_INTERVAL_MS);
    } else {
      cb(); // sync the new subscriber to the current snapshot
    }
    return () => {
      cryptoSubs.delete(cb);
      cryptoRefs -= 1;
      if (cryptoRefs <= 0 && cryptoTimer != null) {
        window.clearInterval(cryptoTimer);
        cryptoTimer = null;
      }
    };
  }, []);
  return cryptoSnap;
}

// ---------------------------------------------------------------------------
// News feed (default AI wire) · shared by Theater + Broadcast Wall
// ---------------------------------------------------------------------------

export interface NewsSnapshot {
  items: NewsItem[];
  state: FeedState;
  at: number | null;
  error: string | null;
}

let newsSnap: NewsSnapshot = { items: [], state: "loading", at: null, error: null };
const newsSubs = new Set<() => void>();
let newsTimer: number | null = null;
let newsRefs = 0;
let newsInFlight = false;

async function pollNews(): Promise<void> {
  if (newsInFlight) return;
  newsInFlight = true;
  try {
    const r = await fetchNewsBest("AI", 10);
    newsSnap = r.ok
      ? { items: r.items, state: "ok", at: r.at, error: null }
      : { items: newsSnap.items, state: "error", at: r.at, error: r.error ?? "fetch failed" };
    newsSubs.forEach((cb) => cb());
  } finally {
    newsInFlight = false;
  }
}

export function getNewsSnapshot(): NewsSnapshot {
  return newsSnap;
}

export function useNewsFeed(): NewsSnapshot {
  const [, force] = useState(0);
  useEffect(() => {
    newsRefs += 1;
    const cb = () => force((n) => n + 1);
    newsSubs.add(cb);
    if (newsTimer == null) {
      void pollNews();
      newsTimer = window.setInterval(() => void pollNews(), NEWS_INTERVAL_MS);
    } else {
      cb();
    }
    return () => {
      newsSubs.delete(cb);
      newsRefs -= 1;
      if (newsRefs <= 0 && newsTimer != null) {
        window.clearInterval(newsTimer);
        newsTimer = null;
      }
    };
  }, []);
  return newsSnap;
}
