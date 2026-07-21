import Link from "next/link";
import { Book, ExternalLink, Github } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";

export const metadata = {
  title: "Docs · operator.center",
  description:
    "Operator.Center documentation. Quickstart, providers, memory connectors, terminal, BYOK, self-host."
};

/**
 * Docs landing — placeholder index. Real long-form docs ship per-phase
 * into a docs site. This page intentionally avoids inventing chapters
 * that don't yet have written content; every link below is honest.
 */

const SECTIONS = [
  {
    title: "Install Operator Core",
    body: "Three install paths today: download a signed installer (coming soon per OS), pull the Docker runtime (coming soon), or clone the GitHub repo and run `npm run tauri:dev` inside promptready-os/."
  },
  {
    title: "Run your first mission",
    body: "Open Mission Control, paste a brief, press Dispatch Mission. The Operations Pipeline streams real telemetry. Receipts persist to the local Operations Archive."
  },
  {
    title: "Routing · local + cloud",
    body: "Operators pick a quality (Fast · Smart · Expert · Code · Local). Local routes through Ollama on your machine. Cloud routes optionally to Anthropic, OpenAI, or Google when keys are configured."
  },
  {
    title: "Memory · Brain notes",
    body: "Manual Brain notes today. Obsidian / GitHub / Gmail / Drive connectors land one at a time. Indexed on-device first; cloud sync is opt-in."
  },
  {
    title: "Intelligence Terminal",
    body: "Watchlist, market feed, repo feed, research feed, alerts. No fake live data — when a feed is offline, the panel says so."
  },
  {
    title: "BYOK + self-host",
    body: "Bring your own Anthropic / OpenAI / Google keys; routing flips to your account. Operators run the Docker runtime (planned) or a private Vercel deploy."
  },
  {
    title: "Mobile Companion",
    body: "Phone is a capture + approval device. Voice notes and screenshots ship to your desktop brain. Risky actions (cloud spend, repo write-back, shell) wait for your tap. Pair via QR; revocable from desktop. Planned secure pairing — not built yet."
  }
];

export default function DocsPage() {
  return (
    <MarketingShell>
      <article className="prose-page" style={{ maxWidth: "min(80ch, 100%)" }}>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          docs · index
        </span>
        <h1>Operator.Center documentation</h1>
        <p className="lede">
          A short, honest index. Long-form docs are still being written —
          everything below describes behaviour that&rsquo;s real today.
        </p>

        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
          {SECTIONS.map((s) => (
            <section
              key={s.title}
              className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
            >
              <header className="mb-1 flex items-center gap-2">
                <Book className="h-3.5 w-3.5 text-accent" />
                <h2 className="text-[13px] font-semibold text-white" style={{ marginTop: 0 }}>
                  {s.title}
                </h2>
              </header>
              <p className="text-[12px] text-white/65">{s.body}</p>
            </section>
          ))}
        </div>

        <h2>Where to look next</h2>
        <ul>
          <li>
            <Link href="/security">/security</Link> — what stays local, what
            leaves the machine, on whose terms.
          </li>
          <li>
            <Link href="/pricing">/pricing</Link> — Free · Pro · Operator
            tiers.
          </li>
          <li>
            <Link href="/app">/app</Link> — the in-browser preview of
            Mission Control (developer-facing).
          </li>
          <li>
            <a
              href="https://github.com/ttwhat-web/llm-council"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1"
            >
              <Github className="h-3 w-3" /> repo on GitHub
              <ExternalLink className="h-3 w-3" />
            </a>{" "}
            — clone + build the desktop app from source.
          </li>
        </ul>
      </article>
    </MarketingShell>
  );
}
