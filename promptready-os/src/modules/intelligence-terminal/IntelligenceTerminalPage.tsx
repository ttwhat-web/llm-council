"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Activity,
  AlertTriangle,
  Bell,
  Bitcoin,
  Boxes,
  Coins,
  Cpu,
  DollarSign,
  FileText,
  Fish,
  GitBranch,
  Globe,
  HeartPulse,
  Loader,
  Newspaper,
  Plus,
  Receipt,
  Search,
  Star,
  Terminal as TerminalIcon,
  TrendingUp,
  Truck,
  Waves,
  X
} from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { useBrainStore } from "@/store/brain";
import { computeCostBoard, formatUsd } from "@/services/cost";
import { readPresence, type PresenceSnapshot } from "@/services/presence";
import { measureBrainHealth } from "@/services/brainHealth";
import {
  statusForModule,
  statusMeta,
  adapterSummary,
  ADAPTERS,
  adapterStatus,
  type AdapterModule
} from "@/services/adapters";
import { getHealth } from "@/services/providerHealth";
import { getSamples, type Sample } from "@/services/marketSamples";
import { RepoImportBox } from "@/components/RepoImportBox";
import { CommunicationsRuntimeCard } from "@/components/CommunicationsRuntimeCard";
import {
  fetchCryptoPrices,
  formatPrice,
  formatChange,
  formatMarketCap,
  type CryptoQuote
} from "@/services/providers/coingecko";
import {
  fetchNews,
  timeAgo,
  NEWS_CATEGORIES,
  type NewsItem,
  type NewsCategory
} from "@/services/providers/news";

/**
 * Intelligence Terminal · Intelligence Expansion 01.
 *
 * Bloomberg-density operator terminal organised into four GROUPS:
 *
 *   MARKETS   · Stocks · Crypto · FX · Watchlists
 *   RESEARCH  · News Feed · Earnings · AI News · Repo Research
 *   SIGNALS   · Alerts · Whale Watch · Movers · Volatility
 *   OPERATOR  · Runtime · Costs · Agents · Receipts · Diagnostics
 *
 * Markets are NOT the product identity — Operator.Center is not a
 * trading app. Market surfaces live under the Intelligence Layer only,
 * and every external feed is honest about being offline until a real
 * provider wires in via the desktop runtime. NO fake feeds · NO fake
 * ticks · NO fake market data.
 *
 * The OPERATOR group is different: it renders REAL local state (runtime
 * presence, cost board, agents, receipts, diagnostics) because that
 * data already exists on this machine.
 */

type TabGroup = "markets" | "research" | "signals" | "operator";

type TabKind =
  // markets
  | "market"
  | "crypto"
  | "fx"
  | "commodities"
  | "watchlists"
  | "export-ops"
  // research
  | "research"
  | "earnings"
  | "ai-news"
  | "repo"
  // signals
  | "alerts"
  | "whale"
  | "movers"
  | "volatility"
  // operator
  | "runtime"
  | "costs"
  | "agents"
  | "receipts"
  | "diagnostics";

interface TabMeta {
  kind: TabKind;
  group: TabGroup;
  label: string;
  Icon: typeof Globe;
  blurb: string;
  inputHint: string;
  placeholders: string[];
}

const GROUP_LABEL: Record<TabGroup, string> = {
  markets: "Markets",
  research: "Research",
  signals: "Signals",
  operator: "Operator"
};

const TABS: TabMeta[] = [
  // ---- MARKETS ---------------------------------------------------------
  {
    kind: "market",
    group: "markets",
    label: "Stocks",
    Icon: Globe,
    blurb: "Indices, equities, futures.",
    inputHint: "Pin a ticker · e.g. AAPL",
    placeholders: ["S&P 500", "Nasdaq", "Dow", "VIX", "Gold", "Oil"]
  },
  {
    kind: "crypto",
    group: "markets",
    label: "Crypto",
    Icon: Bitcoin,
    blurb: "Coins, perps, on-chain.",
    inputHint: "Pin a symbol · e.g. BTC",
    placeholders: ["BTC", "ETH", "SOL", "TON"]
  },
  {
    kind: "fx",
    group: "markets",
    label: "FX",
    Icon: TrendingUp,
    blurb: "Currency pairs.",
    inputHint: "Pin a pair · e.g. EUR/USD",
    placeholders: ["EUR/USD", "USD/TRY", "USD/JPY", "GBP/USD"]
  },
  {
    kind: "commodities",
    group: "markets",
    label: "Commodities",
    Icon: Coins,
    blurb: "Metals, energy.",
    inputHint: "Pin a commodity · e.g. Gold",
    placeholders: ["Gold", "Oil", "Copper", "Nat Gas"]
  },
  {
    kind: "watchlists",
    group: "markets",
    label: "Watchlists",
    Icon: Star,
    blurb: "Saved baskets.",
    inputHint: "Name a watchlist",
    placeholders: ["My equities", "Majors", "Export FX"]
  },
  {
    kind: "export-ops",
    group: "markets",
    label: "Export Ops",
    Icon: Truck,
    blurb: "Orders, shipments, FX exposure.",
    inputHint: "Pin an ops item",
    placeholders: ["Open orders", "Shipments", "USD/TRY"]
  },
  // ---- RESEARCH --------------------------------------------------------
  {
    kind: "research",
    group: "research",
    label: "News Feed",
    Icon: Newspaper,
    blurb: "Headlines, RSS, wires.",
    inputHint: "Pin a feed or topic",
    placeholders: ["reuters:markets", "hn:top"]
  },
  {
    kind: "earnings",
    group: "research",
    label: "Earnings",
    Icon: FileText,
    blurb: "Calendar, prints, guidance.",
    inputHint: "Pin a ticker's earnings",
    placeholders: ["AAPL Q?", "NVDA Q?"]
  },
  {
    kind: "ai-news",
    group: "research",
    label: "AI News",
    Icon: Cpu,
    blurb: "Model releases, papers.",
    inputHint: "Pin a topic or lab",
    placeholders: ["arxiv:cs.AI", "model releases"]
  },
  {
    kind: "repo",
    group: "research",
    label: "Repo Research",
    Icon: GitBranch,
    blurb: "Repo activity, releases.",
    inputHint: "Pin owner/repo",
    placeholders: ["ttwhat-web/llm-council"]
  },
  // ---- SIGNALS ---------------------------------------------------------
  {
    kind: "alerts",
    group: "signals",
    label: "Alerts",
    Icon: Bell,
    blurb: "Armed alert rules.",
    inputHint: "Pin an alert thesis",
    placeholders: ["BTC < 50k", "AAPL +5%"]
  },
  {
    kind: "whale",
    group: "signals",
    label: "Whale Watch",
    Icon: Fish,
    blurb: "Large flow, on-chain moves.",
    inputHint: "Pin a wallet or threshold",
    placeholders: ["whale > $10M", "wallet:0x…"]
  },
  {
    kind: "movers",
    group: "signals",
    label: "Movers",
    Icon: Activity,
    blurb: "Top gainers / losers.",
    inputHint: "Pin a universe",
    placeholders: ["S&P movers", "crypto top10"]
  },
  {
    kind: "volatility",
    group: "signals",
    label: "Volatility",
    Icon: Waves,
    blurb: "IV, realized vol, regimes.",
    inputHint: "Pin a vol metric",
    placeholders: ["VIX", "BTC 30d IV"]
  },
  // ---- OPERATOR (real local data) -------------------------------------
  {
    kind: "runtime",
    group: "operator",
    label: "Runtime",
    Icon: HeartPulse,
    blurb: "Live presence rollup.",
    inputHint: "",
    placeholders: []
  },
  {
    kind: "costs",
    group: "operator",
    label: "Costs",
    Icon: DollarSign,
    blurb: "Local cost board.",
    inputHint: "",
    placeholders: []
  },
  {
    kind: "agents",
    group: "operator",
    label: "Agents",
    Icon: Boxes,
    blurb: "Agent slots + state.",
    inputHint: "",
    placeholders: []
  },
  {
    kind: "receipts",
    group: "operator",
    label: "Receipts",
    Icon: Receipt,
    blurb: "Recent missions.",
    inputHint: "",
    placeholders: []
  },
  {
    kind: "diagnostics",
    group: "operator",
    label: "Diagnostics",
    Icon: Cpu,
    blurb: "Brain health snapshot.",
    inputHint: "",
    placeholders: []
  }
];

