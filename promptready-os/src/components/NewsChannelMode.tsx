"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import {
  BookmarkPlus,
  ExternalLink,
  Radio,
  Rocket,
  Tv
} from "lucide-react";
import {
  fetchNewsBest,
  timeAgo,
  NEWS_CATEGORIES,
  type NewsCategory,
  type NewsItem
} from "@/services/providers/news";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";

/**
 * News Channel Mode · Operator.Center.
 *
 * A cinematic "live broadcast wall" built ONLY from real headlines pulled
 * via fetchNewsBest. There is no embedded stream, no scraped video, no
 * fabricated copy — the rotation merely cycles through the REAL items we
 * fetched. Honesty rules:
 *   · ok + items   → "wire online · {first item source}"
 *   · ok + empty   → "no stories returned"
 *   · error        → "wire offline · adapter-ready"
 * Refetch on mount, every 90s, and on category change. The featured slot
 * advances every ~8s through the fetched items (local rotation only).
 */

const REFETCH_MS = 90_000;
const ROTATE_MS = 8_000;
const LIMIT = 12;

export function NewsChannelMode() {
  const dispatch = useMissionStore((s) => s.dispatch);
  const addMemoryDocs = useAtlasStore((s) => s.addMemoryDocs);

  const [category, setCategory] = useState<NewsCategory>("AI");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState(0);

  const load = useCallback(async (cat: NewsCategory) => {
    setLoading(true);
    const res = await fetchNewsBest(cat, LIMIT);
    setOk(res.ok);
    setError(res.error);
    setItems(res.items);
    setFeatured(0);
    setLoading(false);
  }, []);

  // Fetch on mount + when category changes; refetch every 90s.
  useEffect(() => {
    void load(category);
    const t = window.setInterval(() => void load(category), REFETCH_MS);
    return () => window.clearInterval(t);
  }, [category, load]);

  // Auto-rotate the featured headline every ~8s through real items.
  useEffect(() => {
    if (items.length <= 1) return;
    const t = window.setInterval(() => {
      setFeatured((i) => (i + 1) % items.length);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [items.length]);

  const status: string = loading
    ? "…"
    : ok
      ? items.length > 0
        ? `wire online · ${items[0]!.source}`
        : "no stories returned"
      : "wire offline · adapter-ready";

  const hero = items[featured] ?? null;
  const queue = items
    .map((it, idx) => ({ it, idx }))
    .filter(({ idx }) => idx !== featured)
    .slice(0, 6);

  const createMission = useCallback(
    (title: string) => {
      void dispatch(
        `Turn this headline into an operator brief: "${title}". Summarize why it matters, what to watch, and 3 next actions.`,
        "general",
        "smart",
        null
      );
    },
    [dispatch]
  );

  const saveToBrain = useCallback(
    (item: NewsItem) => {
      addMemoryDocs([
        {
          name: `Headline · ${item.title.slice(0, 60)}`,
          ext: "md",
          size: item.title.length,
          body: `# ${item.title}\n\nSource: ${item.source}\nURL: ${item.url ?? "—"}\n`
        }
      ]);
    },
    [addMemoryDocs]
  );

  const openSource = useCallback((url: string | null) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-b from-black/60 to-black/30 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tv className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">
            News Channel Mode
          </span>
        </div>
        <span className="flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          <Radio
            className={clsx(
              "h-3 w-3",
              loading
                ? "text-white/40"
                : ok && items.length > 0
                  ? "text-emerald-300"
                  : "text-rose-300"
            )}
          />
          {status}
        </span>
      </header>

      <nav className="flex flex-wrap gap-1.5">
        {NEWS_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={clsx(
              "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition",
              cat === category
                ? "border-accent/40 bg-accent/[0.12] text-accent"
                : "border-white/10 bg-white/[0.02] text-white/50 hover:text-white/80"
            )}
          >
            {cat}
          </button>
        ))}
      </nav>

      {/* FEATURED */}
      {hero ? (
        <article className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <span className="w-fit rounded-full border border-accent/30 bg-accent/[0.08] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
            {hero.category}
          </span>
          <h2 className="text-xl font-semibold leading-snug text-white md:text-2xl">
            {hero.title}
          </h2>
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-white/45">
            {hero.source} · {timeAgo(hero.time)}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => createMission(hero.title)}
              className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/[0.12] px-2.5 py-1.5 text-[11px] font-medium text-accent transition hover:bg-accent/[0.2]"
            >
              <Rocket className="h-3.5 w-3.5" />
              Create mission from headline
            </button>
            <button
              type="button"
              onClick={() => saveToBrain(hero)}
              className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-white/80 transition hover:bg-white/[0.07]"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              Save to brain
            </button>
            <button
              type="button"
              onClick={() => openSource(hero.url)}
              disabled={!hero.url}
              className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-white/80 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open source
            </button>
          </div>
        </article>
      ) : (
        <div className="rounded-xl border border-white/8 bg-white/[0.012] p-6 text-center font-mono text-[11px] uppercase tracking-wider text-white/45">
          {loading
            ? "tuning the wire…"
            : ok
              ? "no stories returned"
              : "wire offline · adapter-ready"}
        </div>
      )}

      {/* QUEUE */}
      {queue.length > 0 && (
        <ul className="flex flex-col divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8">
          {queue.map(({ it, idx }) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => setFeatured(idx)}
                className="flex w-full items-start gap-3 bg-white/[0.012] px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
              >
                <span className="line-clamp-2 flex-1 text-[12px] leading-snug text-white/80">
                  {it.title}
                </span>
                <span className="shrink-0 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-wider text-white/40">
                  {it.source} · {timeAgo(it.time)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
