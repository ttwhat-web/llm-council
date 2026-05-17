import Link from "next/link";
import {
  Activity,
  Apple,
  ArrowRight,
  Brain,
  Cpu,
  Github,
  HardDrive,
  Lock,
  Monitor,
  Terminal as TerminalIcon,
  Workflow
} from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";
import { FounderCounter } from "@/components/FounderCounter";

/**
 * operator.center landing — Phase 11 marketing/download site.
 *
 * The web is the brochure. The product is PromptReady OS — a
 * downloadable Mission Control desktop app. /app remains a developer
 * preview of the same engine; the primary CTA points at Download.
 *
 * Strict vocabulary: mission · dispatch · brain · operator · telemetry ·
 * receipt · runtime. No emoji, no "AI-powered" filler.
 */

export default function LandingPage() {
  return (
    <MarketingShell>
      <Hero />
      <DownloadGrid />
      <ProductSections />
      <PreviewPanel />
      <PricingTeaser />
    </MarketingShell>
  );
}

// ============================================================================
// Hero
// ============================================================================

function Hero() {
  return (
    <section className="flex flex-col items-start gap-6">
      <div className="inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
        <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-accent">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/55" />
        </span>
        Operator.Center · Mission Control for AI Workflows
      </div>
      <h1 className="max-w-[18ch] text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
        Build your own AI Brain.
      </h1>
      <p className="max-w-[58ch] text-[15px] leading-relaxed text-white/65 md:text-base">
        PromptReady OS is the downloadable desktop app for operators who
        dispatch missions, route across local + cloud models, and keep their
        brain on their machine. No paste-loops, no chat clutter, no key
        required to open it.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href="#download"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent/90 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-accent"
        >
          Download PromptReady OS
          <ArrowRight className="h-4 w-4" />
        </a>
        <a
          href="#preview"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/[0.08]"
        >
          Watch demo
        </a>
        <Link
          href="/docs"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-white/65 transition hover:bg-white/[0.06]"
        >
          View docs
        </Link>
        <span className="text-[11px] text-white/40">
          Local-first. Works without an account or API key.
        </span>
      </div>
      <FounderCounter variant="cta" />
      <p className="text-[11px] text-white/35">
        Want a preview without installing?{" "}
        <Link href="/app" className="text-accent/85 hover:text-accent hover:underline">
          Open the web preview of Mission Control →
        </Link>
      </p>
    </section>
  );
}

// ============================================================================
// Download cards
// ============================================================================

interface DownloadCard {
  os: string;
  arch?: string;
  Icon: typeof Apple;
  status: "available" | "coming-soon" | "source";
  hint?: string;
  href?: string;
}

const DOWNLOADS: DownloadCard[] = [
  {
    os: "macOS",
    arch: "Apple Silicon (M1+)",
    Icon: Apple,
    status: "coming-soon",
    hint: "Installer not signed yet · join the founder wave for early access."
  },
  {
    os: "macOS",
    arch: "Intel",
    Icon: Apple,
    status: "coming-soon",
    hint: "Installer not signed yet · same Tauri build as Apple Silicon."
  },
  {
    os: "Windows",
    arch: "x86_64",
    Icon: Monitor,
    status: "coming-soon",
    hint: "MSI installer in QA."
  },
  {
    os: "Linux",
    arch: "AppImage · deb",
    Icon: Monitor,
    status: "coming-soon",
    hint: "AppImage / .deb in QA."
  },
  {
    os: "Docker",
    arch: "self-host runtime",
    Icon: HardDrive,
    status: "coming-soon",
    hint: "operator/center:latest image planned for the Operator tier."
  },
  {
    os: "Source",
    arch: "build from GitHub",
    Icon: Github,
    status: "source",
    hint: "Clone the repo and run `npm run tauri:dev` inside promptready-os/.",
    href: "https://github.com/ttwhat-web/llm-council"
  }
];

function DownloadGrid() {
  return (
    <section id="download" className="flex flex-col gap-4">
      <SectionHeading
        eyebrow="01 · download"
        title="Run it on your machine."
        sub="Every installer below ships the same engine — local-first, BYOK-ready, with Ollama as the default route. Honest status: nothing here pretends to be available before it is."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOWNLOADS.map((card, i) => (
          <DownloadTile key={`${card.os}-${card.arch ?? i}`} card={card} />
        ))}
      </div>
    </section>
  );
}

