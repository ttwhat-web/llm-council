"use client";

/**
 * Market Intelligence Center · Operator.Center "Market Lab".
 *
 * A Bloomberg-style trading-floor / quant-desk surface rendered entirely
 * in the native Operator.Center design language (dark glass, accent =
 * var(--pr-color-accent)). NO Bloomberg branding, NO amber-on-black.
 *
 * HARD HONESTY: the ONLY real feeds here are crypto (CoinGecko via the
 * shared useCryptoFeed) and news (HN / NewsAPI via useNewsFeed /
 * fetchNewsBest). Everything else — stocks, FX, commodities, Polymarket
 * odds, sector / risk / vol / correlation maps — has NO live source and
 * is rendered as honest "adapter-ready" rows / tiles with NO numbers.
 *
 * Feeds are reused from the shared single-poll services so this page adds
 * ZERO extra CoinGecko / news polling.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Activity,
  Bot,
  Boxes,
  Cpu,
  ExternalLink,
  Gauge,
  Globe2,
  Grid3x3,
  LineChart,
  Maximize2,
  Minimize2,
  Newspaper,
  Radio,
  Rocket,
  Save,
  Search,
  ShieldCheck,
  Signal,
  Tv,
  Waypoints
} from "lucide-react";

import { useCryptoFeed } from "@/services/marketFeed";
import {
  formatPrice,
  formatChange,
  formatMarketCap,
  type CryptoQuote
} from "@/services/providers/coingecko";
import {
  fetchNewsBest,
  timeAgo,
  type NewsItem,
  type NewsCategory
} from "@/services/providers/news";
import { getSamples, type Sample } from "@/services/marketSamples";
import { adapterSummary, statusForModule } from "@/services/adapters";
import { PriceChartLW } from "@/components/market-lab/PriceChartLW";
import { CandlestickChart } from "@/components/market-lab/CandlestickChart";
import { ComparisonChart } from "@/components/market-lab/ComparisonChart";
import { OrderBookPanel } from "@/components/market-lab/OrderBookPanel";
import { TimeAndSalesPanel } from "@/components/market-lab/TimeAndSalesPanel";
import { DepthPanel } from "@/components/market-lab/DepthPanel";
import { binancePairFor } from "@/services/providers/binance";
import { computeCostBoard, formatUsd } from "@/services/cost";
import { getTelegramBridgeStatus } from "@/services/telegramLive";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";

import { Pill, Panel, Dot, StatRow, AdapterReady, DisabledRow, HATCH, heatStyle, type Tone } from "./lab-ui";

// ---------------------------------------------------------------------------
// constants
// ---------------------------------------------------------------------------

const CRYPTO_SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP"] as const;
const WAR_ROOM_WATCHLIST = ["BTC", "ETH", "SOL", "BNB", "XRP", "AAPL", "TSLA", "NVDA", "EURUSD", "XAUUSD"] as const;
const MACRO_STRIP = ["DXY", "US10Y", "VIX", "EURUSD", "XAUUSD", "BTC.D"] as const;

const GRID_BG: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
  backgroundSize: "32px 32px"
};

const CLOCKS: Array<{ label: string; tz: string }> = [
  { label: "NY", tz: "America/New_York" },
  { label: "LDN", tz: "Europe/London" },
  { label: "TYO", tz: "Asia/Tokyo" },
  { label: "IST", tz: "Europe/Istanbul" }
];

// Adapter-ready (no live source) instrument groups · NEVER numbers.
const STOCKS = ["SPY", "QQQ", "AAPL", "NVDA", "MSFT", "GOOG"];
const FX = ["EURUSD", "GBPUSD", "USDTRY", "XAUUSD"];
const COMMODITIES = ["Gold", "Silver", "Oil", "Gas"];

const CHART_TABS = [
  "price",
  "heatmap",
  "flow",
  "news impact",
  "correlation",
  "sentiment",
  "timeline"
] as const;
type ChartTab = (typeof CHART_TABS)[number];
const REAL_TABS: ChartTab[] = ["price", "heatmap"];

const STACK_OPTIONS = [1, 2, 4, 6] as const;

// News room chips · which map to real fetches, which are adapter-ready.
const NEWS_CHIPS: Array<{ label: string; cat: NewsCategory | null }> = [
  { label: "breaking", cat: null },
  { label: "AI", cat: "AI" },
  { label: "crypto", cat: "Crypto" },
  { label: "markets", cat: "Markets" },
  { label: "tech", cat: "Tech" },
  { label: "business", cat: "Business" },
  { label: "economy", cat: null },
  { label: "politics", cat: null },
  { label: "earnings", cat: null }
];

// ---------------------------------------------------------------------------
// hooks
// ---------------------------------------------------------------------------

function useWorldClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

function fmtClock(d: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: tz
    }).format(d);
  } catch {
    return "--:--:--";
  }
}

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------

export default function MarketLabPage() {
  const crypto = useCryptoFeed();
  const now = useWorldClock();

  const [selected, setSelected] = useState<string>("BTC");
  const [command, setCommand] = useState("BTC");
  const [tvMode, setTvMode] = useState(false);

  // News room · local per-category fetch (shared fetcher, no extra polling
  // loop unless this page is mounted — refreshed manually on chip change).
  const [newsCat, setNewsCat] = useState<NewsCategory>("Markets");
  const [newsChip, setNewsChip] = useState<string>("markets");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [newsState, setNewsState] = useState<"loading" | "ok" | "error" | "adapter">("loading");
  const [newsErr, setNewsErr] = useState<string | undefined>();

  const adapters = useMemo(() => adapterSummary(), []);
  const history = useMissionStore((s) => s.history);
  const current = useMissionStore((s) => s.current);
  const dispatch = useMissionStore((s) => s.dispatch);
  const workflowRuns = useAtlasStore((s) => s.workflowRuns);
  const cost = useMemo(() => computeCostBoard(history), [history]);
  const telegram = useMemo(() => getTelegramBridgeStatus(), []);

  const cryptoOnline = crypto.state === "ok";
  const quotes = crypto.quotes;
  const selectedQuote = quotes.find((q) => q.symbol === selected) ?? null;
  const selectedIsCrypto = (CRYPTO_SYMBOLS as readonly string[]).includes(selected);

  const loadNews = useCallback(async (cat: NewsCategory | null) => {
    if (cat == null) {
      setNewsState("adapter");
      setItems([]);
      return;
    }
    setNewsState("loading");
    const r = await fetchNewsBest(cat, 12);
    if (r.ok) {
      setItems(r.items);
      setNewsState("ok");
      setNewsErr(undefined);
    } else {
      setNewsState("error");
      setNewsErr(r.error);
    }
  }, []);

  useEffect(() => {
    void loadNews(newsCat);
    const t = window.setInterval(() => void loadNews(newsCat), 120_000);
    return () => window.clearInterval(t);
  }, [newsCat, loadNews]);

  const onChip = (chip: { label: string; cat: NewsCategory | null }) => {
    setNewsChip(chip.label);
    if (chip.cat) {
      setNewsCat(chip.cat);
    } else {
      void loadNews(null);
    }
  };

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
  const openSymbol = (symbol: string) => {
    const next = symbol.trim().toUpperCase();
    if (!next) return;
    setSelected(next);
    setCommand(next);
  };

  // Risk indicator · derived ONLY from real crypto 24h %.
  const avgChange = useMemo(() => {
    const c = quotes.map((q) => q.change24h).filter((x): x is number => x != null);
    if (!c.length) return null;
    return c.reduce((a, b) => a + b, 0) / c.length;
  }, [quotes]);

  const approvals = workflowRuns.filter((r) => r.status === "awaiting-approval").length;
  const aiAlert = adapters.error > 0;

  if (tvMode) {
    return (
      <TvWall
        now={now}
        quotes={quotes}
        cryptoOnline={cryptoOnline}
        items={items}
        avgChange={avgChange}
        adapters={adapters}
        approvals={approvals}
        missions={history.length}
        onExit={() => setTvMode(false)}
      />
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-43px)] w-full flex-col gap-1.5 bg-black px-2 py-2">
      <WarRoomHeader
        now={now}
        selected={selected}
        command={command}
        onCommand={setCommand}
        onOpenSymbol={openSymbol}
        crypto={crypto}
        adapters={adapters}
        cryptoOnline={cryptoOnline}
        onTvMode={() => setTvMode(true)}
      />
      <MacroStrip />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-1.5 xl:grid-cols-[210px_minmax(0,1fr)_330px]">
        <WarRoomWatchlist
          quotes={quotes}
          cryptoOnline={cryptoOnline}
          selected={selected}
          onSelect={openSymbol}
        />

        <main className="grid min-h-0 grid-rows-[minmax(360px,1.25fr)_minmax(230px,0.75fr)] gap-1.5">
          <div className="grid min-h-0 grid-cols-1 gap-1.5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
            <MainChartPanel
              selected={selected}
              quote={selectedQuote}
              cryptoOnline={cryptoOnline}
              selectedIsCrypto={selectedIsCrypto}
            />
            <div className="grid min-h-0 grid-rows-2 gap-1.5">
              <ComparisonPanel quotes={quotes} cryptoOnline={cryptoOnline} />
              <VolumePanel selected={selected} selectedIsCrypto={selectedIsCrypto} />
            </div>
          </div>

          <div className="grid min-h-0 grid-cols-1 gap-1.5 lg:grid-cols-3">
            <BreadthPanel quotes={quotes} cryptoOnline={cryptoOnline} avgChange={avgChange} />
            <MacroFxPanel />
            <OrderFlowStack selected={selected} />
          </div>
        </main>

        <aside className="grid min-h-0 grid-rows-[minmax(260px,1fr)_minmax(210px,0.72fr)] gap-1.5">
          <VerticalNewsTape
            chip={newsChip}
            onChip={onChip}
            items={items}
            state={newsState}
            err={newsErr}
            missionBusy={!!current}
            onCreateMission={onCreateMission}
            onSaveToBrain={onSaveToBrain}
          />
          <AiAnalystPanel
            selected={selected}
            quote={selectedQuote}
            selectedIsCrypto={selectedIsCrypto}
            cryptoOnline={cryptoOnline}
            newsItems={items}
            alert={aiAlert}
            cost={cost}
            telegram={telegram}
            adapters={adapters}
            missions={history.length}
            approvals={approvals}
          />
        </aside>
      </div>

      <Ticker quotes={quotes} items={items} cryptoOnline={cryptoOnline} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// A · TOP BAR
// ---------------------------------------------------------------------------

function WarRoomHeader({
  now,
  selected,
  command,
  onCommand,
  onOpenSymbol,
  crypto,
  adapters,
  cryptoOnline,
  onTvMode
}: {
  now: Date;
  selected: string;
  command: string;
  onCommand: (v: string) => void;
  onOpenSymbol: (s: string) => void;
  crypto: ReturnType<typeof useCryptoFeed>;
  adapters: ReturnType<typeof adapterSummary>;
  cryptoOnline: boolean;
  onTvMode: () => void;
}) {
  const latency = crypto.at ? `${Math.max(1, Math.round((Date.now() - crypto.at) / 1000))}s` : "—";
  return (
    <section className="border border-white/10 bg-[#05070b]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-2 py-1">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          <LineChart className="h-3.5 w-3.5" /> Market Lab War Room
        </span>
        <form
          className="flex min-w-[260px] flex-1 items-center gap-1 border border-white/10 bg-white/[0.025] px-2 py-1"
          onSubmit={(e) => {
            e.preventDefault();
            onOpenSymbol(command);
          }}
        >
          <Search className="h-3.5 w-3.5 text-white/35" />
          <input
            value={command}
            onChange={(e) => onCommand(e.target.value)}
            placeholder="BTC, ETH, SOL, AAPL, TSLA, NVDA, EURUSD, XAUUSD"
            className="min-w-0 flex-1 bg-transparent font-mono text-[12px] uppercase tracking-wide text-white outline-none placeholder:text-white/25"
          />
          <button
            type="submit"
            className="border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/60 hover:bg-white/[0.06]"
          >
            open
          </button>
        </form>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
          active <span className="text-white/85">{selected}</span>
        </span>
        <Pill tone={cryptoOnline ? "ok" : crypto.state === "error" ? "bad" : "muted"}>
          CoinGecko {cryptoOnline ? "connected" : crypto.state}
        </Pill>
        <Pill tone="accent">{adapters.ready} adapter-ready</Pill>
        <Pill tone="muted">{adapters.offline} offline</Pill>
        <button
          type="button"
          onClick={onTvMode}
          className="inline-flex items-center gap-1 border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
        >
          <Tv className="h-3.5 w-3.5" /> wall
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white/40">
        <span>/ search</span>
        <span>1D · 7D · 1M · 3M · 1Y</span>
        <span>last crypto refresh {crypto.at ? new Date(crypto.at).toLocaleTimeString() : "—"} · {latency}</span>
        {CLOCKS.map((c) => (
          <span key={c.tz}>{c.label} <span className="text-white/75">{fmtClock(now, c.tz)}</span></span>
        ))}
      </div>
    </section>
  );
}

function MacroStrip() {
  const market = statusForModule("markets").status;
  const fx = statusForModule("fx").status;
  const commodities = statusForModule("commodities").status;
  const cells: Array<{ label: string; status: string; detail: string }> = [
    { label: "DXY", status: market, detail: "TwelveData required" },
    { label: "US10Y", status: market, detail: "rates provider required" },
    { label: "VIX", status: market, detail: "index provider required" },
    { label: "EURUSD", status: fx, detail: "FX adapter" },
    { label: "XAUUSD", status: commodities, detail: "commodities adapter" },
    { label: "BTC.D", status: "adapter-ready", detail: "dominance source required" }
  ];
  return (
    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-6">
      {cells.map((c) => (
        <div key={c.label} className="flex items-center justify-between border border-white/8 bg-white/[0.015] px-2 py-1">
          <span className="font-mono text-[10px] text-white/80">{c.label}</span>
          <span className="text-right font-mono text-[8px] uppercase tracking-wider text-white/35">
            {c.status === "connected" ? "connected" : "adapter-ready"} · no live value
          </span>
        </div>
      ))}
    </div>
  );
}

function WarRoomWatchlist({
  quotes,
  cryptoOnline,
  selected,
  onSelect
}: {
  quotes: CryptoQuote[];
  cryptoOnline: boolean;
  selected: string;
  onSelect: (s: string) => void;
}) {
  return (
    <Panel title="watchlist" icon={<LineChart className="h-3.5 w-3.5" />} bodyClassName="gap-0 p-0">
      <div className="grid grid-cols-[52px_1fr_52px] border-b border-white/6 px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-white/30">
        <span>sym</span><span>last</span><span className="text-right">24h</span>
      </div>
      <div className="flex flex-col divide-y divide-white/6">
        {WAR_ROOM_WATCHLIST.map((sym) => {
          const q = quotes.find((x) => x.symbol === sym);
          const supported = (CRYPTO_SYMBOLS as readonly string[]).includes(sym);
          const up = (q?.change24h ?? 0) >= 0;
          return (
            <button
              key={sym}
              type="button"
              onClick={() => onSelect(sym)}
              className={clsx(
                "grid grid-cols-[52px_1fr_52px] items-center gap-2 px-2 py-1 text-left transition hover:bg-white/[0.035]",
                selected === sym && "bg-accent/[0.08]"
              )}
            >
              <span className="font-mono text-[11px] text-white/85">{sym}</span>
              <span className="font-mono text-[10px] tabular-nums text-white/65">
                {supported && cryptoOnline ? formatPrice(q?.price ?? null) : "no source"}
              </span>
              <span className={clsx("text-right font-mono text-[10px] tabular-nums", !supported || q?.change24h == null ? "text-white/30" : up ? "text-emerald-300" : "text-rose-300")}>
                {supported && cryptoOnline ? formatChange(q?.change24h ?? null) : "—"}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function MainChartPanel({
  selected,
  quote,
  cryptoOnline,
  selectedIsCrypto
}: {
  selected: string;
  quote: CryptoQuote | null;
  cryptoOnline: boolean;
  selectedIsCrypto: boolean;
}) {
  const up = (quote?.change24h ?? 0) >= 0;
  const hasBinance = binancePairFor(selected) != null;
  return (
    <Panel
      title={`main candlestick · ${selected}/${hasBinance ? "USDT" : "USD"}`}
      icon={<LineChart className="h-3.5 w-3.5" />}
      right={
        <Pill tone={hasBinance ? "ok" : selectedIsCrypto ? "ok" : "muted"}>
          {hasBinance ? "Binance OHLCV · real" : selectedIsCrypto ? "line only · OHLC adapter-ready" : "no source"}
        </Pill>
      }
      glow
    >
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">last · coingecko</span>
          <span className="font-mono text-3xl font-semibold tabular-nums text-white">
            {selectedIsCrypto && cryptoOnline ? formatPrice(quote?.price ?? null) : "—"}
          </span>
        </div>
        <span className={clsx("font-mono text-xl tabular-nums", quote?.change24h == null ? "text-white/35" : up ? "text-emerald-300" : "text-rose-300")}>
          {selectedIsCrypto && cryptoOnline ? formatChange(quote?.change24h ?? null) : "—"}
        </span>
      </div>
      {hasBinance ? (
        <CandlestickChart symbol={selected} height={300} />
      ) : selectedIsCrypto ? (
        <PriceChartLW symbol={selected} up={up} fullscreen />
      ) : (
        <AdapterReady what={`${selected} · no live chart source`} detail="Equities, FX and metals need a keyed market provider. No candles, last price or volume are fabricated." />
      )}
    </Panel>
  );
}

function ComparisonPanel({ quotes, cryptoOnline }: { quotes: CryptoQuote[]; cryptoOnline: boolean }) {
  void quotes;
  void cryptoOnline;
  return (
    <Panel title="BTC / ETH comparison" icon={<Activity className="h-3.5 w-3.5" />} right={<Pill tone="ok">CoinGecko · normalized</Pill>}>
      <ComparisonChart symbols={["BTC", "ETH"]} days={7} height={150} />
    </Panel>
  );
}

function VolumePanel({ selected, selectedIsCrypto }: { selected: string; selectedIsCrypto: boolean }) {
  return (
    <Panel title="volume / VWAP" icon={<Gauge className="h-3.5 w-3.5" />} right={<Pill tone={selectedIsCrypto ? "ok" : "muted"}>{selectedIsCrypto ? "volume real" : "no source"}</Pill>}>
      {selectedIsCrypto ? (
        <>
          <PriceChartLW symbol={selected} up fullscreen={false} />
          <p className="font-mono text-[8.5px] uppercase tracking-wider text-white/35">volume from CoinGecko history · VWAP adapter-ready</p>
        </>
      ) : (
        <AdapterReady what={`${selected} volume · no source`} detail="VWAP needs trade-level or OHLCV data. No synthetic volume shown." />
      )}
    </Panel>
  );
}

function BreadthPanel({
  quotes,
  cryptoOnline,
  avgChange
}: {
  quotes: CryptoQuote[];
  cryptoOnline: boolean;
  avgChange: number | null;
}) {
  return (
    <Panel title="market breadth / heat" icon={<Grid3x3 className="h-3.5 w-3.5" />} right={<Pill tone="ok">crypto real</Pill>}>
      <CryptoHeatmap quotes={quotes} cryptoOnline={cryptoOnline} />
      <StatRow label="crypto avg 24h" value={cryptoOnline && avgChange != null ? formatChange(avgChange) : "—"} />
      <AdapterReady what="equity breadth · no source" detail="Advance/decline, sector breadth and volatility maps need an equities provider." />
    </Panel>
  );
}

function MacroFxPanel() {
  return (
    <Panel title="macro / FX strip chart" icon={<Globe2 className="h-3.5 w-3.5" />} right={<Pill tone="muted">adapter-ready</Pill>}>
      <div className="grid grid-cols-2 gap-1">
        {MACRO_STRIP.map((s) => (
          <div key={s} className="flex items-center justify-between border border-white/8 bg-white/[0.01] px-1.5 py-1" style={HATCH}>
            <span className="font-mono text-[10px] text-white/55">{s}</span>
            <span className="font-mono text-[8px] uppercase tracking-wider text-white/30">no source</span>
          </div>
        ))}
      </div>
      <AdapterReady what="macro strip · no live values" detail="DXY, US10Y, VIX, FX and metals need TwelveData/FMP or another keyed source." />
    </Panel>
  );
}

function OrderFlowStack({ selected }: { selected: string }) {
  const hasBinance = binancePairFor(selected) != null;
  return (
    <div className="grid min-h-0 grid-rows-3 gap-1.5">
      <Panel
        title="order book"
        icon={<Signal className="h-3.5 w-3.5" />}
        right={<Pill tone={hasBinance ? "ok" : "muted"}>{hasBinance ? "Binance · live" : "no source"}</Pill>}
        bodyClassName="p-2"
      >
        <OrderBookPanel symbol={selected} rows={10} />
      </Panel>
      <Panel
        title="time & sales"
        icon={<Signal className="h-3.5 w-3.5" />}
        right={<Pill tone={hasBinance ? "ok" : "muted"}>{hasBinance ? "Binance · live" : "no source"}</Pill>}
        bodyClassName="p-2"
      >
        <TimeAndSalesPanel symbol={selected} rows={12} />
      </Panel>
      <Panel
        title="liquidity / depth"
        icon={<Signal className="h-3.5 w-3.5" />}
        right={<Pill tone={hasBinance ? "ok" : "muted"}>{hasBinance ? "Binance · L2 cumulative" : "no source"}</Pill>}
        bodyClassName="p-2"
      >
        <DepthPanel symbol={selected} height={130} />
      </Panel>
    </div>
  );
}

function VerticalNewsTape({
  chip,
  onChip,
  items,
  state,
  err,
  missionBusy,
  onCreateMission,
  onSaveToBrain
}: {
  chip: string;
  onChip: (c: { label: string; cat: NewsCategory | null }) => void;
  items: NewsItem[];
  state: "loading" | "ok" | "error" | "adapter";
  err?: string;
  missionBusy: boolean;
  onCreateMission: (n: NewsItem) => void;
  onSaveToBrain: (n: NewsItem) => void;
}) {
  return (
    <Panel title="vertical news tape" icon={<Newspaper className="h-3.5 w-3.5" />} bodyClassName="min-h-0">
      <div className="flex flex-wrap gap-1">
        {NEWS_CHIPS.slice(0, 6).map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onChip(c)}
            className={clsx("border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider", c.label === chip ? "border-accent/40 bg-accent/[0.08] text-accent" : "border-white/10 bg-white/[0.02] text-white/45")}
          >
            {c.label}{c.cat == null ? " · ready" : ""}
          </button>
        ))}
      </div>
      {state === "error" && <p className="font-mono text-[10px] text-rose-300">{err}</p>}
      {state === "adapter" && <AdapterReady what="news category · adapter-ready" detail="No live wire for this category." />}
      {state === "loading" && items.length === 0 && <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">loading real wire...</p>}
      <ul className="min-h-0 flex-1 divide-y divide-white/6 overflow-auto">
        {items.map((n) => (
          <li key={n.id} className="flex flex-col gap-1 py-1.5">
            <a href={n.url ?? "#"} target="_blank" rel="noreferrer noopener" className="text-[11px] leading-snug text-white/80 hover:text-accent">
              {n.title}
            </a>
            <div className="flex items-center justify-between gap-2 font-mono text-[8px] uppercase tracking-wider text-white/35">
              <span>{n.source} · {timeAgo(n.time)}</span>
              <span>{n.category}</span>
            </div>
            <div className="flex gap-1">
              <NewsAction Icon={Rocket} label={missionBusy ? "busy" : "mission"} disabled={missionBusy} onClick={() => onCreateMission(n)} />
              <NewsAction Icon={Save} label="save" onClick={() => onSaveToBrain(n)} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function AiAnalystPanel({
  selected,
  quote,
  selectedIsCrypto,
  cryptoOnline,
  newsItems,
  alert,
  cost,
  telegram,
  adapters,
  missions,
  approvals
}: {
  selected: string;
  quote: CryptoQuote | null;
  selectedIsCrypto: boolean;
  cryptoOnline: boolean;
  newsItems: NewsItem[];
  alert: boolean;
  cost: ReturnType<typeof computeCostBoard>;
  telegram: ReturnType<typeof getTelegramBridgeStatus>;
  adapters: ReturnType<typeof adapterSummary>;
  missions: number;
  approvals: number;
}) {
  const relatedNews = newsItems.filter((n) => n.title.toUpperCase().includes(selected)).slice(0, 3);
  return (
    <Panel title="AI Analyst" icon={<Bot className="h-3.5 w-3.5" />} right={<Pill tone="muted">analysis adapter-ready</Pill>}>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <StatRow label="symbol" value={selected} />
        <StatRow label="source" value={selectedIsCrypto ? "CoinGecko" : "no source"} tone={selectedIsCrypto ? "ok" : "muted"} />
        <StatRow label="last" value={selectedIsCrypto && cryptoOnline ? formatPrice(quote?.price ?? null) : "—"} />
        <StatRow label="24h" value={selectedIsCrypto && cryptoOnline ? formatChange(quote?.change24h ?? null) : "—"} />
        <StatRow label="market cap" value={selectedIsCrypto && cryptoOnline ? formatMarketCap(quote?.marketCap ?? null) : "—"} />
        <StatRow label="related news" value={relatedNews.length} />
      </div>
      <div className="border-t border-white/6 pt-2">
        <p className="font-mono text-[9px] uppercase tracking-wider text-white/40">
          context only · no recommendation · no buy/sell signal · model analysis adapter-ready
        </p>
      </div>
      {relatedNews.length > 0 ? (
        <ul className="space-y-1">
          {relatedNews.map((n) => (
            <li key={n.id} className="truncate font-mono text-[9px] text-white/55">{n.source} · {n.title}</li>
          ))}
        </ul>
      ) : (
        <AdapterReady what="symbol-specific analysis" detail="No model output or strategy engine is connected. This panel only summarizes available real context." />
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-white/6 pt-1.5">
        <StatRow label="adapter errors" value={alert ? "yes" : "none"} tone={alert ? "bad" : "ok"} />
        <StatRow label="cloud avoided" value={formatUsd(cost.estimatedCloudCostAvoidedUSD)} />
        <StatRow label="telegram" value={telegram.live} />
        <StatRow label="adapters" value={`${adapters.connected} live / ${adapters.ready} ready`} />
        <StatRow label="missions" value={missions} />
        <StatRow label="approvals" value={approvals} tone={approvals > 0 ? "warn" : undefined} />
      </div>
    </Panel>
  );
}

function TopBar({
  now,
  crypto,
  adapters,
  cryptoOnline
}: {
  now: Date;
  crypto: ReturnType<typeof useCryptoFeed>;
  adapters: ReturnType<typeof adapterSummary>;
  cryptoOnline: boolean;
}) {
  const latency = crypto.at ? `${Math.max(1, Math.round((Date.now() - crypto.at) / 1000))}s` : "—";
  const stateTone: Tone = crypto.state === "ok" ? "ok" : crypto.state === "error" ? "bad" : "muted";
  return (
    <section
      className="relative flex flex-wrap items-center gap-x-4 gap-y-1.5 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-white/[0.035] to-white/[0.01] px-2.5 py-1.5"
      style={GRID_BG}
    >
      {/* command / status input row */}
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tabular-nums text-white/55">
        <Radio className="h-3.5 w-3.5 text-accent" />
        <span className="text-accent">{">"}</span>
        <span className="text-white/40">market</span>
        <Pill tone={stateTone}>{cryptoOnline ? "live · crypto" : crypto.state}</Pill>
        <span className="text-white/35">{latency}</span>
      </span>

      <span className="hidden h-3.5 w-px bg-white/10 sm:inline-block" />

      <span className="inline-flex flex-wrap items-center gap-1.5">
        <Signal className="h-3.5 w-3.5 text-accent" />
        <Pill tone="ok">{adapters.connected} live</Pill>
        <Pill tone="accent">{adapters.ready} ready</Pill>
        {adapters.error > 0 && <Pill tone="bad">{adapters.error} err</Pill>}
        <Pill tone="muted">{adapters.offline} off</Pill>
      </span>

      <span className="hidden h-3.5 w-px bg-white/10 md:inline-block" />

      <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <Globe2 className="h-3.5 w-3.5 text-accent" />
        {CLOCKS.map((c) => (
          <span key={c.tz} className="inline-flex items-baseline gap-1 font-mono">
            <span className="text-[9px] uppercase tracking-wider text-white/40">{c.label}</span>
            <span className="text-[11px] tabular-nums text-white/85">{fmtClock(now, c.tz)}</span>
          </span>
        ))}
      </span>

      <span className="ml-auto inline-flex items-center gap-2">
        <Cpu className="h-3.5 w-3.5 text-accent" />
        <Dot live={cryptoOnline} label="local-first · desktop" />
      </span>
    </section>
  );
}

