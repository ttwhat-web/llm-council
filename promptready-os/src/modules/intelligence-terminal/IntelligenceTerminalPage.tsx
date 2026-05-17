"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Bell,
  Bitcoin,
  Eye,
  GitBranch,
  Globe,
  Newspaper,
  Plus,
  Search,
  Star,
  X
} from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";

/**
 * Intelligence Terminal · Phase C.
 *
 * Bloomberg-terminal-style operator surface for ambient intelligence.
 * Six panels — watchlist, market, crypto, repos, research, alerts.
 *
 * Inspiration only: we copy the IDEA of a dense terminal grid; we do
 * NOT show fake prices, fake feeds, fake AI activity. Every panel
 * either accepts user input (watchlist, alerts) or labels itself
 * "feed offline" / "no live data" until a provider is wired.
 */

type PanelKind = "watchlist" | "market" | "crypto" | "repo" | "research" | "alerts";

const NAV: Array<{ kind: PanelKind; label: string; Icon: typeof Eye }> = [
  { kind: "watchlist", label: "Watchlist", Icon: Eye },
  { kind: "market", label: "Markets", Icon: Globe },
  { kind: "crypto", label: "Crypto", Icon: Bitcoin },
  { kind: "repo", label: "Repos", Icon: GitBranch },
  { kind: "research", label: "Research", Icon: Newspaper },
  { kind: "alerts", label: "Alerts", Icon: Bell }
];

export default function IntelligenceTerminalPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="terminal · ambient intelligence"
        title="Intelligence Terminal"
        sub="A dense operator console for the world outside the mission. Six panels — watch what matters, scan markets, follow repos and research, get tripped by alerts. No fake live data: every feed says what it sees."
        right={
          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/55">
            6 panels · 0 feeds connected
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <WatchlistPanel />
        <MarketPanel />
        <CryptoPanel />
        <RepoPanel />
        <ResearchPanel />
        <AlertsPanel />
      </div>

      <FooterLegend />
    </div>
  );
}

// ============================================================================
// Watchlist
// ============================================================================

function WatchlistPanel() {
  const [items, setItems] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const onAdd = () => {
    const v = input.trim().toUpperCase();
    if (!v || items.includes(v)) return;
    setItems((prev) => [...prev, v]);
    setInput("");
  };

  return (
    <Panel kind="watchlist" right={<KbdChip label={`${items.length} symbols`} />}>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          placeholder="Add ticker · e.g. AAPL"
          className="flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={!input.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-2 py-1 text-[11px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <Empty
          icon={<Star className="h-4 w-4 text-white/40" />}
          title="Watchlist empty"
          body="Add a ticker, a repo, a topic. When feeds wire in, this is where they stream."
        />
      ) : (
        <ul className="flex flex-col gap-1 font-mono text-[11px]">
          {items.map((s) => (
            <li
              key={s}
              className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.015] px-2 py-1"
            >
              <span className="text-white">{s}</span>
              <div className="flex items-center gap-2">
                <span className="text-white/40">— no quote feed —</span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((x) => x !== s))}
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
    </Panel>
  );
}

// ============================================================================
// Market
// ============================================================================

const MARKET_PLACEHOLDERS = ["S&P 500", "Nasdaq", "Dow", "VIX", "Gold", "USD/EUR"];

