"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  Activity,
  AlertTriangle,
  Bitcoin,
  Cpu,
  GitBranch,
  Globe,
  Inbox,
  Newspaper,
  Plus,
  Star,
  X
} from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";

/**
 * Intelligence Terminal · Phase 12 upgrade.
 *
 * Tabbed terminal — six surfaces all default to "offline" with the
 * option to pin manual cards (a watch symbol, an RSS title, a thread
 * subject) so operators can use the panels as scratch boards until the
 * feeds wire in.
 *
 * No invented prices. No fake feeds.
 */

type TabKind = "market" | "crypto" | "repo" | "research" | "inbox" | "system";

interface TabMeta {
  kind: TabKind;
  label: string;
  Icon: typeof Globe;
  blurb: string;
  inputHint: string;
}

const TABS: TabMeta[] = [
  {
    kind: "market",
    label: "Market",
    Icon: Globe,
    blurb: "Indices, futures, FX. Connect a market data provider to stream quotes.",
    inputHint: "Pin a ticker · e.g. AAPL · MSFT · SPX"
  },
  {
    kind: "crypto",
    label: "Crypto",
    Icon: Bitcoin,
    blurb: "Coins, perps, on-chain alerts. Public coin price feed lands first.",
    inputHint: "Pin a symbol · e.g. BTC · ETH · SOL"
  },
  {
    kind: "repo",
    label: "Repos",
    Icon: GitBranch,
    blurb: "GitHub repos · new PRs · issues · stars. Connect under Brain → GitHub.",
    inputHint: "Pin a repo · e.g. ttwhat-web/llm-council"
  },
  {
    kind: "research",
    label: "Research",
    Icon: Newspaper,
    blurb: "RSS · arXiv · Hacker News topics. Items land clipped + tagged.",
    inputHint: "Pin a feed URL or topic"
  },
  {
    kind: "inbox",
    label: "Inbox",
    Icon: Inbox,
    blurb: "Email / Slack / DMs summarised by intent. Connectors via Brain.",
    inputHint: "Pin a thread or sender to follow"
  },
  {
    kind: "system",
    label: "System",
    Icon: Cpu,
    blurb: "Local engine status, Ollama models, mission throughput, alerts.",
    inputHint: "Pin a system metric to watch"
  }
];

interface PinnedCard {
  id: string;
  text: string;
}

type Pinned = Record<TabKind, PinnedCard[]>;

const STORAGE_KEY = "promptready-os.intel-terminal";

function loadPinned(): Pinned {
  if (typeof window === "undefined") return makeEmpty();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeEmpty();
    return { ...makeEmpty(), ...JSON.parse(raw) };
  } catch {
    return makeEmpty();
  }
}

function makeEmpty(): Pinned {
  return {
    market: [],
    crypto: [],
    repo: [],
    research: [],
    inbox: [],
    system: []
  };
}

function savePinned(p: Pinned) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export default function IntelligenceTerminalPage() {
  const [active, setActive] = useState<TabKind>("market");
  const [pinned, setPinned] = useState<Pinned>(() => loadPinned());

  const meta = useMemo(() => TABS.find((t) => t.kind === active)!, [active]);
  const cards = pinned[active];

  const updateCards = (next: PinnedCard[]) => {
    const np = { ...pinned, [active]: next };
    setPinned(np);
    savePinned(np);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="terminal · ambient intelligence"
        title="Intelligence Terminal"
        sub="Six tabbed feeds — markets, crypto, repos, research, inbox, system. All default offline. Pin manual cards to scaffold what you want to watch."
        right={
          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/55">
            6 panels · 0 feeds connected
          </span>
        }
      />

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
                offline
              </span>
            </button>
          );
        })}
      </nav>

      <TabPanel meta={meta} cards={cards} onChange={updateCards} />
      <FooterLegend />
    </div>
  );
}

// ============================================================================
// Tab panel
// ============================================================================

function TabPanel({
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
    onChange([...cards, { id: Math.random().toString(36).slice(2), text: v }]);
    setInput("");
  };
  const onRemove = (id: string) => onChange(cards.filter((c) => c.id !== id));

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
          className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-2 py-1 text-[11px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3 w-3" /> Pin
        </button>
      </div>

      {cards.length === 0 ? (
        <Empty
          icon={<Star className="h-4 w-4 text-white/40" />}
          title={`${meta.label} feed offline.`}
          body="Pin a card to scaffold what you want this panel to watch. The pin survives reloads on this machine."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2 lg:grid-cols-3">
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
                  onClick={() => onRemove(c.id)}
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
    </section>
  );
}

// ============================================================================
// Atoms
// ============================================================================

function Empty({
  icon,
  title,
  body
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/8 bg-white/[0.008] p-5 text-center">
      <div className="mx-auto inline-flex">{icon}</div>
      <p className="mt-1 text-[12px] text-white/80">{title}</p>
      <p className="mt-0.5 text-[10.5px] text-white/45">{body}</p>
    </div>
  );
}

function FooterLegend() {
  return (
    <footer className="flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-white/[0.015] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-white/45">
      <Activity className="h-3 w-3 text-white/35" />
      <span>legend</span>
      <span className="text-white/30">·</span>
      <span>feeds offline</span>
      <span className="text-white/30">·</span>
      <span>no synthetic prices</span>
      <span className="text-white/30">·</span>
      <AlertTriangle className="h-3 w-3 text-amber-300/80" />
      <span>pin cards to scaffold what to watch</span>
    </footer>
  );
}