function DownloadTile({ card }: { card: DownloadCard }) {
  const disabled = card.status === "coming-soon";
  const body = (
    <article
      className={`flex h-full flex-col gap-2 rounded-2xl border bg-white/[0.02] p-4 transition ${
        disabled
          ? "border-white/8"
          : "border-white/10 hover:border-accent/35 hover:bg-white/[0.04]"
      }`}
    >
      <header className="flex items-center gap-2">
        <card.Icon className="h-4 w-4 text-accent" />
        <span className="text-[13px] font-semibold text-white">{card.os}</span>
        {card.arch && (
          <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55">
            {card.arch}
          </span>
        )}
        <span
          className={`ml-auto rounded-md border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${
            card.status === "available"
              ? "border-emerald-400/40 bg-emerald-500/[0.08] text-emerald-200"
              : card.status === "source"
                ? "border-accent/30 bg-accent/[0.06] text-accent"
                : "border-white/10 bg-white/[0.04] text-white/55"
          }`}
        >
          {card.status === "available"
            ? "ready"
            : card.status === "source"
              ? "source"
              : "coming soon"}
        </span>
      </header>
      {card.hint && <p className="text-[11.5px] text-white/55">{card.hint}</p>}
    </article>
  );
  if (card.href) {
    return (
      <a href={card.href} target="_blank" rel="noreferrer" className="block">
        {body}
      </a>
    );
  }
  return body;
}

// ============================================================================
// Product sections
// ============================================================================

const PRODUCT_SECTIONS = [
  {
    Icon: Workflow,
    name: "Mission Control",
    blurb:
      "Three-column HUD: brief → live operations pipeline → deliverables. Six typed stages, real telemetry, no fake spinners."
  },
  {
    Icon: Cpu,
    name: "Local AI via Ollama",
    blurb:
      "Unlimited local missions against gemma · qwen-coder · hermes · mistral. The router refuses to fall back to cloud unless you opt in."
  },
  {
    Icon: Brain,
    name: "Memory / Brain",
    blurb:
      "Start with manual notes. Obsidian vault + GitHub + Gmail + Drive connectors land per-platform. Indexed on-device first."
  },
  {
    Icon: TerminalIcon,
    name: "Intelligence Terminal",
    blurb:
      "Dense multi-panel terminal: watchlist, market feed, repo feed, research feed, alerts. Honest about which panels are live."
  },
  {
    Icon: Github,
    name: "GitHub · Gmail · Obsidian",
    blurb:
      "Connectors land one at a time. Operator picks per-source what's indexed. Nothing leaves the machine unless you flip it on."
  },
  {
    Icon: Lock,
    name: "Local-first privacy",
    blurb:
      "Receipts, stacks, drafts, brain notes, watchlist live in your machine. Cloud providers are accelerators, never the gate."
  }
];

