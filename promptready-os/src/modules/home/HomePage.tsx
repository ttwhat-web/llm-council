"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Terminal, TrendingDown, TrendingUp } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { useCryptoFeed, useNewsFeed } from "@/services/marketFeed";

/**
 * Home · the daily opener.
 *
 * Granola-style greeting + a short list of real signals from data
 * Operator Center already has live: crypto feed (CoinGecko) and news
 * feed (HN / NewsAPI). Two CTAs lead into the workspace.
 *
 * Honest by design — empty cells say "no signal" rather than invent
 * one. If a feed is offline, the signal is omitted and the user sees
 * a single quiet line that says so.
 */

interface Signal {
  id: string;
  label: string;
  detail: string;
  tone: "ok" | "warn" | "muted";
}

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const identity = useBrainStore((s) => s.identity);
  const crypto = useCryptoFeed();
  const news = useNewsFeed();

  // Re-evaluate greeting once per minute so it stays correct across
  // hour boundaries without re-rendering the whole tree.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const signals: Signal[] = useMemo(() => {
    const out: Signal[] = [];
    const btc = crypto.quotes.find((q) => q.symbol === "BTC");
    if (crypto.state === "ok" && btc?.change24h != null) {
      const c = btc.change24h;
      const dir = c >= 0 ? "up" : "down";
      out.push({
        id: "btc",
        label: `BTC ${dir} ${Math.abs(c).toFixed(2)}% in 24h`,
        detail: btc.price != null ? `$${btc.price.toLocaleString()}` : "live · CoinGecko",
        tone: c >= 0 ? "ok" : "warn"
      });
    }
    const headline = news.items[0];
    if (headline) {
      out.push({
        id: "news",
        label: headline.title,
        detail: `${headline.source} · ${timeAgo(headline.time, now.getTime())}`,
        tone: "muted"
      });
    }
    if (crypto.state === "ok" && crypto.quotes.length > 0) {
      const movers = [...crypto.quotes]
        .filter((q) => q.change24h != null)
        .sort((a, b) => Math.abs((b.change24h ?? 0)) - Math.abs((a.change24h ?? 0)));
      const top = movers[0];
      if (top && top.symbol !== "BTC" && top.change24h != null) {
        out.push({
          id: "mover",
          label: `${top.symbol} ${top.change24h >= 0 ? "leading" : "lagging"} · ${top.change24h >= 0 ? "+" : ""}${top.change24h.toFixed(2)}%`,
          detail: "biggest 24h move in watchlist",
          tone: top.change24h >= 0 ? "ok" : "warn"
        });
      }
    }
    return out.slice(0, 3);
  }, [crypto.quotes, crypto.state, news.items, now]);

  const firstName = identity?.name?.split(/\s+/)[0] ?? "Operator";
  const greeting = greetingFor(now);
  const feedsOnline = crypto.state === "ok" || news.state === "ok";

  return (
    <div className="mx-auto flex h-full w-full max-w-[820px] flex-col justify-center gap-12 px-8 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-white">
          {greeting}, {firstName}.
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-white/55">
          {signals.length === 0
            ? feedsOnline
              ? "Nothing's moving sharply yet. Open Markets when you want the chart."
              : "Feeds are offline. Open Markets to retry, or jump into the Console."
            : `${signals.length} thing${signals.length === 1 ? "" : "s"} worth a look right now.`}
        </p>
      </header>

      {signals.length > 0 && (
        <ul className="flex flex-col">
          {signals.map((s, i) => (
            <li
              key={s.id}
              className={
                "group flex items-start gap-4 py-4 " +
                (i === 0 ? "" : "border-t border-white/[0.04]")
              }
            >
              <span
                className={
                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full " +
                  (s.tone === "ok"
                    ? "bg-emerald-300"
                    : s.tone === "warn"
                      ? "bg-rose-300"
                      : "bg-white/30")
                }
                aria-hidden
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] leading-snug text-white/90">{s.label}</span>
                <span className="text-[13px] text-white/45">{s.detail}</span>
              </span>
              <ToneIcon tone={s.tone} />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/markets"
          className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-medium text-black transition hover:bg-white/90"
        >
          <Sparkles className="h-4 w-4" />
          Open Markets
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
        <Link
          to="/console"
          className="group inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-[14px] font-medium text-white/85 transition hover:border-white/30 hover:bg-white/[0.04] hover:text-white"
        >
          <Terminal className="h-4 w-4" />
          Open Console
        </Link>
      </div>
    </div>
  );
}

function ToneIcon({ tone }: { tone: Signal["tone"] }) {
  if (tone === "ok") return <TrendingUp className="mt-1 h-4 w-4 shrink-0 text-emerald-300/80" />;
  if (tone === "warn") return <TrendingDown className="mt-1 h-4 w-4 shrink-0 text-rose-300/80" />;
  return null;
}

function timeAgo(ts: number, nowMs: number): string {
  const diff = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