const GROUP_ORDER: TabGroup[] = ["markets", "research", "signals", "operator"];

function isOperator(kind: TabKind): boolean {
  return TABS.find((t) => t.kind === kind)?.group === "operator";
}

/**
 * Map each external (non-operator) tab to its adapter seam. `null` means
 * the tab has no wired adapter yet (e.g. repo research). Operator-group
 * tabs render real local state and intentionally have no adapter module.
 */
const TAB_ADAPTER: Partial<Record<TabKind, AdapterModule | null>> = {
  market: "markets",
  crypto: "crypto",
  fx: "fx",
  commodities: "commodities",
  watchlists: "watchlists",
  "export-ops": "export-ops",
  research: "news",
  earnings: "earnings",
  "ai-news": "ai-news",
  repo: null,
  alerts: "signals",
  whale: "onchain",
  movers: "signals",
  volatility: "signals"
};

function adapterModuleFor(kind: TabKind): AdapterModule | null {
  return TAB_ADAPTER[kind] ?? null;
}

const TONE_PILL: Record<"ok" | "accent" | "muted" | "bad", string> = {
  ok: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
  accent: "border-accent/30 bg-accent/[0.08] text-accent",
  muted: "border-white/10 bg-white/[0.03] text-white/55",
  bad: "border-rose-400/30 bg-rose-500/[0.08] text-rose-200"
};

interface PinnedCard {
  id: string;
  text: string;
  tab: TabKind;
}

type Pinned = Record<TabKind, PinnedCard[]>;

const STORAGE_KEY = "promptready-os.intel-terminal";
const ALERTS_KEY = "promptready-os.intel-terminal.alerts";

function emptyPinned(): Pinned {
  return {
    market: [],
    crypto: [],
    fx: [],
    commodities: [],
    watchlists: [],
    "export-ops": [],
    research: [],
    earnings: [],
    "ai-news": [],
    repo: [],
    alerts: [],
    whale: [],
    movers: [],
    volatility: [],
    runtime: [],
    costs: [],
    agents: [],
    receipts: [],
    diagnostics: []
  };
}

function loadPinned(): Pinned {
  if (typeof window === "undefined") return emptyPinned();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPinned();
    return { ...emptyPinned(), ...JSON.parse(raw) };
  } catch {
    return emptyPinned();
  }
}
function savePinned(p: Pinned) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

function loadAlerts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ALERTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}
function saveAlerts(a: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ALERTS_KEY, JSON.stringify(a));
  } catch {
    // ignore
  }
}

