import {
  AlertTriangle,
  GitBranch,
  Inbox,
  LineChart,
  Newspaper,
  type LucideIcon
} from "lucide-react";
import { OperatorPageHeader } from "@/components/OperatorPageHeader";
import { WatchlistClient } from "@/components/WatchlistClient";

export const metadata = {
  title: "Terminal · operator.center",
  description:
    "Manual watchlist live today. Live market / repo / inbox feeds planned for the Operator tier."
};

interface PanelStub {
  id: string;
  name: string;
  blurb: string;
  Icon: LucideIcon;
}

const PANELS: PanelStub[] = [
  {
    id: "briefings",
    name: "Briefings",
    blurb:
      "Scheduled missions that produce a 200-word morning brief across markets, repos and inbox.",
    Icon: Newspaper
  },
  {
    id: "market",
    name: "Market Intelligence",
    blurb:
      "Composable grid of provider-fed panels (TwelveData / AlphaVantage / Binance public WS / CoinGecko).",
    Icon: LineChart
  },
  {
    id: "repos",
    name: "Repo Monitor",
    blurb:
      "GitHub watchlist: new PRs, failing CI, security alerts — fed back into the Pipeline column for triage.",
    Icon: GitBranch
  },
  {
    id: "inbox",
    name: "Inbox Monitor",
    blurb:
      "Gmail labels / Slack channels surfaced as unread + AI summary, dispatchable as missions.",
    Icon: Inbox
  }
];

export default function TerminalPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <OperatorPageHeader
        eyebrow="terminal · intelligence feeds"
        title="Terminal"
        sub="Capture the symbols you care about now; live feeds, briefings and repo / inbox monitors land in the Operator tier."
      />

      {/* --------------- Watchlist (real, local) --------------- */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.2em] text-white/90">
            <span aria-hidden className="h-1 w-1 rounded-full bg-accent shadow-[0_0_6px_1px_rgba(164,144,194,0.6)]" />
            Watchlist
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
            local · this browser
          </span>
        </div>
        <WatchlistClient />
        <p className="text-[11.5px] leading-relaxed text-white/50">
          No live prices are connected. The list seeds the Terminal panel
          when a market-data adapter is wired.
        </p>
      </section>

      {/* --------------- Planned panels --------------- */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.2em] text-white/90">
            <span aria-hidden className="h-1 w-1 rounded-full bg-white/35" />
            Operator-tier panels
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
            planned
          </span>
        </div>
        <aside className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/[0.05] p-4 text-[12px] text-amber-100/90">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200" />
          <div className="flex flex-col gap-1">
            <strong className="text-amber-200">
              No live feed is connected.
            </strong>
            <span className="text-amber-100/80">
              The panels below describe shape only — every value shown is a
              label, not a quote. They light up when the Operator-tier
              adapters ship.
            </span>
          </div>
        </aside>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {PANELS.map((p) => (
            <article
              key={p.id}
              className="lift-on-hover flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-[inset_0_1px_0_rgba(230,230,250,0.04)]"
            >
              <header className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] ring-1 ring-white/[0.10] shadow-[inset_0_1px_0_rgba(230,230,250,0.06)]">
                  <p.Icon className="h-4 w-4 text-accent" />
                </span>
                <h3 className="text-[13px] font-semibold text-white">{p.name}</h3>
                <span className="ml-auto inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/55">
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  not wired yet
                </span>
              </header>
              <p className="text-[12px] leading-relaxed text-white/60">{p.blurb}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
