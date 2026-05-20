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
import { isTauri, bridgeProviderFetch, envConfiguredCached } from "@/services/runtimeBridge";

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
  const startedAt = Date.now();
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
    recordSuccess(NEWS_ADAPTER_ID, Date.now() - startedAt);
    return { ok: true, items, at: Date.now() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    recordError(NEWS_ADAPTER_ID, msg);
    return { ok: false, items: [], error: msg, at: Date.now() };
  }
}

/**
 * Best-available news · Sprint H.
 *
 * On desktop with NEWSAPI_KEY configured, fetch real headlines via the
 * Rust bridge (NewsAPI · key never touches JS). Otherwise fall back to
 * the public, CORS-friendly Hacker News feed. NO fake headlines either
 * way — a failed bridge call falls back to HN, and a failed HN call
 * surfaces honestly.
 */
interface NewsApiArticle {
  title?: string;
  url?: string;
  source?: { name?: string };
  publishedAt?: string;
}

export async function fetchNewsBest(category: NewsCategory, limit = 10): Promise<NewsFetchResult> {
  if (isTauri() && envConfiguredCached("NEWSAPI_KEY")) {
    const r = await bridgeProviderFetch("newsapi", CATEGORY_QUERY[category]);
    if (r.ok && r.data && typeof r.data === "object") {
      const articles = (r.data as { articles?: NewsApiArticle[] }).articles ?? [];
      const items: NewsItem[] = articles.slice(0, limit).map((a, i) => ({
        id: `newsapi-${i}-${a.url ?? a.title ?? i}`,
        title: a.title ?? "(untitled)",
        url: a.url ?? null,
        source: a.source?.name ?? "NewsAPI",
        time: a.publishedAt ? Date.parse(a.publishedAt) : Date.now(),
        category
      }));
      if (items.length > 0) {
        recordSuccess("newsapi");
        return { ok: true, items, at: Date.now() };
      }
    } else if (r.error) {
      recordError("newsapi", r.error);
    }
    // fall through to Hacker News
  }
  return fetchNews(category, limit);
}

export function timeAgo(ts: number): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}
