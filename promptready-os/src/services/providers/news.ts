/**
 * News provider · Sprint C · first REAL public news feed.
 *
 * Source: Hacker News Algolia search API · public · no key · CORS-enabled
 * (works from the browser). We query per category and return real story
 * headlines with source + time. NO fake headlines: on failure we record
 * the error and return ok:false so the UI shows "error" honestly.
 *
 * This is a public JSON search API, not scraping. Heavier providers
 * (NewsAPI, CryptoPanic) need keys and are wired later via the runtime.
 */

import { recordSuccess, recordError } from "@/services/providerHealth";

export const NEWS_ADAPTER_ID = "hackernews";

const ENDPOINT = "https://hn.algolia.com/api/v1/search_by_date";

export type NewsCategory = "AI" | "Markets" | "Crypto" | "Tech";

const CATEGORY_QUERY: Record<NewsCategory, string> = {
  AI: "AI OR LLM OR GPT",
  Markets: "stock market OR earnings OR Fed",
  Crypto: "crypto OR bitcoin OR ethereum",
  Tech: "technology OR software OR startup"
};

export const NEWS_CATEGORIES: NewsCategory[] = ["AI", "Markets", "Crypto", "Tech"];

export interface NewsItem {
  id: string;
  title: string;
  url: string | null;
  source: string;
  time: number; // epoch ms
  category: NewsCategory;
}

export interface NewsFetchResult {
  ok: boolean;
  items: NewsItem[];
  error?: string;
  at: number;
}

interface HnHit {
  objectID: string;
  title?: string;
  story_title?: string;
  url?: string;
  story_url?: string;
  created_at_i?: number;
}

export async function fetchNews(category: NewsCategory, limit = 8): Promise<NewsFetchResult> {
  const q = CATEGORY_QUERY[category];
  const url = `${ENDPOINT}?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=${limit}`;
  try {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as { hits?: HnHit[] };
    const hits = j.hits ?? [];
    const items: NewsItem[] = hits
      .map((h) => ({
        id: h.objectID,
        title: h.title ?? h.story_title ?? "(untitled)",
        url: h.url ?? h.story_url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
        source: "Hacker News",
        time: (h.created_at_i ?? 0) * 1000,
        category
      }))
      .filter((i) => i.title !== "(untitled)");
    recordSuccess(NEWS_ADAPTER_ID);
    return { ok: true, items, at: Date.now() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    recordError(NEWS_ADAPTER_ID, msg);
    return { ok: false, items: [], error: msg, at: Date.now() };
  }
}

export function timeAgo(ts: number): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}