export default function IntelligenceTerminalPage() {
  const [active, setActive] = useState<TabKind>("market");
  const [pinned, setPinned] = useState<Pinned>(() => loadPinned());
  const [alerts, setAlerts] = useState<string[]>(() => loadAlerts());
  const [command, setCommand] = useState("");
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const cmdRef = useRef<HTMLInputElement | null>(null);

  // Keyboard command bar · "/" focuses it (unless already typing somewhere).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      cmdRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const meta = useMemo(() => TABS.find((t) => t.kind === active)!, [active]);
  const cards = pinned[active];
  const totalPinned = useMemo(
    () => Object.values(pinned).reduce((acc, arr) => acc + arr.length, 0),
    [pinned]
  );

  useEffect(() => {
    savePinned(pinned);
  }, [pinned]);
  useEffect(() => {
    saveAlerts(alerts);
  }, [alerts]);

  const updateCards = (next: PinnedCard[]) => {
    setPinned({ ...pinned, [active]: next });
  };

  const onCommand = () => {
    const v = command.trim();
    if (!v) return;
    setLastCommand(v);
    const m = /^(\w[\w-]*):\s*(.+)$/.exec(v);
    if (m) {
      const targetTab = m[1].toLowerCase() as TabKind;
      if (TABS.some((t) => t.kind === targetTab) && !isOperator(targetTab)) {
        setActive(targetTab);
        setPinned((prev) => ({
          ...prev,
          [targetTab]: [...prev[targetTab], { id: rid(), text: m[2].trim(), tab: targetTab }]
        }));
        setCommand("");
        return;
      }
    }
    if (!isOperator(active)) {
      updateCards([...cards, { id: rid(), text: v, tab: active }]);
    }
    setCommand("");
  };

  return (
    <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="terminal · intelligence layer"
        title="Intelligence Terminal"
        sub="Markets · Research · Signals · Operator. Market surfaces live under the Intelligence Layer only — Operator.Center is not a trading app. External feeds are honest about being offline; the Operator group shows real local state."
        right={
          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/55">
            {totalPinned} pinned · feeds offline
          </span>
        }
      />

      {/* ============== Command / ticker rail ============== */}
      <section className="flex items-center gap-2 rounded-2xl border border-accent/25 bg-accent/[0.04] px-3 py-2 shadow-glow">
        <TerminalIcon className="h-3.5 w-3.5 text-accent" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-accent">cmd</span>
        <input
          ref={cmdRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCommand()}
          placeholder="market:AAPL · crypto:BTC · fx:EUR/USD · repo:owner/name · or free text"
          className="no-drag flex-1 bg-transparent font-mono text-[12px] text-white placeholder:text-white/35 focus:outline-none"
        />
        <kbd className="hidden rounded border border-white/15 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[9px] text-white/45 md:inline">
          /
        </kbd>
        {lastCommand && (
          <span className="hidden rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55 md:inline">
            last · {lastCommand.slice(0, 40)}
          </span>
        )}
      </section>

      {/* ============== Cockpit theater ============== */}
      <MarketTheater />

      {/* ============== Grouped tab rail ============== */}
      <nav className="flex flex-col gap-2 border-b border-white/8 pb-2">
        {GROUP_ORDER.map((g) => (
          <div key={g} className="flex flex-wrap items-center gap-1.5">
            <span className="w-[78px] shrink-0 font-mono text-[9px] uppercase tracking-[0.24em] text-white/35">
              {GROUP_LABEL[g]}
            </span>
            {TABS.filter((t) => t.group === g).map((t) => {
              const on = t.kind === active;
              const operator = t.group === "operator";
              return (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => setActive(t.kind)}
                  className={clsx(
                    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wider transition",
                    on
                      ? "border-accent/40 bg-accent/[0.08] text-accent shadow-glow"
                      : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                  )}
                >
                  <t.Icon className="h-3 w-3" />
                  {t.label}
                  <span
                    className={clsx(
                      "rounded px-1 py-px font-mono text-[8.5px]",
                      on ? "bg-accent/[0.15] text-accent" : "bg-white/[0.06] text-white/55"
                    )}
                  >
                    {operator ? "live" : pinned[t.kind].length || "offline"}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ================= main grid ================= */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,300px)]">
        <WatchlistPanel
          pinned={pinned}
          onJump={(tab) => setActive(tab)}
          onRemove={(tab, id) =>
            setPinned({ ...pinned, [tab]: pinned[tab].filter((c) => c.id !== id) })
          }
        />
        {meta.group === "operator" ? (
          <OperatorPanel kind={active} alertCount={alerts.length} />
        ) : (
          <GridPanel meta={meta} cards={cards} onChange={updateCards} />
        )}
        <div className="flex flex-col gap-4">
          <ProviderHealthRail />
          <CostRuntimeMini />
          <BriefingsPanel alerts={alerts} setAlerts={setAlerts} />
        </div>
      </div>

      {/* ============== GitHub repo import / code-operator box ============== */}
      <RepoImportBox />

      {/* ================= status rail ================= */}
      <footer className="flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-white/[0.015] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-white/45">
        <span>status</span>
        <span className="text-white/30">·</span>
        <span>active: {meta.label}</span>
        <span className="text-white/30">·</span>
        <span>pinned: {totalPinned}</span>
        <span className="text-white/30">·</span>
        <span>alerts: {alerts.length}</span>
        <span className="text-white/30">·</span>
        {meta.group === "operator" ? (
          <>
            <HeartPulse className="h-3 w-3 text-emerald-300/80" />
            <span>operator group · real local state</span>
          </>
        ) : (
          <>
            <Loader className="h-3 w-3 text-amber-300/80" />
            <span>external feeds offline · add a provider with the desktop runtime</span>
          </>
        )}
      </footer>
    </div>
  );
}

// ============================================================================
// Watchlist (left)
// ============================================================================

function WatchlistPanel({
  pinned,
  onJump,
  onRemove
}: {
  pinned: Pinned;
  onJump: (tab: TabKind) => void;
  onRemove: (tab: TabKind, id: string) => void;
}) {
  const all = (Object.entries(pinned) as Array<[TabKind, PinnedCard[]]>).flatMap(([tab, cards]) =>
    cards.map((c) => ({ ...c, tab }))
  );
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.018] p-3 shadow-glass">
      <header className="flex items-center justify-between border-b border-white/6 pb-2">
        <div className="flex items-center gap-2">
          <Star className="h-3.5 w-3.5 text-accent" />
          <span className="text-[12.5px] font-semibold text-white">Watchlist</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
          {all.length} total
        </span>
      </header>

      {all.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/8 bg-white/[0.008] p-4 text-center">
          <p className="text-[11.5px] text-white/75">No watch cards.</p>
          <p className="mt-0.5 text-[10.5px] text-white/45">
            Pin from any tab or via the command rail.
          </p>
        </div>
      ) : (
        <ul className="flex max-h-[440px] flex-col gap-1 overflow-auto pr-1">
          {all.map((c) => {
            const tabMeta = TABS.find((t) => t.kind === c.tab);
            const Icon = tabMeta?.Icon ?? Star;
            return (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]"
              >
                <button
                  type="button"
                  onClick={() => onJump(c.tab)}
                  className="flex min-w-0 items-center gap-1.5 text-left"
                >
                  <Icon className="h-3 w-3 text-accent" />
                  <span className="truncate font-mono text-white/85">{c.text}</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1 py-px font-mono text-[8.5px] uppercase tracking-wider text-white/45">
                    {tabMeta?.label ?? c.tab}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(c.tab, c.id)}
                    className="rounded p-0.5 text-white/35 hover:bg-white/[0.06] hover:text-white/75"
                    aria-label="Remove"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ============================================================================
// Grid (center) · external feed tabs · offline + manual pins
// ============================================================================

function GridPanel({
  meta,
  cards,
  onChange
}: {
  meta: TabMeta;
  cards: PinnedCard[];
  onChange: (next: PinnedCard[]) => void;
}) {
  const [input, setInput] = useState("");

  const onAdd = () => {
    const v = input.trim();
    if (!v) return;
    onChange([...cards, { id: rid(), text: v, tab: meta.kind }]);
    setInput("");
  };

  const module = adapterModuleFor(meta.kind);
  const moduleStatus = module ? statusForModule(module) : null;
  const headerMeta = moduleStatus ? statusMeta(moduleStatus.status) : null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.018] p-4 shadow-glass">
      <header className="flex items-start justify-between gap-3 border-b border-white/6 pb-3">
        <div className="flex items-start gap-2">
          <meta.Icon className="mt-0.5 h-4 w-4 text-accent" />
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
              {GROUP_LABEL[meta.group]} · {meta.label}
            </span>
            <span className="text-[13px] font-semibold text-white">{meta.blurb}</span>
            <span className="text-[10.5px] text-white/45">
              {moduleStatus
                ? "no live data · seam wired · the desktop runtime makes the verified call"
                : "feed offline · no adapter seam yet · awaiting a provider integration"}
            </span>
          </div>
        </div>
        {headerMeta ? (
          <span
            className={clsx(
              "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
              TONE_PILL[headerMeta.tone]
            )}
          >
            {headerMeta.label}
          </span>
        ) : (
          <span className="rounded border border-amber-400/25 bg-amber-500/[0.05] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-amber-200/85">
            feed offline
          </span>
        )}
      </header>

      {moduleStatus && (
        <div>
          <div className="mb-1 font-mono text-[9.5px] uppercase tracking-wider text-white/40">
            adapters
          </div>
          {moduleStatus.adapters.length === 0 ? (
            <p className="rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5 font-mono text-[10.5px] text-white/55">
              no adapters registered for this module yet
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {moduleStatus.adapters.map(({ def, status }) => {
                const m = statusMeta(status);
                return (
                  <span
                    key={def.id}
                    className={clsx(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
                      TONE_PILL[m.tone]
                    )}
                  >
                    <span className="text-white/85">{def.provider}</span>
                    <span className="opacity-50">·</span>
                    <span>{m.label}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Live providers · real fetch · honest error/offline state */}
      {meta.kind === "crypto" && <CryptoLivePanel />}
      {meta.kind === "research" && <NewsLivePanel />}

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          placeholder={meta.inputHint}
          className="no-drag flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={!input.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-2 py-1 text-[11px] font-semibold text-white shadow-glow hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3 w-3" /> Pin
        </button>
      </div>

      {meta.placeholders.length > 0 && (
        <div>
          <div className="mb-1 font-mono text-[9.5px] uppercase tracking-wider text-white/40">
            placeholder columns
          </div>
          <div className="grid grid-cols-2 gap-1 md:grid-cols-3">
            {meta.placeholders.map((p) => (
              <div
                key={p}
                className="flex items-center justify-between rounded-md border border-white/6 bg-white/[0.012] px-2 py-1 font-mono text-[11px]"
              >
                <span className="text-white/85">{p}</span>
                <span className="text-white/30">—</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 font-mono text-[9.5px] uppercase tracking-wider text-white/40">
          pinned cards
        </div>
        {cards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/8 bg-white/[0.008] p-4 text-center">
            <Search className="mx-auto h-4 w-4 text-white/35" />
            <p className="mt-1 text-[11.5px] text-white/75">Nothing pinned in this tab.</p>
            <p className="mt-0.5 text-[10.5px] text-white/45">
              Pinned cards persist between sessions on this machine.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
            {cards.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <meta.Icon className="h-3 w-3 text-accent" />
                  <span className="font-mono text-[11px] text-white">{c.text}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/45">
                    no data
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange(cards.filter((x) => x.id !== c.id))}
                    className="rounded p-0.5 text-white/35 hover:bg-white/[0.06] hover:text-white/75"
                    aria-label="Remove"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// Market Theater · cockpit overview · REAL data only (CoinGecko + HN)
// ============================================================================

const PULSE_SYMBOLS = ["BTC", "ETH", "SOL"] as const;

function MarketTheater() {
  const [quotes, setQuotes] = useState<CryptoQuote[]>([]);
  const [cryptoState, setCryptoState] = useState<"loading" | "ok" | "error">("loading");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsState, setNewsState] = useState<"loading" | "ok" | "error">("loading");
  const [pulseSym, setPulseSym] = useState<string>("BTC");
  const [, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const loadCrypto = async () => {
      const r = await fetchCryptoPrices();
      if (!alive) return;
      if (r.ok) {
        setQuotes(r.quotes);
        setCryptoState("ok");
      } else {
        setCryptoState("error");
      }
      setTick((n) => n + 1); // refresh sample-derived chart
    };
    void loadCrypto();
    const t = window.setInterval(loadCrypto, 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const loadNews = async () => {
      const r = await fetchNews("AI", 10);
      if (!alive) return;
      if (r.ok) {
        setNews(r.items);
        setNewsState("ok");
      } else {
        setNewsState("error");
      }
    };
    void loadNews();
    const t = window.setInterval(loadNews, 120_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  const samples = getSamples(pulseSym);
  const cryptoOnline = cryptoState === "ok";
  const newsOnline = newsState === "ok";

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-graphite-950/40 p-3">
      {/* Operator fun layer · honest online status (pulse only when real) */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/6 pb-2 font-mono text-[10px] uppercase tracking-wider">
        <FeedStatus label="market feed" online={cryptoOnline} loading={cryptoState === "loading"} />
        <FeedStatus label="news wire" online={newsOnline} loading={newsState === "loading"} />
        <span className="ml-auto hidden text-white/35 md:inline">
          press <kbd className="rounded border border-white/15 bg-white/[0.05] px-1 text-white/55">/</kbd> for command bar
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* left · pulse chart + heat tiles */}
        <div className="flex flex-col gap-3 lg:col-span-2">
          <MarketPulseChart symbol={pulseSym} onSymbol={setPulseSym} samples={samples} online={cryptoOnline} />
          <AssetHeatTiles quotes={quotes} state={cryptoState} />
        </div>
        {/* right · news wire + signal radar */}
        <div className="flex flex-col gap-3">
          <NewsWireTape items={news} state={newsState} />
          <SignalRadar quotes={quotes} news={news} cryptoOnline={cryptoOnline} />
        </div>
      </div>
    </section>
  );
}

function FeedStatus({ label, online, loading }: { label: string; online: boolean; loading: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={clsx(
          "inline-block h-1.5 w-1.5 rounded-full",
          online
            ? "bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.6)] animate-pulse"
            : loading
              ? "bg-amber-400/80"
              : "bg-white/25"
        )}
      />
      <span className={online ? "text-emerald-200/85" : "text-white/45"}>
        {label} {online ? "online" : loading ? "…" : "offline"}
      </span>
    </span>
  );
}

function MarketPulseChart({
  symbol,
  onSymbol,
  samples,
  online
}: {
  symbol: string;
  onSymbol: (s: string) => void;
  samples: Sample[];
  online: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.012] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
          <TrendingUp className="h-3 w-3" /> market pulse
        </span>
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
      </div>
      <Sparkline samples={samples} />
      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-white/40">
        {samples.length < 2
          ? online
            ? "no samples yet · collecting from live fetches"
            : "no samples yet · feed offline"
          : `${samples.length} session samples · ${symbol}/USD`}
      </p>
    </div>
  );
}

function Sparkline({ samples }: { samples: Sample[] }) {
  const W = 520;
  const H = 96;
  if (samples.length < 2) {
    return (
      <div className="flex h-[96px] items-center justify-center rounded-md border border-dashed border-white/8 bg-black/30 font-mono text-[10px] uppercase tracking-wider text-white/35">
        no samples yet
      </div>
    );
  }
  const prices = samples.map((s) => s.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const pts = samples
    .map((s, i) => {
      const x = (i / (samples.length - 1)) * W;
      const y = H - ((s.price - min) / span) * (H - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = prices[prices.length - 1] >= prices[0];
  const stroke = up ? "rgb(52,211,153)" : "rgb(248,113,113)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[96px] w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={1.5} strokeOpacity={0.85} />
    </svg>
  );
}

function AssetHeatTiles({ quotes, state }: { quotes: CryptoQuote[]; state: "loading" | "ok" | "error" }) {
  if (state === "error") {
    return (
      <p className="rounded-xl border border-rose-400/25 bg-rose-500/[0.06] px-3 py-2 font-mono text-[10.5px] text-rose-100/90">
        crypto feed error · CoinGecko unreachable or rate-limited · retries on interval
      </p>
    );
  }
  if (quotes.length === 0) {
    return (
      <p className="rounded-xl border border-white/8 bg-white/[0.012] px-3 py-2 font-mono text-[10.5px] text-white/45">
        loading live prices…
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {quotes.map((q) => {
        const up = (q.change24h ?? 0) >= 0;
        return (
          <li
            key={q.symbol}
            className={clsx(
              "flex flex-col gap-0.5 rounded-xl border p-2.5",
              q.change24h == null
                ? "border-white/8 bg-white/[0.012]"
                : up
                  ? "border-emerald-400/25 bg-emerald-500/[0.05]"
                  : "border-rose-400/25 bg-rose-500/[0.05]"
            )}
          >
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-white">
              {q.symbol}
            </span>
            <span className="font-mono text-[12.5px] tabular-nums text-white/90">{formatPrice(q.price)}</span>
            <span
              className={clsx(
                "font-mono text-[10px] tabular-nums",
                q.change24h == null ? "text-white/40" : up ? "text-emerald-300/90" : "text-rose-300/90"
              )}
            >
              {formatChange(q.change24h)}
            </span>
            <span className="font-mono text-[8.5px] uppercase tracking-wider text-white/35">
              {formatMarketCap(q.marketCap)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function NewsWireTape({ items, state }: { items: NewsItem[]; state: "loading" | "ok" | "error" }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-white/8 bg-white/[0.012] p-3">
      <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
        <Newspaper className="h-3 w-3" /> news wire
      </span>
      {state === "error" ? (
        <p className="font-mono text-[10px] text-rose-100/85">wire offline · Hacker News unreachable</p>
      ) : items.length === 0 ? (
        <p className="font-mono text-[10px] text-white/45">loading wire…</p>
      ) : (
        <ul className="flex max-h-[200px] flex-col gap-1 overflow-auto pr-1">
          {items.map((n) => (
            <li key={n.id} className="flex items-start gap-1.5 border-b border-white/5 pb-1 text-[11px] last:border-0">
              <span className="mt-px font-mono text-[8px] uppercase tracking-wider text-accent">{n.category}</span>
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
    </div>
  );
}

function SignalRadar({
  quotes,
  news,
  cryptoOnline
}: {
  quotes: CryptoQuote[];
  news: NewsItem[];
  cryptoOnline: boolean;
}) {
  const signals: Array<{ label: string; tone: "ok" | "warn" | "muted" }> = [];

  // top mover (real, only if data present)
  if (cryptoOnline && quotes.length > 0) {
    const withChange = quotes.filter((q) => q.change24h != null);
    if (withChange.length > 0) {
      const top = withChange.reduce((a, b) =>
        Math.abs(b.change24h ?? 0) > Math.abs(a.change24h ?? 0) ? b : a
      );
      signals.push({
        label: `top mover · ${top.symbol} ${formatChange(top.change24h)}`,
        tone: (top.change24h ?? 0) >= 0 ? "ok" : "warn"
      });
    }
  }

  // news velocity · count stories in the last hour (real timestamps)
  const recent = news.filter((n) => Date.now() - n.time < 3_600_000).length;
  if (news.length > 0) {
    signals.push({ label: `news velocity · ${recent} in last hour`, tone: recent >= 3 ? "warn" : "muted" });
  }

  // provider errors + offline adapters (real)
  const sum = adapterSummary();
  if (sum.error > 0) signals.push({ label: `${sum.error} provider error${sum.error === 1 ? "" : "s"}`, tone: "warn" });
  if (sum.offline > 0) signals.push({ label: `${sum.offline} adapter${sum.offline === 1 ? "" : "s"} offline`, tone: "muted" });

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-white/8 bg-white/[0.012] p-3">
      <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
        <Activity className="h-3 w-3" /> signal radar
      </span>
      {signals.length === 0 ? (
        <p className="font-mono text-[10px] text-white/45">no signals yet · feeds collecting</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {signals.map((s) => (
            <li
              key={s.label}
              className={clsx(
                "rounded border px-2 py-1 font-mono text-[10px]",
                s.tone === "ok"
                  ? "border-emerald-400/25 bg-emerald-500/[0.05] text-emerald-200/90"
                  : s.tone === "warn"
                    ? "border-amber-400/25 bg-amber-500/[0.05] text-amber-200/90"
                    : "border-white/8 bg-white/[0.012] text-white/60"
              )}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <p className="font-mono text-[8.5px] uppercase tracking-wider text-white/35">
        operational signal · not financial advice
      </p>
    </div>
  );
}

// ============================================================================
// Live providers · CoinGecko (crypto) + Hacker News (news) · REAL fetch
// ============================================================================

function CryptoLivePanel() {
  const [quotes, setQuotes] = useState<CryptoQuote[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [at, setAt] = useState<number | null>(null);

  const load = async () => {
    setState("loading");
    const r = await fetchCryptoPrices();
    if (r.ok) {
      setQuotes(r.quotes);
      setState("ok");
      setError(null);
      setAt(r.at);
    } else {
      setState("error");
      setError(r.error ?? "fetch failed");
    }
  };

  useEffect(() => {
    void load();
    // refresh every 60s while the tab is mounted · respects rate limits
    const t = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="rounded-md border border-white/8 bg-black/30 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
          live · coingecko {state === "loading" && "· loading…"}
        </span>
        <div className="flex items-center gap-2">
          {at && state === "ok" && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
              {new Date(at).toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
          >
            refresh
          </button>
        </div>
      </div>

      {state === "error" ? (
        <p className="rounded-md border border-rose-400/25 bg-rose-500/[0.06] px-2 py-1.5 font-mono text-[10.5px] text-rose-100/90">
          fetch failed · {error} · public API may be rate-limited or blocked by
          browser CORS · the desktop runtime calls it directly
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {quotes.map((q) => (
            <li
              key={q.symbol}
              className="grid grid-cols-[0.7fr_1fr_0.8fr_1fr] items-center gap-1 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 font-mono text-[11px]"
            >
              <span className="font-semibold text-white">{q.symbol}</span>
              <span className="tabular-nums text-white/85">{formatPrice(q.price)}</span>
              <span
                className={clsx(
                  "tabular-nums",
                  q.change24h == null
                    ? "text-white/40"
                    : q.change24h >= 0
                      ? "text-emerald-300/90"
                      : "text-rose-300/90"
                )}
              >
                {formatChange(q.change24h)}
              </span>
              <span className="text-right tabular-nums text-white/55">
                {formatMarketCap(q.marketCap)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewsLivePanel() {
  const [category, setCategory] = useState<NewsCategory>("AI");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const load = async (cat: NewsCategory) => {
    setState("loading");
    const r = await fetchNews(cat);
    if (r.ok) {
      setItems(r.items);
      setState("ok");
      setError(null);
    } else {
      setState("error");
      setError(r.error ?? "fetch failed");
    }
  };

  useEffect(() => {
    void load(category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return (
    <div className="rounded-md border border-white/8 bg-black/30 p-2">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
          live · hacker news {state === "loading" && "· loading…"}
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {NEWS_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={clsx(
                "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
                c === category
                  ? "border-accent/40 bg-accent/[0.08] text-accent"
                  : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {state === "error" ? (
        <p className="rounded-md border border-rose-400/25 bg-rose-500/[0.06] px-2 py-1.5 font-mono text-[10.5px] text-rose-100/90">
          fetch failed · {error} · the desktop runtime calls this directly
        </p>
      ) : items.length === 0 && state === "ok" ? (
        <p className="px-2 py-1.5 font-mono text-[10.5px] text-white/45">no stories returned</p>
      ) : (
        <ul className="flex max-h-[260px] flex-col gap-1 overflow-auto pr-1">
          {items.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]"
            >
              <a
                href={n.url ?? "#"}
                target="_blank"
                rel="noreferrer noopener"
                className="min-w-0 flex-1 truncate text-white/85 hover:text-accent"
                title={n.title}
              >
                {n.title}
              </a>
              <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-white/40">
                {n.source} · {timeAgo(n.time)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// Operator panel (center) · OPERATOR group · real local state
// ============================================================================

function OperatorPanel({ kind, alertCount }: { kind: TabKind; alertCount: number }) {
  const history = useMissionStore((s) => s.history);
  const runtime = useMissionStore((s) => s.runtime);
  const agents = useAtlasStore((s) => s.agents);
  const meta = TABS.find((t) => t.kind === kind)!;

  const [presence, setPresence] = useState<PresenceSnapshot | null>(null);
  useEffect(() => {
    if (kind !== "runtime") return;
    setPresence(readPresence());
    const t = window.setInterval(() => setPresence(readPresence()), 3500);
    return () => window.clearInterval(t);
  }, [kind]);

  const board = useMemo(() => computeCostBoard(history), [history]);
  const health = useMemo(() => measureBrainHealth(), [history.length]);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.018] p-4 shadow-glass">
      <header className="flex items-start justify-between gap-3 border-b border-white/6 pb-3">
        <div className="flex items-start gap-2">
          <meta.Icon className="mt-0.5 h-4 w-4 text-accent" />
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
              Operator · {meta.label}
            </span>
            <span className="text-[13px] font-semibold text-white">{meta.blurb}</span>
            <span className="text-[10.5px] text-white/45">real local state · no network</span>
          </div>
        </div>
        <span className="rounded border border-emerald-400/30 bg-emerald-500/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-emerald-200">
          live · local
        </span>
      </header>

      {kind === "runtime" && (
        <ul className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
          <Metric k="desktop" v={presence?.desktop ?? "online"} ok />
          <Metric k="ollama" v={presence?.ollama ?? "unknown"} />
          <Metric k="runtime" v={runtime} />
          <Metric k="workflow" v={presence?.workflow ?? "idle"} />
          <Metric k="agents" v={presence?.agents ?? "idle"} />
          <Metric k="memory" v={presence?.memory ?? "—"} />
          <Metric k="active mission" v={presence?.activeMission ? "yes" : "no"} />
          <Metric k="approvals" v={String(presence?.pendingApprovals ?? 0)} warn={(presence?.pendingApprovals ?? 0) > 0} />
          <Metric k="telegram" v={presence?.telegram ?? "simulator"} />
        </ul>
      )}

      {kind === "runtime" && (
        <div className="mt-1">
          <CommunicationsRuntimeCard />
        </div>
      )}

      {kind === "costs" && (
        <ul className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
          <Metric k="local missions" v={String(board.localMissions)} />
          <Metric k="ollama missions" v={String(board.ollamaMissions)} />
          <Metric k="deliverables" v={String(board.totalDeliverables)} />
          <Metric k="ollama tokens" v={String(board.totalOllamaTokens)} />
          <Metric k="cloud spend" v="$0" ok />
          <Metric k="cloud avoided" v={formatUsd(board.estimatedCloudCostAvoidedUSD)} ok />
          {history.length === 0 && (
            <li className="col-span-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5 font-mono text-[10.5px] text-white/55 md:col-span-3">
              needs data · run a mission to populate the cost board
            </li>
          )}
        </ul>
      )}

      {kind === "agents" && (
        <ul className="flex flex-col gap-1">
          {agents.length === 0 ? (
            <li className="rounded-md border border-dashed border-white/8 bg-white/[0.008] px-2 py-3 text-center text-[11px] text-white/55">
              No agent slots configured.
            </li>
          ) : (
            agents.map((a) => (
              <li
                key={a.kind}
                className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5 text-[11px]"
              >
                <span className="font-mono uppercase tracking-wider text-white/80">{a.kind}</span>
                <span
                  className={clsx(
                    "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                    a.state === "idle"
                      ? "border-white/10 bg-white/[0.03] text-white/55"
                      : a.state === "blocked"
                        ? "border-rose-400/30 bg-rose-500/[0.08] text-rose-200"
                        : "border-amber-400/30 bg-amber-500/[0.08] text-amber-200"
                  )}
                >
                  {a.state}
                </span>
              </li>
            ))
          )}
        </ul>
      )}

      {kind === "receipts" && (
        <ul className="flex max-h-[420px] flex-col gap-1 overflow-auto pr-1">
          {history.length === 0 ? (
            <li className="rounded-md border border-dashed border-white/8 bg-white/[0.008] px-2 py-3 text-center text-[11px] text-white/55">
              No missions archived yet.
            </li>
          ) : (
            history.slice(0, 20).map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5 text-[11px]"
              >
                <span className="min-w-0 flex-1 truncate text-white/80">{m.brief.slice(0, 60)}</span>
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-white/45">
                  {m.engine ?? "deterministic"} · {m.score != null ? `${m.score}/100` : "—"}
                </span>
              </li>
            ))
          )}
        </ul>
      )}

      {kind === "diagnostics" && (
        <ul className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
          <Metric k="storage" v={`${(health.storageBytes / 1024).toFixed(1)}KB`} />
          <Metric k="memory docs" v={String(health.memoryDocs)} warn={health.duplicateDocs > 0} />
          <Metric k="duplicates" v={String(health.duplicateDocs)} warn={health.duplicateDocs > 0} />
          <Metric k="receipts" v={String(health.receipts)} />
          <Metric k="snapshots" v={String(health.snapshots)} />
          <Metric k="stale repos" v={String(health.staleRepos)} warn={health.staleRepos > 0} />
          <Metric k="workflow nodes" v={String(health.workflowNodes)} />
          <Metric k="orphan files" v={String(health.orphanFiles)} warn={health.orphanFiles > 0} />
          <Metric k="armed alerts" v={String(alertCount)} />
        </ul>
      )}
    </section>
  );
}

function Metric({ k, v, ok, warn }: { k: string; v: string; ok?: boolean; warn?: boolean }) {
  return (
    <li className="flex flex-col gap-0.5 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">{k}</span>
      <span
        className={clsx(
          "font-mono text-[12px]",
          warn ? "text-amber-200/90" : ok ? "text-emerald-200/90" : "text-white/85"
        )}
      >
        {v}
      </span>
    </li>
  );
}

// ============================================================================
// Briefings + alerts (right)
// ============================================================================

function BriefingsPanel({
  alerts,
  setAlerts
}: {
  alerts: string[];
  setAlerts: (a: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const onAdd = () => {
    const v = input.trim();
    if (!v) return;
    setAlerts([...alerts, v]);
    setInput("");
  };
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.018] p-3 shadow-glass">
      <header className="flex items-center justify-between border-b border-white/6 pb-2">
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-accent" />
          <span className="text-[12.5px] font-semibold text-white">Briefings & alerts</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
          {alerts.length}
        </span>
      </header>

      <div>
        <div className="mb-1 font-mono text-[9.5px] uppercase tracking-wider text-white/40">
          alert rules
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
            placeholder="Alert me when… (free text)"
            className="no-drag flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={!input.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-2 py-1 text-[11px] font-semibold text-white shadow-glow hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        {alerts.length === 0 ? (
          <p className="mt-2 flex items-start gap-1.5 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5 text-[10.5px] text-white/55">
            <AlertTriangle className="mt-0.5 h-3 w-3 text-amber-300/80" />
            No rules armed. Rules fire when feeds wire in.
          </p>
        ) : (
          <ul className="mt-1.5 flex flex-col gap-1">
            {alerts.map((r, i) => (
              <li
                key={`${r}-${i}`}
                className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]"
              >
                <span className="truncate text-white/80">{r}</span>
                <button
                  type="button"
                  onClick={() => setAlerts(alerts.filter((_, j) => j !== i))}
                  className="rounded p-0.5 text-white/35 hover:bg-white/[0.06] hover:text-white/75"
                  aria-label="Remove"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-1 font-mono text-[9.5px] uppercase tracking-wider text-white/40">
          briefings inbox
        </div>
        <div className="rounded-md border border-dashed border-white/8 bg-white/[0.008] p-3 text-center">
          <p className="text-[11.5px] text-white/75">Inbox quiet.</p>
          <p className="mt-0.5 text-[10.5px] text-white/45">
            Connected feeds drop daily / hourly briefings here.
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Provider Health rail (right) · live registry + provider-health rollup
// ============================================================================

function ProviderHealthRail() {
  // Re-read periodically so a successful Crypto/News fetch flips status here.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 4000);
    return () => window.clearInterval(t);
  }, []);

  const sum = adapterSummary();

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.018] p-3 shadow-glass">
      <header className="flex items-center justify-between border-b border-white/6 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-accent" />
          <span className="text-[12.5px] font-semibold text-white">Provider Health</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
          {sum.connected}/{sum.total} live
        </span>
      </header>

      <div className="flex flex-wrap gap-1 font-mono text-[9px] uppercase tracking-wider">
        <span className="rounded border border-emerald-400/30 bg-emerald-500/[0.08] px-1.5 py-0.5 text-emerald-200">
          {sum.connected} connected
        </span>
        <span className="rounded border border-accent/30 bg-accent/[0.08] px-1.5 py-0.5 text-accent">
          {sum.ready} ready
        </span>
        {sum.error > 0 && (
          <span className="rounded border border-rose-400/30 bg-rose-500/[0.08] px-1.5 py-0.5 text-rose-200">
            {sum.error} error
          </span>
        )}
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-white/55">
          {sum.offline} offline
        </span>
      </div>

      <ul className="flex max-h-[300px] flex-col gap-0.5 overflow-auto pr-1">
        {ADAPTERS.map((a) => {
          const status = adapterStatus(a);
          const m = statusMeta(status);
          const h = getHealth(a.id);
          return (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded border border-white/6 bg-white/[0.012] px-2 py-1 font-mono text-[10px]"
            >
              <span className="min-w-0 truncate text-white/80" title={a.note}>
                {a.provider}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                {h.lastLatencyMs != null && status === "connected" && (
                  <span className="text-white/45">{h.lastLatencyMs}ms</span>
                )}
                {h.lastSuccess && (
                  <span className="text-white/35">{new Date(h.lastSuccess).toLocaleTimeString()}</span>
                )}
                <span className={clsx("rounded border px-1 py-px uppercase tracking-wider", TONE_PILL[m.tone])}>
                  {m.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ============================================================================
// Cost + Runtime mini (right rail) · real local cost board + presence
// ============================================================================

function CostRuntimeMini() {
  const history = useMissionStore((s) => s.history);
  const runtime = useMissionStore((s) => s.runtime);
  const board = useMemo(() => computeCostBoard(history), [history]);

  const rows: Array<{ k: string; v: string; ok?: boolean }> = [
    { k: "runtime", v: runtime },
    { k: "missions", v: String(board.localMissions + board.ollamaMissions) },
    { k: "ollama", v: String(board.ollamaMissions) },
    { k: "cloud spend", v: "$0", ok: true },
    { k: "cloud avoided", v: formatUsd(board.estimatedCloudCostAvoidedUSD), ok: true }
  ];

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.018] p-3 shadow-glass">
      <header className="flex items-center justify-between border-b border-white/6 pb-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5 text-accent" />
          <span className="text-[12.5px] font-semibold text-white">Cost + Runtime</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
          local
        </span>
      </header>
      <ul className="grid grid-cols-2 gap-1">
        {rows.map((r) => (
          <li
            key={r.k}
            className="flex flex-col gap-0.5 rounded border border-white/6 bg-white/[0.012] px-2 py-1"
          >
            <span className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-white/40">{r.k}</span>
            <span className={clsx("font-mono text-[11px]", r.ok ? "text-emerald-200/90" : "text-white/85")}>
              {r.v}
            </span>
          </li>
        ))}
      </ul>
      {history.length === 0 && (
        <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
          needs data · run a mission
        </p>
      )}
    </section>
  );
}

function rid() {
  return Math.random().toString(36).slice(2);
}