function ProductSections() {
  return (
    <section className="flex flex-col gap-5">
      <SectionHeading
        eyebrow="02 · what's inside"
        title="One desktop app. Six operator surfaces."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCT_SECTIONS.map((s) => (
          <article
            key={s.name}
            className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4 transition hover:border-accent/30"
          >
            <s.Icon className="h-4 w-4 text-accent" />
            <div className="text-[13px] font-semibold text-white">{s.name}</div>
            <p className="text-[12px] leading-relaxed text-white/55">{s.blurb}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// Cinematic preview panel
// ============================================================================

function PreviewPanel() {
  return (
    <section id="preview" className="flex flex-col gap-5">
      <SectionHeading
        eyebrow="03 · preview"
        title="Mission Control · static preview"
        sub="Layout only. No live data is rendered below — when you install PromptReady OS, every value comes from real telemetry."
      />
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              promptready os · mission control
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
              static preview
            </span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
            no live data
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[260px_minmax(0,1fr)_280px]">
          {/* col 1 — brief */}
          <aside className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.012] p-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
              mission brief
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.025] px-2 py-1.5 text-[11.5px] text-white/55">
              Paste a messy prompt, an error log, a product idea…
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {["claude", "cursor", "dev", "terminal"].map((t) => (
                <span
                  key={t}
                  className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent/85 px-2.5 py-1 text-[11px] font-semibold text-white">
              Dispatch Mission
            </div>
          </aside>

          {/* col 2 — operations */}
          <section className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.012] p-3">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
                operations pipeline
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
                idle
              </span>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {["IN", "CL", "IT", "ST", "CN", "GN", "VL", "OUT"].map((s, i) => (
                <div key={s} className="flex flex-col items-center gap-1 p-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === 0 ? "bg-emerald-400/80" : "bg-white/15"
                    }`}
                  />
                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-white/45">
                    {s}
                  </span>
                </div>
              ))}
            </div>
            <ul className="mt-1 flex flex-col divide-y divide-white/5 text-[10.5px]">
              {[
                ["info", "input", "Awaiting brief"],
                ["info", "router", "Ollama reachable · cloud absent"],
                ["info", "safety", "Screen armed"]
              ].map(([k, tag, msg], i) => (
                <li key={i} className="flex items-center gap-2 py-1">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
                    {String(k)}
                  </span>
                  <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/45">
                    {tag}
                  </span>
                  <span className="text-white/65">{msg}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* col 3 — deliverables */}
          <aside className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.012] p-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
              deliverables
            </div>
            <div className="rounded-md border border-dashed border-white/10 bg-white/[0.012] p-3 text-center text-[11.5px] text-white/45">
              Awaiting mission. Cursor Task · Claude Prompt · Linear Issue ·
              Terminal Safe Command and 7 more deliverables ship per run.
            </div>
            <div className="mt-1 flex flex-wrap gap-1 text-[9px]">
              {["mode=auto", "quality=fast", "route=ollama", "0ms"].map((t) => (
                <span
                  key={t}
                  className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono uppercase tracking-wider text-white/40"
                >
                  {t}
                </span>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Pricing teaser
// ============================================================================

function PricingTeaser() {
  return (
    <section id="pricing" className="flex flex-col gap-5">
      <SectionHeading
        eyebrow="04 · pricing"
        title="Free is generous. Operator is real."
        sub="Local rules engine is unlimited at every tier. Cloud routes + Memory connectors + Intelligence Terminal unlock as you go up. No card to start."
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <TeaserCard
          name="Free"
          price="$0"
          highlights={[
            "Local rules engine — unlimited",
            "10 cloud missions / day once connected",
            "Operations Archive — local"
          ]}
        />
        <TeaserCard
          name="Pro"
          price="$19 / mo"
          highlight
          highlights={[
            "Unlimited cloud missions",
            "Architect mode + advanced exports",
            "Memory connectors (rolling out)",
            "Local Ollama profiles"
          ]}
        />
        <TeaserCard
          name="Operator"
          price="$39 / seat / mo"
          highlights={[
            "Everything in Pro",
            "Intelligence Terminal workspace",
            "Agent actions · scheduled missions",
            "Repo + market intelligence"
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:bg-white/[0.08]"
        >
          See full pricing
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/security"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[12px] font-medium text-white/65 transition hover:bg-white/[0.06]"
        >
          Security posture
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
          billing not wired in this view
        </span>
      </div>
    </section>
  );
}

function TeaserCard({
  name,
  price,
  highlights,
  highlight
}: {
  name: string;
  price: string;
  highlights: string[];
  highlight?: boolean;
}) {
  return (
    <article
      className={`flex flex-col gap-2 rounded-2xl border bg-white/[0.02] p-4 transition ${
        highlight ? "border-accent/40 shadow-glow" : "border-white/8 hover:border-white/14"
      }`}
    >
      <header className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-white">{name}</span>
        <span className="font-mono text-[12px] text-white/65">{price}</span>
      </header>
      <ul className="flex flex-col gap-1.5">
        {highlights.map((h) => (
          <li key={h} className="flex items-start gap-2 text-[12px] text-white/75">
            <Activity
              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${highlight ? "text-accent" : "text-white/45"}`}
            />
            <span>{h}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

// ============================================================================
// Section heading atom
// ============================================================================

function SectionHeading({
  eyebrow,
  title,
  sub
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
        {eyebrow}
      </span>
      <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
        {title}
      </h2>
      {sub && <p className="max-w-[68ch] text-[13px] text-white/60">{sub}</p>}
    </div>
  );
}

