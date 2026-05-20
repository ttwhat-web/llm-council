"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  Activity,
  CheckCircle2,
  CircleDollarSign,
  Newspaper,
  Radio,
  ScrollText,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { formatChange, formatPrice } from "@/services/providers/coingecko";
import { timeAgo } from "@/services/providers/news";
import { useCryptoFeed, useNewsFeed } from "@/services/marketFeed";
import { readPresence, type PresenceSnapshot } from "@/services/presence";
import { computeCostBoard, formatUsd } from "@/services/cost";
import { adapterSummary } from "@/services/adapters";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";

/**
 * Broadcast Wall · Operator.Center.
 *
 * A cinematic, full-width dark wall built for a projector or TV. Every
 * tile reads the SAME real public feeds + local stores the rest of the
 * product uses — no video stream, no fabricated numbers. When a feed
 * fails it says so ("feed offline" / "wire offline"); when a number is
 * unknown it shows "—". The only motion is a state-driven pulse dot
 * that lights when a feed is actually live.
 */

const PRESENCE_REFRESH_MS = 4_000;

export function BroadcastWall() {
  const history = useMissionStore((s) => s.history);
  const workflowRuns = useAtlasStore((s) => s.workflowRuns);

  // Shared single-poll feeds · no duplicate CoinGecko / HN calls.
  const crypto = useCryptoFeed();
  const news = useNewsFeed();
  const [presence, setPresence] = useState<PresenceSnapshot | null>(null);

  useEffect(() => {
    setPresence(readPresence());
    const t = window.setInterval(() => setPresence(readPresence()), PRESENCE_REFRESH_MS);
    return () => window.clearInterval(t);
  }, []);

  const cost = computeCostBoard(history);
  const adapters = adapterSummary();
  const approvals = workflowRuns.filter((r) => r.status === "awaiting-approval").length;
  const latest = history[0] ?? null;

  const cryptoLive = crypto.state === "ok";
  const newsLive = news.state === "ok";

  const topQuotes = crypto.quotes.filter((q) => q.price != null).slice(0, 5);
  const headlines = news.items.slice(0, 5);

  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-b from-black via-zinc-950 to-black p-8 text-white shadow-2xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <Radio className="h-7 w-7 text-accent" />
          <div className="flex flex-col">
            <span className="text-2xl font-semibold tracking-tight">Broadcast Wall</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">
              Operator.Center · live room view
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-wider text-white/45">
          <FeedDot live={cryptoLive} label="markets" />
          <FeedDot live={newsLive} label="wire" />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {/* 1 · Market Pulse */}
        <Tile Icon={TrendingUp} title="Market Pulse" live={cryptoLive}>
          {crypto.state === "error" ? (
            <Offline message="feed offline" detail={crypto.error ?? undefined} />
          ) : topQuotes.length === 0 ? (
            <Dash />
          ) : (
            <ul className="flex flex-col gap-2">
              {topQuotes.map((q) => (
                <li key={q.symbol} className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-base font-semibold text-white">{q.symbol}</span>
                  <span className="font-mono text-xl tabular-nums text-white/90">
                    {formatPrice(q.price)}
                  </span>
                  <span
                    className={clsx(
                      "w-20 text-right font-mono text-base tabular-nums",
                      q.change24h == null
                        ? "text-white/40"
                        : q.change24h >= 0
                          ? "text-emerald-300"
                          : "text-rose-300"
                    )}
                  >
                    {formatChange(q.change24h)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Tile>

        {/* 2 · News Wire */}
        <Tile Icon={Newspaper} title="News Wire" live={newsLive}>
          {news.state === "error" ? (
            <Offline message="wire offline" detail={news.error ?? undefined} />
          ) : headlines.length === 0 ? (
            <Dash />
          ) : (
            <ul className="flex flex-col gap-3">
              {headlines.map((h) => (
                <li key={h.id} className="flex flex-col gap-0.5">
                  <span className="line-clamp-2 text-sm leading-snug text-white/90">
                    {h.title}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                    {h.source} · {timeAgo(h.time)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Tile>

        {/* 3 · Provider Health */}
        <Tile Icon={ShieldCheck} title="Provider Health">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="connected" value={adapters.connected} tone="ok" />
            <Stat label="ready" value={adapters.ready} tone="accent" />
            <Stat label="error" value={adapters.error} tone={adapters.error > 0 ? "bad" : "muted"} />
            <Stat label="offline" value={adapters.offline} tone="muted" />
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-white/35">
            {adapters.total} adapters registered
          </p>
        </Tile>

        {/* 4 · Cost Runtime */}
        <Tile Icon={CircleDollarSign} title="Cost Runtime">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="missions" value={cost.localMissions + cost.ollamaMissions} tone="accent" />
            <BigStat label="cloud avoided" value={formatUsd(cost.estimatedCloudCostAvoidedUSD)} />
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-white/35">
            {cost.ollamaMissions} ollama · {cost.localMissions} deterministic
          </p>
        </Tile>

        {/* 5 · Presence */}
        <Tile Icon={Activity} title="Presence">
          {presence ? (
            <ul className="grid grid-cols-2 gap-3">
              <PresenceLine label="desktop" state={presence.desktop} />
              <PresenceLine label="ollama" state={presence.ollama} />
              <PresenceLine label="markets" state={presence.markets} />
              <PresenceLine label="news" state={presence.news} />
            </ul>
          ) : (
            <Dash />
          )}
        </Tile>

        {/* 6 · Pending Approvals */}
        <Tile Icon={CheckCircle2} title="Pending Approvals">
          <div className="flex items-baseline gap-3">
            <span
              className={clsx(
                "font-mono text-5xl tabular-nums",
                approvals > 0 ? "text-amber-300" : "text-white/80"
              )}
            >
              {approvals}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-white/40">
              {approvals === 0 ? "queue empty" : "awaiting tap"}
            </span>
          </div>
        </Tile>

        {/* 7 · Latest Receipt */}
        <Tile Icon={ScrollText} title="Latest Receipt" className="md:col-span-2 xl:col-span-3">
          {latest ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="min-w-0 flex-1 truncate text-base text-white/90">
                {latest.brief}
              </span>
              <div className="flex items-center gap-5 font-mono text-sm uppercase tracking-wider text-white/55">
                <span>{latest.engine ?? "deterministic"}</span>
                <span className="text-white/85">
                  score {latest.score != null ? `${latest.score}/100` : "—"}
                </span>
              </div>
            </div>
          ) : (
            <p className="font-mono text-sm uppercase tracking-wider text-white/40">no receipts</p>
          )}
        </Tile>
      </div>
    </section>
  );
}

function Tile({
  Icon,
  title,
  live,
  className,
  children
}: {
  Icon: typeof Radio;
  title: string;
  live?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article
      className={clsx(
        "flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6",
        className
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Icon className="h-5 w-5 text-accent" />
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
            {title}
          </h3>
        </div>
        {live !== undefined && <FeedDot live={live} />}
      </header>
      <div className="flex-1">{children}</div>
    </article>
  );
}

function FeedDot({ live, label }: { live: boolean; label?: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={clsx(
          "h-2.5 w-2.5 rounded-full",
          live ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]" : "bg-white/20"
        )}
      />
      {label && <span>{label}</span>}
    </span>
  );
}

function Stat({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "ok" | "accent" | "bad" | "muted";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "accent"
        ? "text-accent"
        : tone === "bad"
          ? "text-rose-300"
          : "text-white/60";
  return (
    <div className="flex flex-col gap-1">
      <span className={clsx("font-mono text-3xl tabular-nums", color)}>{value}</span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">{label}</span>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-2xl tabular-nums text-emerald-300">{value}</span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">{label}</span>
    </div>
  );
}

function PresenceLine({ label, state }: { label: string; state: string }) {
  const ok = state === "online" || state === "ready" || state === "connected";
  const bad = state === "offline" || state === "error";
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="font-mono text-[11px] uppercase tracking-wider text-white/45">{label}</span>
      <span
        className={clsx(
          "font-mono text-sm",
          ok ? "text-emerald-300" : bad ? "text-rose-300" : "text-white/55"
        )}
      >
        {state}
      </span>
    </li>
  );
}

function Offline({ message, detail }: { message: string; detail?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-base uppercase tracking-wider text-rose-300">{message}</span>
      {detail && (
        <span className="font-mono text-[10px] tracking-wider text-white/35">{detail}</span>
      )}
    </div>
  );
}

function Dash() {
  return <span className="font-mono text-2xl text-white/30">—</span>;
}
