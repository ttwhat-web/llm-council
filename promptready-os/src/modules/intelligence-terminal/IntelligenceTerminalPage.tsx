"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Bell,
  Bitcoin,
  Cpu,
  GitBranch,
  Globe,
  Inbox,
  Loader,
  Newspaper,
  Plus,
  Search,
  Star,
  Terminal as TerminalIcon,
  X
} from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";

/**
 * Intelligence Terminal · Phase 13 redesign.
 *
 * Four-zone Bloomberg-density layout in the Operator.Center design
 * language:
 *
 *   Top:    command/ticker rail (free-text command → routes to a tab,
 *           displays the queued symbol/keyword across the grid).
 *   Left:   global watchlist (all pinned cards from every tab).
 *   Center: tabbed intelligence grid (Market · Crypto · Repos · Research
 *           · Inbox · System) with honest offline state and manual
 *           pinned cards per tab.
 *   Right:  briefings + alerts (alert rules + briefings inbox).
 *   Bottom: status rail (active tab · pinned card total · last command).
 *
 * No fake data anywhere. Every feed labels itself as offline until the
 * desktop runtime wires in a provider.
 */

type TabKind = "market" | "crypto" | "repo" | "research" | "inbox" | "system";

interface TabMeta {
  kind: TabKind;
  label: string;
  Icon: typeof Globe;
  blurb: string;
  inputHint: string;
  placeholders: string[];
}

const TABS: TabMeta[] = [
  {
    kind: "market",
    label: "Market",
    Icon: Globe,
    blurb: "Indices, futures, FX.",
    inputHint: "Pin a ticker · e.g. AAPL",
    placeholders: ["S&P 500", "Nasdaq", "Dow", "VIX", "Gold", "USD/EUR"]
  },
  {
    kind: "crypto",
    label: "Crypto",
    Icon: Bitcoin,
    blurb: "Coins, perps, on-chain.",
    inputHint: "Pin a symbol · e.g. BTC",
    placeholders: ["BTC", "ETH", "SOL", "TON"]
  },
  {
    kind: "repo",
    label: "Repos",
    Icon: GitBranch,
    blurb: "Repo activity.",
    inputHint: "Pin owner/repo",
    placeholders: ["ttwhat-web/llm-council"]
  },
  {
    kind: "research",
    label: "Research",
    Icon: Newspaper,
    blurb: "Feeds, RSS, arXiv.",
    inputHint: "Pin a feed or topic",
    placeholders: ["arxiv:cs.AI", "hn:top"]
  },
  {
    kind: "inbox",
    label: "Inbox",
    Icon: Inbox,
    blurb: "Mail / DM summaries.",
    inputHint: "Pin a label or sender",
    placeholders: ["label:urgent", "sender:investor"]
  },
  {
    kind: "system",
    label: "System",
    Icon: Cpu,
    blurb: "Engine + throughput.",
    inputHint: "Pin a metric",
    placeholders: ["ollama:health", "missions:throughput"]
  }
];

interface PinnedCard {
  id: string;
  text: string;
  tab: TabKind;
}

type Pinned = Record<TabKind, PinnedCard[]>;

const STORAGE_KEY = "promptready-os.intel-terminal";
const ALERTS_KEY = "promptready-os.intel-terminal.alerts";

function emptyPinned(): Pinned {
  return { market: [], crypto: [], repo: [], research: [], inbox: [], system: [] };
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
    // command grammar: "tab:value" routes to a tab and pins the value;
    // anything else pins to the active tab.
    const m = /^(\w+):\s*(.+)$/.exec(v);
    if (m) {
      const targetTab = (m[1].toLowerCase() as TabKind);
      if (TABS.some((t) => t.kind === targetTab)) {
        setActive(targetTab);
        setPinned((prev) => ({
          ...prev,
          [targetTab]: [...prev[targetTab], { id: rid(), text: m[2].trim(), tab: targetTab }]
        }));
        setCommand("");
        return;
      }
    }
    updateCards([...cards, { id: rid(), text: v, tab: active }]);
    setCommand("");
  };

  return (
    <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="terminal · ambient intelligence"
        title="Intelligence Terminal"
        sub="Premium operator workspace. Command rail, watchlist, intelligence grid, briefings. No live feeds connected — every panel is honest about it."
        right={
          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/55">
            {totalPinned} pinned · 0 feeds connected
          </span>
        }
      />

      {/* ============== Command / ticker rail ============== */}
      <section className="flex items-center gap-2 rounded-2xl border border-accent/25 bg-accent/[0.04] px-3 py-2 shadow-glow">
        <TerminalIcon className="h-3.5 w-3.5 text-accent" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
          cmd
        </span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCommand()}
          placeholder="market:AAPL · crypto:BTC · repo:owner/name · research:arxiv:cs.AI · or free text"
          className="no-drag flex-1 bg-transparent font-mono text-[12px] text-white placeholder:text-white/35 focus:outline-none"
        />
        {lastCommand && (
          <span className="hidden md:inline rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
            last · {lastCommand.slice(0, 40)}
          </span>
        )}
      </section>

      <nav className="flex flex-wrap items-center gap-1.5 border-b border-white/8 pb-2">
        {TABS.map((t) => {
          const on = t.kind === active;
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
                {pinned[t.kind].length || "offline"}
              </span>
            </button>
          );
        })}
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
        <GridPanel
          meta={meta}
          cards={cards}
          onChange={updateCards}
        />
        <BriefingsPanel alerts={alerts} setAlerts={setAlerts} />
      </div>

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
        <Loader className="h-3 w-3 text-amber-300/80" />
        <span>all feeds offline · add a provider under settings</span>
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
  const all = (Object.entries(pinned) as Array<[TabKind, PinnedCard[]]>)
    .flatMap(([tab, cards]) => cards.map((c) => ({ ...c, tab })));
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
            const tabMeta = TABS.find((t) => t.kind === c.tab)!;
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
                  <tabMeta.Icon className="h-3 w-3 text-accent" />
                  <span className="truncate font-mono text-white/85">{c.text}</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="rounded border border-white/10 bg-white/[0.03] px-1 py-px font-mono text-[8.5px] uppercase tracking-wider text-white/45">
                    {c.tab}
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
// Grid (center)
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

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.018] p-4 shadow-glass">
      <header className="flex items-start justify-between gap-3 border-b border-white/6 pb-3">
        <div className="flex items-start gap-2">
          <meta.Icon className="mt-0.5 h-4 w-4 text-accent" />
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
              {meta.label}
            </span>
            <span className="text-[13px] font-semibold text-white">{meta.blurb}</span>
            <span className="text-[10.5px] text-white/45">
              feed offline · provider not connected · add source under Brain / Settings
            </span>
          </div>
        </div>
        <span className="rounded border border-amber-400/25 bg-amber-500/[0.05] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-amber-200/85">
          feed offline
        </span>
      </header>

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

function rid() {
  return Math.random().toString(36).slice(2);
}
