import Link from "next/link";
import { ArrowRight, Clock, Film } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";

export const metadata = {
  title: "Demo script · Operator.Center",
  description:
    "Ninety-second walkthrough script: from landing page to dispatched mission, repo context, workflow, Telegram approval, and Atlas blueprint export."
};

interface Beat {
  at: string;
  title: string;
  details: string[];
  callout?: string;
}

const BEATS: Beat[] = [
  {
    at: "00:00 → 00:10",
    title: "Open the website",
    details: [
      "Land on operator.center · the hero sells one thing: 'Build your own AI Brain'.",
      "Hover the Download CTA. Mention: source build works today · signed installers next."
    ],
    callout: "set framing · Operator Core is the desktop app · the web is just the download"
  },
  {
    at: "00:10 → 00:25",
    title: "Download · open Operator Core",
    details: [
      "Click Download · pick Source (build from GitHub) · we already have a build open.",
      "Switch to the running desktop window. Show Atlas at the index."
    ],
    callout: "no API key · no login · the app is open in 10 seconds"
  },
  {
    at: "00:25 → 00:35",
    title: "Create an Atlas brain",
    details: [
      "From a clean state, the bootstrap modal asks for name + mode + sources + engines.",
      "Pick 'Atlas' · Builder mode · Brain Notes + GitHub sources · Deterministic + Ollama engines."
    ],
    callout: "five steps · all local · brain identity persisted to localStorage"
  },
  {
    at: "00:35 → 00:50",
    title: "Add repo context",
    details: [
      "Atlas Repo Layer cell → paste a GitHub URL → branch + note.",
      "The Brain Graph wakes the GitHub node · the Repo Layer pills update."
    ],
    callout: "real state · no GitHub fetch · honest 'manual context · not indexed yet'"
  },
  {
    at: "00:50 → 01:00",
    title: "Dispatch a mission",
    details: [
      "From the Mission System cell, type or pick a Mission Template (e.g. Startup CTO).",
      "Toggle engine to Ollama if installed · otherwise deterministic.",
      "Press Dispatch from Atlas."
    ],
    callout: "execution graph lights up stage by stage · no fake spinners"
  },
  {
    at: "01:00 → 01:10",
    title: "See the receipt",
    details: [
      "Deliverables panel populates: Clean Brief · Cursor Task · Claude Prompt · Linear Issue · GitHub Issue · Terminal Safe · Summary.",
      "Mission Receipt card shows engine / model / latency / score."
    ],
    callout: "operator can copy, download, or pin each artifact"
  },
  {
    at: "01:10 → 01:20",
    title: "Run a workflow",
    details: [
      "Switch to the Workflow Layer panel.",
      "Pre-seeded canvas: Mission → Repo → Approval → Export.",
      "Click Run workflow · the mission dispatches, repo context attaches, run pauses at approval."
    ],
    callout: "real graph execution · pause point recorded in the run"
  },
  {
    at: "01:20 → 01:25",
    title: "Telegram approval",
    details: [
      "Open Settings → Telegram bridge simulator.",
      "Send /approve <runId>. The same handler a real bot will call resumes the workflow.",
      "Export node fires · downloadable Markdown."
    ],
    callout: "no real bot networking yet · adapter seam is in place"
  },
  {
    at: "01:25 → 01:30",
    title: "Export the Atlas blueprint",
    details: [
      "Back to Atlas. Press Export blueprint.",
      "Downloads `mission-atlas-YYYYMMDD-HHMM.md` covering brain, missions, repos, pins, alerts, next actions."
    ],
    callout: "one button · everything the operator built · portable Markdown"
  }
];

export default function DemoScriptPage() {
  return (
    <MarketingShell>
      <article className="prose-page" style={{ maxWidth: "min(86ch, 100%)" }}>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          docs · 90-second demo script
        </span>
        <h1>How to demo Operator.Center in 90 seconds.</h1>
        <p className="lede">
          Nine beats. Each beat names what to say, what to click, and what
          the audience should feel. Run it from a clean brain (or seed the
          demo workspace from Settings) so every receipt lands the way the
          script expects.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <PrefCard
            Icon={Film}
            label="screen size"
            value="1440 × 900 · single screen"
          />
          <PrefCard Icon={Clock} label="total" value="90 seconds" />
          <PrefCard
            Icon={ArrowRight}
            label="start state"
            value="brain reset · demo seeded · Atlas at /"
          />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {BEATS.map((b, i) => (
            <BeatBlock key={i} index={i + 1} beat={b} />
          ))}
        </div>

        <h2>Before you film</h2>
        <ul>
          <li>Settings → Demo workspace → Seed demo workspace.</li>
          <li>Settings → Theme → Midnight or Deep Navy reads best on capture.</li>
          <li>Atlas mode toggle → Blueprint (default).</li>
          <li>Open the Workflow Layer panel pre-show so the canvas is warm.</li>
          <li>Have Ollama running with <code>gemma2:2b</code> pulled if you&rsquo;ll demo the LLM path.</li>
        </ul>

        <h2>What this script proves</h2>
        <ul>
          <li>Local-first · no API key needed to open or run the engine.</li>
          <li>Real receipts · real deliverables · downloadable.</li>
          <li>Workflow execution + approval is real, not a mock.</li>
          <li>Atlas is the operator home · the blueprint exports cleanly.</li>
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/download"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow hover:bg-accent"
          >
            Get the build →
          </Link>
          <Link
            href="/founders"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/85 hover:bg-white/[0.06]"
          >
            Reserve a founder spot
          </Link>
        </div>
      </article>
    </MarketingShell>
  );
}

function BeatBlock({ index, beat }: { index: number; beat: Beat }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <header className="mb-1 flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          {String(index).padStart(2, "0")} · {beat.at}
        </span>
      </header>
      <h3 className="text-[15px] font-semibold text-white" style={{ marginTop: 0 }}>
        {beat.title}
      </h3>
      <ul className="mt-1 flex flex-col gap-1 text-[12.5px] text-white/75">
        {beat.details.map((d, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
            <span>{d}</span>
          </li>
        ))}
      </ul>
      {beat.callout && (
        <p className="mt-2 rounded-md border border-accent/25 bg-accent/[0.06] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-accent">
          {beat.callout}
        </p>
      )}
    </section>
  );
}

function PrefCard({
  Icon,
  label,
  value
}: {
  Icon: typeof Film;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <Icon className="h-3.5 w-3.5 text-accent" />
      <div className="flex flex-col">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">
          {label}
        </span>
        <span className="text-[12px] text-white">{value}</span>
      </div>
    </div>
  );
}