// ---------------------------------------------------------------------------
// B · WATCHLISTS
// ---------------------------------------------------------------------------

function Watchlists({
  quotes,
  cryptoOnline,
  selected,
  onSelect
}: {
  quotes: CryptoQuote[];
  cryptoOnline: boolean;
  selected: string;
  onSelect: (s: string) => void;
}) {
  return (
    <>
      <Panel
        title="crypto"
        icon={<LineChart className="h-3.5 w-3.5" />}
        right={<Dot live={cryptoOnline} label="live" />}
        bodyClassName="gap-0 p-0"
      >
        <div className="flex items-center justify-between px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-wider text-white/30">
          <span>sym</span>
          <span className="flex items-center gap-3">
            <span>last</span>
            <span>24h</span>
          </span>
        </div>
        <ul className="flex flex-col divide-y divide-white/6 border-t border-white/6">
          {CRYPTO_SYMBOLS.map((sym) => {
            const q = quotes.find((x) => x.symbol === sym);
            const up = (q?.change24h ?? 0) >= 0;
            return (
              <li key={sym}>
                <button
                  type="button"
                  onClick={() => onSelect(sym)}
                  className={clsx(
                    "flex w-full items-center justify-between gap-2 px-2.5 py-1 text-left transition",
                    sym === selected ? "bg-accent/[0.07]" : "hover:bg-white/[0.03]"
                  )}
                >
                  <span className="font-mono text-[11px] text-white/85">{sym}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[10px] tabular-nums text-white/80">
                      {cryptoOnline ? formatPrice(q?.price ?? null) : "—"}
                    </span>
                    <span
                      className={clsx(
                        "w-12 text-right font-mono text-[10px] tabular-nums",
                        q?.change24h == null ? "text-white/35" : up ? "text-emerald-300" : "text-rose-300"
                      )}
                    >
                      {cryptoOnline ? formatChange(q?.change24h ?? null) : "—"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <AdapterWatchlist title="stocks" symbols={STOCKS} />
      <AdapterWatchlist title="fx" symbols={FX} />
      <AdapterWatchlist title="commodities" symbols={COMMODITIES} />
    </>
  );
}

function AdapterWatchlist({ title, symbols }: { title: string; symbols: string[] }) {
  return (
    <Panel
      title={title}
      icon={<Boxes className="h-3.5 w-3.5" />}
      right={<Pill tone="muted">adapter-ready</Pill>}
      className="opacity-80"
      bodyClassName="gap-0 p-0"
    >
      <div className="flex flex-col divide-y divide-white/6 px-1.5" style={HATCH}>
        {symbols.map((s) => (
          <DisabledRow key={s} label={s} note="no source" />
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// C · CHART WALL
// ---------------------------------------------------------------------------

function ChartWall({
  selected,
  quote,
  quotes,
  cryptoOnline,
  chartTab,
  onChartTab,
  stack,
  onStack,
  fullscreen,
  onFullscreen,
  onSelect
}: {
  selected: string;
  quote: CryptoQuote | null;
  quotes: CryptoQuote[];
  cryptoOnline: boolean;
  chartTab: ChartTab;
  onChartTab: (t: ChartTab) => void;
  stack: (typeof STACK_OPTIONS)[number];
  onStack: (n: (typeof STACK_OPTIONS)[number]) => void;
  fullscreen: boolean;
  onFullscreen: () => void;
  onSelect: (s: string) => void;
}) {
  const samples = getSamples(selected);
  const up = (quote?.change24h ?? 0) >= 0;
  const isReal = REAL_TABS.includes(chartTab);

  return (
    <Panel
      glow
      className="relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0" style={GRID_BG} />
      <div className="relative flex flex-col gap-2">
        {/* header row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
            <LineChart className="h-3.5 w-3.5" /> chart wall · {selected}/USD
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {STACK_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onStack(n)}
                  className={clsx(
                    "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
                    n === stack
                      ? "border-accent/40 bg-accent/[0.08] text-accent"
                      : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
                  )}
                >
                  {n}x
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onFullscreen}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06]"
            >
              {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              {fullscreen ? "exit tv" : "tv"}
            </button>
          </div>
        </div>

        {/* tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {CHART_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChartTab(t)}
              className={clsx(
                "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
                t === chartTab
                  ? "border-accent/40 bg-accent/[0.08] text-accent"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]",
                !REAL_TABS.includes(t) && "opacity-70"
              )}
            >
              {t}
              {!REAL_TABS.includes(t) && <span className="ml-1 text-white/30">·ready</span>}
            </button>
          ))}
        </div>

        {/* body */}
        {chartTab === "price" && (
          <>
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">{selected}/USD</span>
                <span className={clsx("font-mono font-semibold tabular-nums", fullscreen ? "text-6xl" : "text-4xl")}>
                  {cryptoOnline ? formatPrice(quote?.price ?? null) : "—"}
                </span>
              </div>
              <span
                className={clsx(
                  "rounded-lg border px-2 py-1 font-mono tabular-nums",
                  fullscreen ? "text-2xl" : "text-base",
                  quote?.change24h == null
                    ? "border-white/10 bg-white/[0.03] text-white/45"
                    : up
                      ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-300"
                      : "border-rose-400/30 bg-rose-500/[0.08] text-rose-300"
                )}
              >
                {cryptoOnline ? formatChange(quote?.change24h ?? null) : "—"}
              </span>
            </div>
            <PriceChartLW symbol={selected} up={up} fullscreen={fullscreen} />
            {/* multi-chart stack · real crypto minis */}
            <div
              className={clsx(
                "grid gap-2",
                stack === 1
                  ? "grid-cols-1"
                  : stack === 2
                    ? "grid-cols-2"
                    : stack === 4
                      ? "grid-cols-2 md:grid-cols-4"
                      : "grid-cols-3 md:grid-cols-6"
              )}
            >
              {CRYPTO_SYMBOLS.map((sym) => {
                const q = quotes.find((x) => x.symbol === sym) ?? null;
                return (
                  <MiniChart
                    key={sym}
                    symbol={sym}
                    quote={q}
                    online={cryptoOnline}
                    active={sym === selected}
                    onClick={() => onSelect(sym)}
                  />
                );
              })}
            </div>
          </>
        )}

        {chartTab === "heatmap" && <CryptoHeatmap quotes={quotes} cryptoOnline={cryptoOnline} />}

        {!isReal && (
          <AdapterReady
            what={`${chartTab} view · needs provider`}
            detail="This view needs a wired market provider (equities / FX / on-chain flow / sentiment). The seam is defined; no numbers are shown until a real round-trip is verified."
          />
        )}
      </div>
    </Panel>
  );
}

function BigChart({ samples, up, fullscreen }: { samples: Sample[]; up: boolean; fullscreen: boolean }) {
  const h = fullscreen ? 320 : 180;
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
  const W = 800;
  const prices = samples.map((s) => s.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const pad = 8;
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

function MiniChart({
  symbol,
  quote,
  online,
  active,
  onClick
}: {
  symbol: string;
  quote: CryptoQuote | null;
  online: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const samples = getSamples(symbol);
  const up = (quote?.change24h ?? 0) >= 0;
  const W = 120;
  const h = 36;
  let path: string | null = null;
  if (samples.length >= 2) {
    const prices = samples.map((s) => s.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1;
    path = samples
      .map((s, i) => {
        const x = (i / (samples.length - 1)) * W;
        const y = h - ((s.price - min) / span) * (h - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex flex-col gap-1 rounded-lg border p-2 text-left transition",
        active ? "border-accent/40 bg-accent/[0.06]" : "border-white/8 bg-white/[0.012] hover:bg-white/[0.04]"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-white/80">{symbol}</span>
        <span className={clsx("font-mono text-[9px] tabular-nums", quote?.change24h == null ? "text-white/35" : up ? "text-emerald-300" : "text-rose-300")}>
          {online ? formatChange(quote?.change24h ?? null) : "—"}
        </span>
      </div>
      {path ? (
        <svg viewBox={`0 0 ${W} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
          <polyline points={path} fill="none" stroke={up ? "rgb(52,211,153)" : "rgb(248,113,113)"} strokeWidth={1.5} />
        </svg>
      ) : (
        <div className="flex items-center justify-center font-mono text-[8px] uppercase tracking-wider text-white/25" style={{ height: h }}>
          collecting
        </div>
      )}
      <span className="font-mono text-[9px] tabular-nums text-white/55">{online ? formatPrice(quote?.price ?? null) : "—"}</span>
    </button>
  );
}

function CryptoHeatmap({ quotes, cryptoOnline }: { quotes: CryptoQuote[]; cryptoOnline: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Pill tone="ok">real · 24h %</Pill>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">CoinGecko · live crypto only</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {CRYPTO_SYMBOLS.map((sym) => {
          const q = quotes.find((x) => x.symbol === sym) ?? null;
          const style = heatStyle(cryptoOnline ? q?.change24h ?? null : null);
          return (
            <div
              key={sym}
              className="flex flex-col gap-0.5 rounded border p-1.5"
              style={{ background: style.background, borderColor: style.border }}
            >
              <span className="font-mono text-[10px] text-white/90">{sym}</span>
              <span className="font-mono text-[13px] font-semibold tabular-nums text-white">
                {cryptoOnline ? formatChange(q?.change24h ?? null) : "—"}
              </span>
              <span className="font-mono text-[9px] tabular-nums text-white/55">
                {cryptoOnline ? formatPrice(q?.price ?? null) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MARKET MAPS
// ---------------------------------------------------------------------------

function MarketMaps({
  quotes,
  cryptoOnline,
  avgChange
}: {
  quotes: CryptoQuote[];
  cryptoOnline: boolean;
  avgChange: number | null;
}) {
  const regime =
    avgChange == null
      ? { label: "no signal", tone: "muted" as Tone }
      : avgChange > 2
        ? { label: "risk-on", tone: "ok" as Tone }
        : avgChange < -2
          ? { label: "risk-off", tone: "bad" as Tone }
          : { label: "neutral", tone: "muted" as Tone };

  return (
    <Panel title="market maps" icon={<Grid3x3 className="h-3.5 w-3.5" />}>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">crypto heatmap · real 24h %</span>
          <CryptoHeatmap quotes={quotes} cryptoOnline={cryptoOnline} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-1 rounded border border-white/10 bg-white/[0.02] p-2">
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
              <Gauge className="h-3.5 w-3.5" /> risk regime
            </span>
            <div className="flex items-center gap-2">
              <Pill tone={regime.tone}>{regime.label}</Pill>
              <span className="font-mono text-[11px] tabular-nums text-white/80">
                {cryptoOnline && avgChange != null ? formatChange(avgChange) : "—"}
              </span>
            </div>
            <span className="font-mono text-[8.5px] uppercase tracking-wider text-white/35">
              from crypto 24h % only · not a market-wide read
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5" style={HATCH}>
            {["sector", "volatility", "correlation", "breadth"].map((m) => (
              <div
                key={m}
                className="flex items-center justify-between gap-1 rounded border border-white/8 bg-white/[0.008] px-1.5 py-1 opacity-65"
              >
                <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">{m}</span>
                <Pill tone="muted">off</Pill>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// NEWS ROOM
// ---------------------------------------------------------------------------

function NewsRoom({
  chip,
  onChip,
  items,
  state,
  err,
  missionBusy,
  onCreateMission,
  onSaveToBrain
}: {
  chip: string;
  onChip: (c: { label: string; cat: NewsCategory | null }) => void;
  items: NewsItem[];
  state: "loading" | "ok" | "error" | "adapter";
  err?: string;
  missionBusy: boolean;
  onCreateMission: (n: NewsItem) => void;
  onSaveToBrain: (n: NewsItem) => void;
}) {
  const hero = items[0] ?? null;
  return (
    <Panel title="news room" icon={<Newspaper className="h-3.5 w-3.5" />}>
      {/* category ribbon */}
      <div className="flex flex-wrap items-center gap-1">
        {NEWS_CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onChip(c)}
            className={clsx(
              "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
              c.label === chip
                ? "border-accent/40 bg-accent/[0.08] text-accent"
                : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]",
              c.cat == null && "opacity-70"
            )}
            title={c.cat == null ? "adapter-ready · no live source" : "live feed"}
          >
            {c.label}
            {c.cat == null && <span className="ml-1 text-white/30">·ready</span>}
          </button>
        ))}
      </div>

      {state === "adapter" ? (
        <AdapterReady what="this category · no live wire" detail="HN / NewsAPI cover AI, Markets, Crypto, Tech, Business. Breaking / economy / politics / earnings need a dedicated wire — no headlines fabricated." />
      ) : state === "error" ? (
        <div className="rounded border border-rose-400/25 bg-rose-500/[0.06] px-2.5 py-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-rose-200">news wire offline</p>
          <p className="mt-0.5 text-[10.5px] text-white/55">{err}</p>
        </div>
      ) : !hero ? (
        <p className="font-mono text-[11px] uppercase tracking-wider text-white/40">loading wire…</p>
      ) : (
        <>
          <article className="flex flex-col gap-1.5 rounded border border-white/10 bg-black/30 p-2.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent">{hero.category}</span>
            <a
              href={hero.url ?? "#"}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[15px] font-semibold leading-snug text-white hover:text-accent"
            >
              {hero.title}
            </a>
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
              {hero.source} · {timeAgo(hero.time)}
            </span>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <NewsAction Icon={Rocket} label={missionBusy ? "mission running" : "create mission"} disabled={missionBusy} onClick={() => onCreateMission(hero)} accent />
              <NewsAction Icon={Save} label="save to brain" onClick={() => onSaveToBrain(hero)} />
              {hero.url && (
                <a
                  href={hero.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
                >
                  <ExternalLink className="h-3 w-3" /> open source
                </a>
              )}
            </div>
          </article>
          <ul className="flex max-h-[180px] flex-col divide-y divide-white/6 overflow-auto">
            {items.slice(1).map((n, i) => (
              <li key={n.id} className="flex items-center gap-2 px-1 py-1 text-[11px]">
                <span className="font-mono text-[8px] tabular-nums text-white/30">{String(i + 2).padStart(2, "0")}</span>
                <a
                  href={n.url ?? "#"}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="min-w-0 flex-1 truncate text-white/80 hover:text-accent"
                  title={n.title}
                >
                  {n.title}
                </a>
                <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-wider text-white/35">{timeAgo(n.time)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

function NewsAction({
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
// POLYMARKET
// ---------------------------------------------------------------------------

function PolymarketWall() {
  const [tab, setTab] = useState("Politics");
  const tabs = ["Politics", "Crypto", "AI", "Economy", "Top movers"];
  return (
    <Panel title="prediction wall" icon={<Waypoints className="h-3.5 w-3.5" />} right={<Pill tone="muted">adapter-ready</Pill>} className="opacity-80">
      <div className="flex flex-wrap items-center gap-1 opacity-60" style={HATCH}>
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={clsx(
              "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
              t === tab
                ? "border-white/15 bg-white/[0.05] text-white/55"
                : "border-white/10 bg-white/[0.02] text-white/40 hover:bg-white/[0.04]"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <AdapterReady
        what="Polymarket · prediction odds"
        detail="No verified round-trip yet — no odds, movers or probabilities shown. Fabricated betting numbers would be dishonest."
      />
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// D · AI MARKET STACK
// ---------------------------------------------------------------------------

function AiMarketStack({ alert, cost }: { alert: boolean; cost: ReturnType<typeof computeCostBoard> }) {
  const cloud = formatUsd(0);
  const rows: Array<{
    name: string;
    state: string;
    stateTone: Tone;
    confidence: string;
    cost: string;
    provider: string;
  }> = [
    { name: "Atlas Market", state: "watching", stateTone: "accent", confidence: "—", cost: cloud, provider: "local brain" },
    { name: "Local Engine", state: "ready", stateTone: "ok", confidence: "n/a", cost: cloud, provider: "deterministic" },
    { name: "Claude", state: "idle · BYOK", stateTone: "muted", confidence: "—", cost: cloud, provider: "no key" },
    { name: "GPT", state: "idle · BYOK", stateTone: "muted", confidence: "—", cost: cloud, provider: "no key" },
    { name: "Gemini", state: "idle · BYOK", stateTone: "muted", confidence: "—", cost: cloud, provider: "no key" }
  ];
  return (
    <Panel
      title="ai market stack"
      icon={<Cpu className="h-3.5 w-3.5" />}
      right={alert ? <Pill tone="bad">alert</Pill> : <Pill tone="ok">nominal</Pill>}
      bodyClassName="gap-0 p-0"
    >
      <ul className="flex flex-col divide-y divide-white/6">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-2 px-2.5 py-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-mono text-[11px] text-white/85">{r.name}</span>
              <span className="font-mono text-[8.5px] uppercase tracking-wider text-white/30">{r.provider}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <Pill tone="muted">conf {r.confidence}</Pill>
              <Pill tone={r.stateTone}>{r.state}</Pill>
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-white/6 px-2.5 py-1.5 font-mono text-[8.5px] uppercase tracking-wider text-white/35">
        no fabricated signals · confidence "—" until a real engine emits one · est cloud avoided {formatUsd(cost.estimatedCloudCostAvoidedUSD)}
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// E · BOT COMMAND CENTER (read-only mirror)
// ---------------------------------------------------------------------------

function BotCommandCenter({
  telegram,
  adapters,
  missions,
  approvals
}: {
  telegram: ReturnType<typeof getTelegramBridgeStatus>;
  adapters: ReturnType<typeof adapterSummary>;
  missions: number;
  approvals: number;
}) {
  const live = telegram.live === "live-connected" || telegram.live === "live-ready";
  return (
    <Panel title="bot command center" icon={<Bot className="h-3.5 w-3.5" />} right={<Pill tone="muted">read-only</Pill>}>
      <div className="flex items-center gap-2 border-b border-white/6 pb-1.5">
        <Dot live={live} label="telegram" />
        <Pill tone={live ? "ok" : "muted"}>{telegram.live}</Pill>
      </div>
      <div className="flex flex-col divide-y divide-white/6">
        <StatRow label="status" value={live ? "connected bot" : "simulator only"} tone={live ? "ok" : undefined} />
        <StatRow label="runtime" value="local-first" />
        <StatRow label="latency" value={adapters.connected > 0 ? "live" : "—"} />
        <StatRow label="missions" value={missions} />
        <StatRow label="approval queue" value={approvals} tone={approvals > 0 ? "warn" : undefined} />
        <StatRow label="execution" value="disabled" tone="muted" />
      </div>
      <span className="flex items-center gap-1.5 border-t border-white/6 pt-1.5 font-mono text-[8.5px] uppercase tracking-wider text-white/35">
        <ShieldCheck className="h-3 w-3" /> display-only mirror · moves nothing · no remote execution
      </span>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// F · TICKER
// ---------------------------------------------------------------------------

function Ticker({
  quotes,
  items,
  cryptoOnline
}: {
  quotes: CryptoQuote[];
  items: NewsItem[];
  cryptoOnline: boolean;
}) {
  const cryptoBits = cryptoOnline
    ? quotes.filter((q) => q.price != null).map((q) => `${q.symbol} ${formatPrice(q.price)} ${formatChange(q.change24h)} · cap ${formatMarketCap(q.marketCap)}`)
    : [];
  const newsBits = items.slice(0, 8).map((n) => n.title);
  const bits = [...cryptoBits, ...newsBits];

  if (bits.length === 0) {
    return (
      <div className="rounded border border-white/8 bg-black/30 px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-white/40">
        news tape · feeds offline / adapter-ready · real crypto + headlines appear here when a feed is live
      </div>
    );
  }
  const run = [...bits, ...bits];
  return (
    <div className="flex items-center overflow-hidden rounded border border-white/8 bg-black/40">
      <span className="shrink-0 border-r border-white/8 px-2 py-1.5 font-mono text-[8.5px] uppercase tracking-[0.2em] text-accent">tape</span>
      <div className="mic-tape flex w-max items-center gap-6 whitespace-nowrap px-3 py-1.5 font-mono text-[10.5px] tabular-nums text-white/75">
        {run.map((b, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-accent/70" />
            {b}
          </span>
        ))}
      </div>
      <style>{`
        .mic-tape { animation: micTapeScroll 50s linear infinite; }
        @keyframes micTapeScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// G · TV WALL · 12-panel projection mode
// ---------------------------------------------------------------------------

function TvWall({
  now,
  quotes,
  cryptoOnline,
  items,
  avgChange,
  adapters,
  approvals,
  missions,
  onExit
}: {
  now: Date;
  quotes: CryptoQuote[];
  cryptoOnline: boolean;
  items: NewsItem[];
  avgChange: number | null;
  adapters: ReturnType<typeof adapterSummary>;
  approvals: number;
  missions: number;
  onExit: () => void;
}) {
  const regime =
    avgChange == null ? "no signal" : avgChange > 2 ? "risk-on" : avgChange < -2 ? "risk-off" : "neutral";
  const mover = useMemo(() => {
    const withChange = quotes.filter((q) => q.change24h != null);
    if (!cryptoOnline || !withChange.length) return null;
    return withChange.reduce((a, b) => (Math.abs(b.change24h ?? 0) > Math.abs(a.change24h ?? 0) ? b : a));
  }, [quotes, cryptoOnline]);

  return (
    <div className="flex min-h-[80vh] flex-col gap-3 bg-black p-4 text-white" style={GRID_BG}>
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <span className="flex items-center gap-2 font-mono text-sm uppercase tracking-[0.3em] text-accent">
          <Tv className="h-5 w-5" /> market intelligence · tv mode
        </span>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/[0.06]"
        >
          <Minimize2 className="h-4 w-4" /> exit tv
        </button>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <TvPanel title="market pulse">
          <span className="text-3xl font-semibold tabular-nums">
            {cryptoOnline ? formatPrice(quotes.find((q) => q.symbol === "BTC")?.price ?? null) : "—"}
          </span>
          <span className="font-mono text-xs text-white/55">BTC/USD · CoinGecko</span>
        </TvPanel>
        <TvPanel title="risk regime">
          <span className="text-3xl font-semibold">{regime}</span>
          <span className="font-mono text-[10px] text-white/45">from crypto 24h % only</span>
        </TvPanel>
        <TvPanel title="top mover">
          <span className="text-2xl font-semibold tabular-nums">
            {mover ? `${mover.symbol} ${formatChange(mover.change24h)}` : "—"}
          </span>
        </TvPanel>
        <TvPanel title="provider status">
          <span className="font-mono text-lg">{adapters.connected} live · {adapters.ready} ready</span>
          <span className="font-mono text-[10px] text-white/45">{adapters.error} err · {adapters.offline} off</span>
        </TvPanel>
        <TvPanel title="crypto heatmap" wide>
          <div className="grid w-full grid-cols-5 gap-2">
            {CRYPTO_SYMBOLS.map((sym) => {
              const q = quotes.find((x) => x.symbol === sym) ?? null;
              const style = heatStyle(cryptoOnline ? q?.change24h ?? null : null);
              return (
                <div key={sym} className="flex flex-col items-center rounded-lg border p-2" style={{ background: style.background, borderColor: style.border }}>
                  <span className="font-mono text-xs">{sym}</span>
                  <span className="font-mono text-sm tabular-nums">{cryptoOnline ? formatChange(q?.change24h ?? null) : "—"}</span>
                </div>
              );
            })}
          </div>
        </TvPanel>
        <TvPanel title="breaking news" wide>
          <ul className="flex w-full flex-col gap-1">
            {items.slice(0, 3).map((n) => (
              <li key={n.id} className="truncate text-sm text-white/85">{n.title}</li>
            ))}
            {items.length === 0 && <li className="font-mono text-xs text-white/40">wire loading…</li>}
          </ul>
        </TvPanel>
        <TvPanel title="atlas status">
          <span className="text-2xl font-semibold text-accent">watching</span>
          <span className="font-mono text-[10px] text-white/45">local brain</span>
        </TvPanel>
        <TvPanel title="signal queue">
          <span className="text-3xl font-semibold tabular-nums">{approvals}</span>
          <span className="font-mono text-[10px] text-white/45">awaiting approval</span>
        </TvPanel>
        <TvPanel title="missions">
          <span className="text-3xl font-semibold tabular-nums">{missions}</span>
          <span className="font-mono text-[10px] text-white/45">receipts on device</span>
        </TvPanel>
        <TvPanel title="world markets">
          <span className="font-mono text-lg text-white/55">adapter-ready</span>
          <span className="font-mono text-[10px] text-white/40">equities · fx · commodities</span>
        </TvPanel>
        <TvPanel title="world clock" wide>
          <div className="flex w-full flex-wrap items-center justify-around gap-2">
            {CLOCKS.map((c) => (
              <span key={c.tz} className="flex flex-col items-center">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">{c.label}</span>
                <span className="font-mono text-xl tabular-nums">{fmtClock(now, c.tz)}</span>
              </span>
            ))}
          </div>
        </TvPanel>
        <TvPanel title="ticker">
          <span className="font-mono text-sm text-white/70">
            {cryptoOnline ? quotes.filter((q) => q.price != null).map((q) => `${q.symbol} ${formatChange(q.change24h)}`).join("  ·  ") : "feed offline"}
          </span>
        </TvPanel>
      </div>
      <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-white/35">
        operational signal · not financial advice · crypto + news real · all else adapter-ready · no fabricated numbers
      </p>
    </div>
  );
}

function TvPanel({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className={clsx(
        "flex flex-col items-start justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.02] p-4",
        wide && "col-span-2"
      )}
    >
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
        <Activity className="h-3.5 w-3.5" /> {title}
      </span>
      {children}
    </div>
  );
}
