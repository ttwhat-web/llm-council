import {
  AlertTriangle,
  GitBranch,
  Inbox,
  LineChart,
  Newspaper,
  Star,
  type LucideIcon
} from "lucide-react";
import { OperatorPageHeader } from "@/components/OperatorPageHeader";

export const metadata = {
  title: "Terminal · operator.center",
  description: "Composable intelligence feeds. Planned for the Operator tier."
};

interface PanelStub {
  id: string;
  name: string;
  blurb: string;
  Icon: LucideIcon;
}

const PANELS: PanelStub[] = [
  {
    id: "watchlist",
    name: "Watchlists",
    blurb: "Equities / crypto / FX symbols with quote, change and an LLM-summarised micro-brief on hover.",
    Icon: Star
  },
  {
    id: "briefings",
    name: "Briefings",
    blurb: "Scheduled missions that produce a 200-word morning brief across markets, repos and inbox.",
    Icon: Newspaper
  },
  {
    id: "market",
    name: "Market Intelligence",
    blurb: "Composable grid of provider-fed panels (TwelveData / AlphaVantage / Binance public WS / CoinGecko).",
    Icon: LineChart
  },
  {
    id: "repos",
    name: "Repo Monitor",
    blurb: "GitHub watchlist: new PRs, failing CI, security alerts — fed back into the Pipeline column for triage.",
    Icon: GitBranch
  },
  {
    id: "inbox",
    name: "Inbox Monitor",
    blurb: "Gmail labels / Slack channels surfaced as unread + AI summary, dispatchable as missions.",
    Icon: Inbox
  }
];

export default function TerminalPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <OperatorPageHeader
        eyebrow="terminal · intelligence feeds"
        title="Operations dashboard"
        sub="Composable panels for markets, repos and inbox. Planned for the Operator tier and not yet wired."
      />

      <aside className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/[0.05] p-4 text-[12px] text-amber-100/90">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200" />
        <div className="flex flex-col gap-1">
          <strong className="text-amber-200">
            Terminal data is planned for the Operator tier.
          </strong>
          <span className="text-amber-100/80">
            No live market data, repo events or inbox signal is currently
            connected. The panels below describe shape only — every value
            shown is a label, not a quote.
          </span>
        </div>
      </aside>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {PANELS.map((p) => (
          <article
            key={p.id}
            className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4"
          >
            <header className="flex items-center gap-2">
              <p.Icon className="h-4 w-4 text-accent" />
              <h2 className="text-[13px] font-semibold text-white">{p.name}</h2>
              <span className="ml-auto inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/55">
                <span className="h-1 w-1 rounded-full bg-white/30" />
                not wired yet
              </span>
            </header>
            <p className="text-[12px] text-white/55">{p.blurb}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
