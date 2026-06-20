"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Activity,
  BookOpen,
  ExternalLink,
  Newspaper,
  Radio,
  Rocket,
  ShieldCheck,
  Tv,
  TrendingUp
} from "lucide-react";
import { useCryptoFeed } from "@/services/marketFeed";
import { formatPrice, formatChange } from "@/services/providers/coingecko";
import {
  fetchNewsBest,
  timeAgo,
  NEWS_CATEGORIES,
  type NewsItem,
  type NewsCategory
} from "@/services/providers/news";
import { getSamples, type Sample } from "@/services/marketSamples";
import { adapterSummary } from "@/services/adapters";
import { computeCostBoard, formatUsd } from "@/services/cost";
import { readPresence, type PresenceSnapshot } from "@/services/presence";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";

/**
 * Live Wall · Sprint I.2.
 *
 * A cockpit/newsroom wall inside the Intelligence Terminal. Market Pulse
 * (left), AI Newsfeed (center), Signal Tower (right), Ticker Tape
 * (bottom). Every value is real (CoinGecko samples · Hacker News / NewsAPI
 * headlines · local stores) or an honest offline/adapter-ready label.
 * No fabricated chart points, no fake headlines, no video stream.
 *
 * Broadcast Mode hides dense controls and enlarges the headline + chart
 * for a TV / projector.
 */

const PULSE_SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP"] as const;
const NEWS_LIMIT = 12;
const NEWS_REFRESH_MS = 90_000;
const ROTATE_MS = 8_000;
const PRESENCE_MS = 4_000;

