/**
 * Search Runtime · Sprint I.
 *
 * Honest web-search seam. Real provider APIs (Google CSE, SerpAPI, Brave,
 * Tavily) need keys + the desktop runtime and are adapter-ready only. The
 * always-available fallback is opening an external browser search — we
 * never pretend results render inside the app, and we never scrape.
 */

export type SearchKind = "web" | "news" | "repo";

export interface SearchProviderDef {
  id: string;
  label: string;
  envVar: string;
  note: string;
}

// All key-based · adapter-ready until a key + the desktop runtime wire in.
export const SEARCH_PROVIDERS: SearchProviderDef[] = [
  { id: "google-cse", label: "Google Custom Search", envVar: "GOOGLE_CSE_KEY", note: "Programmable Search Engine · needs key + cx" },
  { id: "serpapi", label: "SerpAPI", envVar: "SERPAPI_KEY", note: "SERP aggregator · needs key" },
  { id: "brave", label: "Brave Search API", envVar: "BRAVE_SEARCH_KEY", note: "Independent index · needs key" },
  { id: "tavily", label: "Tavily", envVar: "TAVILY_API_KEY", note: "LLM-oriented search · needs key" }
];

export const SEARCH_CAPABILITIES = [
  "search web",
  "search news",
  "search repo docs",
  "turn result into mission",
  "save result to brain"
] as const;

/** Build an external browser search URL. Opening a browser is the real,
 *  always-available fallback (no scraping, no in-app results). */
export function browserSearchUrl(query: string, kind: SearchKind): string {
  const q = encodeURIComponent(query.trim());
  switch (kind) {
    case "news":
      return `https://news.google.com/search?q=${q}`;
    case "repo":
      // owner/repo or free text → GitHub repo search
      return `https://github.com/search?q=${q}&type=repositories`;
    case "web":
    default:
      return `https://www.google.com/search?q=${q}`;
  }
}

export function openExternalSearch(query: string, kind: SearchKind): boolean {
  if (typeof window === "undefined" || !query.trim()) return false;
  window.open(browserSearchUrl(query, kind), "_blank", "noopener,noreferrer");
  return true;
}

export type QuickFindKind = "search" | "news" | "repo" | "mail" | "cost" | "mission";

export interface QuickFind {
  kind: QuickFindKind;
  value: string;
}

const QUICK_PREFIXES: QuickFindKind[] = ["search", "news", "repo", "mail", "cost", "mission"];

/** Parse a command-bar entry like `search: AI news` into a QuickFind. */
export function parseQuickFind(input: string): QuickFind | null {
  const m = /^(\w+)\s*:\s*(.+)$/.exec(input.trim());
  if (!m) return null;
  const kind = m[1].toLowerCase() as QuickFindKind;
  if (!QUICK_PREFIXES.includes(kind)) return null;
  return { kind, value: m[2].trim() };
}

export const QUICK_FIND_EXAMPLES: string[] = [
  "search: AI news",
  "news: crypto",
  "repo: owner/name",
  "mail: invoices",
  "cost: this month",
  "mission: build launch plan"
];