function MarketPanel() {
  return (
    <Panel kind="market" right={<KbdChip label="feed offline" />}>
      <ul className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
        {MARKET_PLACEHOLDERS.map((m) => (
          <li
            key={m}
            className="flex items-center justify-between rounded-md border border-white/6 bg-white/[0.012] px-2 py-1"
          >
            <span className="text-white/85">{m}</span>
            <span className="text-white/35">—</span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-white/40">
        Connect a market data provider in Settings → BYOK. We never invent
        prices.
      </p>
    </Panel>
  );
}

// ============================================================================
// Crypto
// ============================================================================

const CRYPTO_PLACEHOLDERS = ["BTC", "ETH", "SOL", "TON"];

function CryptoPanel() {
  return (
    <Panel kind="crypto" right={<KbdChip label="feed offline" />}>
      <ul className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
        {CRYPTO_PLACEHOLDERS.map((c) => (
          <li
            key={c}
            className="flex items-center justify-between rounded-md border border-white/6 bg-white/[0.012] px-2 py-1"
          >
            <span className="text-white/85">{c}</span>
            <span className="text-white/35">—</span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-white/40">
        Public crypto feed will land first since it needs no auth. Until then
        these are labels, not quotes.
      </p>
    </Panel>
  );
}

// ============================================================================
// Repo feed
// ============================================================================

function RepoPanel() {
  return (
    <Panel kind="repo" right={<KbdChip label="github · not connected" />}>
      <Empty
        icon={<GitBranch className="h-4 w-4 text-white/40" />}
        title="No repos connected"
        body="Connect GitHub in Brain → Sources to stream new PRs, issues, and stars into this panel."
      />
    </Panel>
  );
}

// ============================================================================
// Research feed
// ============================================================================

function ResearchPanel() {
  return (
    <Panel kind="research" right={<KbdChip label="no sources" />}>
      <Empty
        icon={<Search className="h-4 w-4 text-white/40" />}
        title="No research feeds"
        body="Add an RSS feed, an arXiv query, or a Hacker News topic. Items land here clipped + tagged."
      />
    </Panel>
  );
}

// ============================================================================
// Alerts
// ============================================================================

function AlertsPanel() {
  const [rules, setRules] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const onAdd = () => {
    const v = input.trim();
    if (!v) return;
    setRules((prev) => [...prev, v]);
    setInput("");
  };

  return (
    <Panel kind="alerts" right={<KbdChip label={`${rules.length} rule${rules.length === 1 ? "" : "s"}`} />}>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          placeholder="Alert me when … (free text)"
          className="flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={!input.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-2 py-1 text-[11px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {rules.length === 0 ? (
        <Empty
          icon={<AlertTriangle className="h-4 w-4 text-white/40" />}
          title="No alerts armed"
          body="Free-text rules like 'AAPL drops 5%' or 'new release on cargo'. The matcher wakes when feeds wire in."
        />
      ) : (
        <ul className="flex flex-col gap-1 text-[11.5px]">
          {rules.map((r, i) => (
            <li
              key={`${r}-${i}`}
              className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.015] px-2 py-1"
            >
              <span className="text-white/85">{r}</span>
              <button
                type="button"
                onClick={() => setRules((prev) => prev.filter((_, j) => j !== i))}
                className="rounded p-0.5 text-white/35 hover:bg-white/[0.06] hover:text-white/75"
                aria-label="Remove"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ============================================================================
// Primitives
// ============================================================================

function Panel({
  kind,
  right,
  children
}: {
  kind: PanelKind;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const meta = NAV.find((n) => n.kind === kind)!;
  const Icon = meta.Icon;
  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.018] p-3 shadow-glass">
      <header className="flex items-center justify-between gap-2 border-b border-white/6 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-accent" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/80">
            {meta.label}
          </span>
        </div>
        {right}
      </header>
      {children}
    </article>
  );
}

function KbdChip({ label }: { label: string }) {
  return (
    <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
      {label}
    </span>
  );
}

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
    <div className={clsx("rounded-xl border border-dashed border-white/8 bg-white/[0.008] p-4 text-center")}>
      <div className="mx-auto inline-flex">{icon}</div>
      <p className="mt-1 text-[12px] text-white/80">{title}</p>
      <p className="mt-0.5 text-[10.5px] text-white/45">{body}</p>
    </div>
  );
}

function FooterLegend() {
  return (
    <footer className="flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-white/[0.015] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-white/45">
      <span>legend</span>
      <span className="text-white/30">·</span>
      <span>feeds offline</span>
      <span className="text-white/30">·</span>
      <span>no synthetic prices</span>
      <span className="text-white/30">·</span>
      <span>connect a source in brain or settings</span>
    </footer>
  );
}