export function LiveWall({
  broadcast,
  onToggleBroadcast
}: {
  broadcast: boolean;
  onToggleBroadcast: () => void;
}) {
  const crypto = useCryptoFeed();
  const [pulseSym, setPulseSym] = useState<string>("BTC");

  // News · own per-category fetch (chips) · single fetcher in this view.
  const [category, setCategory] = useState<NewsCategory>("AI");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [newsState, setNewsState] = useState<"loading" | "ok" | "error">("loading");
  const [newsErr, setNewsErr] = useState<string | undefined>(undefined);
  const [featured, setFeatured] = useState(0);

  const loadNews = useCallback(async (cat: NewsCategory) => {
    setNewsState("loading");
    const r = await fetchNewsBest(cat, NEWS_LIMIT);
    if (r.ok) {
      setItems(r.items);
      setNewsState("ok");
      setNewsErr(undefined);
      setFeatured(0);
    } else {
      setNewsState("error");
      setNewsErr(r.error);
    }
  }, []);

  useEffect(() => {
    void loadNews(category);
    const t = window.setInterval(() => void loadNews(category), NEWS_REFRESH_MS);
    return () => window.clearInterval(t);
  }, [category, loadNews]);

  // rotate featured headline through the queue
  useEffect(() => {
    if (items.length < 2) return;
    const t = window.setInterval(() => setFeatured((f) => (f + 1) % items.length), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [items.length]);

  const [presence, setPresence] = useState<PresenceSnapshot | null>(null);
  useEffect(() => {
    setPresence(readPresence());
    const t = window.setInterval(() => setPresence(readPresence()), PRESENCE_MS);
    return () => window.clearInterval(t);
  }, []);

  const history = useMissionStore((s) => s.history);
  const dispatch = useMissionStore((s) => s.dispatch);
  const current = useMissionStore((s) => s.current);
  const workflowRuns = useAtlasStore((s) => s.workflowRuns);

  const samples = getSamples(pulseSym);
  const quote = crypto.quotes.find((q) => q.symbol === pulseSym) ?? null;
  const cryptoOnline = crypto.state === "ok";
  const newsOnline = newsState === "ok";
  const hero = items[featured] ?? null;

  const onCreateMission = (n: NewsItem) => {
    if (current) return;
    void dispatch(
      `Brief me on this headline and propose operator actions:\n"${n.title}"\nSource: ${n.source}${n.url ? ` · ${n.url}` : ""}`,
      "general",
      "smart",
      null
    );
  };
  const onSaveToBrain = (n: NewsItem) => {
    useAtlasStore.getState().addMemoryDocs([
      {
        name: `Headline · ${n.title.slice(0, 60)}`,
        ext: "md",
        size: n.title.length,
        body: `# Saved headline\n\n${n.title}\n\nSource: ${n.source}\nCategory: ${n.category}\n${n.url ?? ""}\n\nWhy it matters:\n- `
      }
    ]);
  };

  return (
    <section
      className={clsx(
        "flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-b from-black via-zinc-950 to-black p-5 text-white",
        broadcast && "p-7"
      )}
    >
      {/* header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <Radio className="h-6 w-6 text-accent" />
          <div className="flex flex-col">
            <span className={clsx("font-semibold tracking-tight", broadcast ? "text-2xl" : "text-lg")}>
              Live Wall
            </span>
            <span className="text-[11px] text-white/45">
              Operator Center · data wall
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-white/45">
          <Dot live={cryptoOnline} label="markets" />
          <Dot live={newsOnline} label="wire" />
          <button
            type="button"
            onClick={onToggleBroadcast}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 transition",
              broadcast
                ? "border-accent/40 bg-accent/[0.1] text-accent shadow-glow"
                : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
            )}
            title="Broadcast Mode · TV/projector (press b)"
          >
            <Tv className="h-3 w-3" />
            {broadcast ? "exit broadcast" : "broadcast"}
          </button>
        </div>
      </header>

      <div
        className={clsx(
          "grid grid-cols-1 gap-4",
          broadcast ? "lg:grid-cols-[1.2fr_1fr]" : "lg:grid-cols-[1.1fr_1.2fr_0.9fr]"
        )}
      >
        {/* LEFT · Market Pulse */}
        <MarketPulse
          symbol={pulseSym}
          onSymbol={setPulseSym}
          samples={samples}
          quote={quote}
          online={cryptoOnline}
          broadcast={broadcast}
        />

        {/* CENTER · AI Newsfeed */}
        <NewsFeed
          hero={hero}
          items={items}
          state={newsState}
          err={newsErr}
          category={category}
          onCategory={setCategory}
          broadcast={broadcast}
          missionBusy={!!current}
          onCreateMission={onCreateMission}
          onSaveToBrain={onSaveToBrain}
        />

        {/* RIGHT · Signal Tower (hidden in broadcast) */}
        {!broadcast && (
          <SignalTower
            quotes={crypto.quotes}
            cryptoOnline={cryptoOnline}
            items={items}
            presence={presence}
            history={history}
            approvals={workflowRuns.filter((r) => r.status === "awaiting-approval").length}
          />
        )}
      </div>

      {/* Data sources legend · honest provenance */}
      <DataSourcesLegend />

      {/* BOTTOM · Ticker Tape */}
      <TickerTape quotes={crypto.quotes} items={items} cryptoOnline={cryptoOnline} newsOnline={newsOnline} />

      {broadcast && (
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-white/35">
          operational signal · not financial advice · no live TV stream · data wall only
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Market Pulse
// ---------------------------------------------------------------------------

function MarketPulse({
  symbol,
  onSymbol,
  samples,
  quote,
  online,
  broadcast
}: {
  symbol: string;
  onSymbol: (s: string) => void;
  samples: Sample[];
  quote: { price: number | null; change24h: number | null } | null;
  online: boolean;
  broadcast: boolean;
}) {
  const up = (quote?.change24h ?? 0) >= 0;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.015] p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          <TrendingUp className="h-3.5 w-3.5" /> market pulse
        </span>
        {!broadcast && (
          <div className="flex items-center gap-1">
            {PULSE_SYMBOLS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSymbol(s)}
                className={clsx(
                  "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
                  s === symbol
                    ? "border-accent/40 bg-accent/[0.08] text-accent"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* big current price + 24h chip */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-mono text-[11px] uppercase tracking-wider text-white/45">{symbol}/USD</span>
          <span className={clsx("font-mono font-semibold tabular-nums", broadcast ? "text-6xl" : "text-4xl")}>
            {quote ? formatPrice(quote.price) : "—"}
          </span>
        </div>
        <span
          className={clsx(
            "rounded-lg border px-2 py-1 font-mono tabular-nums",
            broadcast ? "text-2xl" : "text-base",
            quote?.change24h == null
              ? "border-white/10 bg-white/[0.03] text-white/45"
              : up
                ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-300"
                : "border-rose-400/30 bg-rose-500/[0.08] text-rose-300"
          )}
        >
          {quote ? formatChange(quote.change24h) : "—"}
        </span>
      </div>

      <BigChart samples={samples} up={up} broadcast={broadcast} />

      <div className="flex items-center justify-between font-mono text-[9.5px] uppercase tracking-wider text-white/40">
        <span>{samples.length} session samples</span>
        <span className={online ? "text-emerald-300/70" : "text-white/35"}>
          {online ? "feed live" : "feed offline"}
        </span>
      </div>
      {samples.length < 2 && (
        <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.01] px-3 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-white/45">
          collecting live samples · the last real price shows above
        </p>
      )}
    </div>
  );
}

function BigChart({ samples, up, broadcast }: { samples: Sample[]; up: boolean; broadcast: boolean }) {
  const h = broadcast ? 220 : 150;
  if (samples.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/40 font-mono text-[11px] uppercase tracking-[0.2em] text-white/30"
        style={{ height: h }}
      >
        no samples yet
      </div>
    );
  }
  const W = 600;
  const prices = samples.map((s) => s.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const pad = 6;
  const pts = samples.map((s, i) => {
    const x = (i / (samples.length - 1)) * W;
    const y = h - ((s.price - min) / span) * (h - pad * 2) - pad;
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${W},${h}`;
  const stroke = up ? "rgb(52,211,153)" : "rgb(248,113,113)";
  const fill = up ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)";
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
      <polygon points={area} fill={fill} />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      <line x1={0} y1={h - pad} x2={W} y2={h - pad} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// AI Newsfeed
// ---------------------------------------------------------------------------

function NewsFeed({
  hero,
  items,
  state,
  err,
  category,
  onCategory,
  broadcast,
  missionBusy,
  onCreateMission,
  onSaveToBrain
}: {
  hero: NewsItem | null;
  items: NewsItem[];
  state: "loading" | "ok" | "error";
  err?: string;
  category: NewsCategory;
  onCategory: (c: NewsCategory) => void;
  broadcast: boolean;
  missionBusy: boolean;
  onCreateMission: (n: NewsItem) => void;
  onSaveToBrain: (n: NewsItem) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.015] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          <Newspaper className="h-3.5 w-3.5" /> ai newsfeed
        </span>
        {!broadcast && (
          <div className="flex flex-wrap items-center gap-1">
            {NEWS_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onCategory(c)}
                className={clsx(
                  "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
                  c === category
                    ? "border-accent/40 bg-accent/[0.08] text-accent"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {state === "error" ? (
        <div className="rounded-xl border border-rose-400/25 bg-rose-500/[0.06] p-4">
          <p className="font-mono text-[12px] uppercase tracking-wider text-rose-200">news wire offline</p>
          <p className="mt-1 text-[11px] text-white/55">{err}</p>
          <p className="mt-2 text-[11px] text-white/55">
            Public Hacker News is the default. For richer headlines, set{" "}
            <span className="font-mono text-accent">NEWSAPI_KEY</span> and run the desktop app — the
            runtime bridge then sources NewsAPI. See Settings → Intelligence → Connector Keys.
          </p>
        </div>
      ) : !hero ? (
        <p className="font-mono text-[11px] uppercase tracking-wider text-white/40">loading wire…</p>
      ) : (
        <>
          {/* featured headline */}
          <article className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-accent">{hero.category}</span>
            <a
              href={hero.url ?? "#"}
              target="_blank"
              rel="noreferrer noopener"
              className={clsx("font-semibold leading-snug text-white hover:text-accent", broadcast ? "text-3xl" : "text-lg")}
            >
              {hero.title}
            </a>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              {hero.source} · {timeAgo(hero.time)}
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Action Icon={Rocket} label={missionBusy ? "mission running" : "create mission"} disabled={missionBusy} onClick={() => onCreateMission(hero)} accent />
              <Action Icon={BookOpen} label="save to brain" onClick={() => onSaveToBrain(hero)} />
              {hero.url && (
                <a
                  href={hero.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
                >
                  <ExternalLink className="h-3 w-3" /> open source
                </a>
              )}
            </div>
          </article>

          {/* queue */}
          {!broadcast && (
            <ul className="flex max-h-[220px] flex-col gap-1 overflow-auto pr-1">
              {items.map((n, i) => (
                <li
                  key={n.id}
                  className={clsx(
                    "flex items-start gap-2 rounded-md border px-2 py-1 text-[11px]",
                    hero && n.id === hero.id ? "border-accent/30 bg-accent/[0.05]" : "border-white/8 bg-white/[0.012]"
                  )}
                >
                  <span className="mt-px font-mono text-[8px] uppercase tracking-wider text-white/30">{i + 1}</span>
                  <a
                    href={n.url ?? "#"}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="min-w-0 flex-1 truncate text-white/80 hover:text-accent"
                    title={n.title}
                  >
                    {n.title}
                  </a>
                  <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-wider text-white/35">
                    {timeAgo(n.time)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Action({
  Icon,
  label,
  onClick,
  disabled,
  accent
}: {
  Icon: typeof Rocket;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40",
        accent
          ? "border-accent/40 bg-accent/[0.1] text-accent hover:bg-accent/[0.15]"
          : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Signal Tower
// ---------------------------------------------------------------------------

function SignalTower({
  quotes,
  cryptoOnline,
  items,
  presence,
  history,
  approvals
}: {
  quotes: Array<{ symbol: string; change24h: number | null }>;
  cryptoOnline: boolean;
  items: NewsItem[];
  presence: PresenceSnapshot | null;
  history: ReturnType<typeof useMissionStore.getState>["history"];
  approvals: number;
}) {
  const adapters = adapterSummary();
  const cost = useMemo(() => computeCostBoard(history), [history]);
  const latest = history[0] ?? null;

  const mover = useMemo(() => {
    const withChange = quotes.filter((q) => q.change24h != null);
    if (!cryptoOnline || withChange.length === 0) return null;
    return withChange.reduce((a, b) => (Math.abs(b.change24h ?? 0) > Math.abs(a.change24h ?? 0) ? b : a));
  }, [quotes, cryptoOnline]);

  const velocity = items.filter((n) => Date.now() - n.time < 3_600_000).length;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.015] p-4">
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
        <Activity className="h-3.5 w-3.5" /> signal tower
      </span>

      <Row label="provider health" value={`${adapters.connected} live · ${adapters.error} err · ${adapters.offline} off`} />
      <Row
        label="market mover"
        value={mover ? `${mover.symbol} ${formatChange(mover.change24h)}` : "—"}
        tone={mover ? ((mover.change24h ?? 0) >= 0 ? "ok" : "warn") : undefined}
      />
      <Row label="news velocity" value={items.length ? `${velocity} / last hour` : "—"} />
      <Row label="pending approvals" value={String(approvals)} tone={approvals > 0 ? "warn" : undefined} />
      <Row
        label="cost runtime"
        value={`${cost.localMissions + cost.ollamaMissions} msn · ${formatUsd(cost.estimatedCloudCostAvoidedUSD)}`}
      />
      {presence && <Row label="presence" value={`${presence.desktop} · ${presence.ollama}`} />}

      <div className="mt-1 rounded-md border border-white/8 bg-white/[0.012] p-2">
        <span className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-wider text-white/40">
          <ShieldCheck className="h-3 w-3" /> latest receipt
        </span>
        {latest ? (
          <p className="mt-0.5 truncate text-[11px] text-white/80" title={latest.brief}>
            {latest.brief.slice(0, 70)}
          </p>
        ) : (
          <p className="mt-0.5 font-mono text-[10px] text-white/40">no receipts</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">{label}</span>
      <span
        className={clsx(
          "font-mono text-[11px]",
          tone === "ok" ? "text-emerald-300/90" : tone === "warn" ? "text-amber-200/90" : "text-white/85"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ticker Tape
// ---------------------------------------------------------------------------

function TickerTape({
  quotes,
  items,
  cryptoOnline,
  newsOnline
}: {
  quotes: Array<{ symbol: string; price: number | null; change24h: number | null }>;
  items: NewsItem[];
  cryptoOnline: boolean;
  newsOnline: boolean;
}) {
  const cryptoBits = cryptoOnline
    ? quotes.filter((q) => q.price != null).map((q) => `${q.symbol} ${formatPrice(q.price)} ${formatChange(q.change24h)}`)
    : [];
  const newsBits = newsOnline ? items.slice(0, 8).map((n) => n.title) : [];
  const bits = [...cryptoBits, ...newsBits];

  if (bits.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-black/30 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-white/40">
        ticker · feeds offline / adapter-ready · real items appear here when a feed is live
      </div>
    );
  }
  // duplicate the run so the marquee loops seamlessly
  const run = [...bits, ...bits];
  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-black/40">
      <div className="tape-track flex w-max items-center gap-6 whitespace-nowrap px-3 py-2 font-mono text-[11px] text-white/75">
        {run.map((b, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-accent/70" />
            {b}
          </span>
        ))}
      </div>
      <style>{`
        .tape-track { animation: tapeScroll 40s linear infinite; }
        @keyframes tapeScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}

function DataSourcesLegend() {
  const items: Array<[string, string]> = [
    ["Crypto", "CoinGecko"],
    ["News", "Hacker News / NewsAPI when keyed"],
    ["Search", "external browser"],
    ["TV", "no stream · data wall only"]
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/8 bg-white/[0.012] px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-white/40">
      <span className="text-white/55">data sources</span>
      {items.map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1">
          <span className="text-white/30">{k}:</span>
          <span className="text-white/60">{v}</span>
        </span>
      ))}
    </div>
  );
}

function Dot({ live, label }: { live: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={clsx(
          "h-2 w-2 rounded-full",
          live ? "animate-pulse bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.5)]" : "bg-white/20"
        )}
      />
      {label}
    </span>
  );
}
