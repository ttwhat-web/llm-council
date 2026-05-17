import Link from "next/link";
import {
  Activity,
  Apple,
  ArrowRight,
  Brain,
  Cpu,
  Database,
  Eye,
  FileText,
  Github,
  HardDrive,
  Lock,
  Map as MapIcon,
  Monitor,
  Phone,
  Rocket,
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
      <MissionAtlasSection />
      <ValuePropsSection />
      <MobileCompanionSection />
      <RoadmapSection />
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
        Desktop is the product. The web sells, the OS runs.
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
// Mission Atlas preview
// ============================================================================

const ATLAS_CELLS = [
  { Icon: Rocket, label: "Mission System", status: "live" },
  { Icon: Database, label: "Memory Layer", status: "configured" },
  { Icon: Github, label: "Repo Layer", status: "manual" },
  { Icon: Workflow, label: "Workflow Layer", status: "planned" },
  { Icon: Brain, label: "Brain Core", status: "core" },
  { Icon: Eye, label: "Intelligence", status: "offline" },
  { Icon: FileText, label: "Delivery", status: "ready" },
  { Icon: Phone, label: "Mobile Companion", status: "planned" },
  { Icon: MapIcon, label: "Atlas", status: "static preview" }
];

function MissionAtlasSection() {
  return (
    <section id="atlas" className="flex flex-col gap-5">
      <SectionHeading
        eyebrow="03 · mission atlas"
        title="See your business brain as a living map."
        sub="Brain, memory, repos, missions, workflows, intelligence, delivery, mobile — all on one blueprint wall inside PromptReady OS. Click any cell on the desktop to read the detail panel and export the whole blueprint to Markdown."
      />

      <div className="overflow-hidden rounded-3xl border border-accent/25 bg-accent/[0.04] shadow-glow">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-2">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
            <MapIcon className="h-3 w-3" />
            mission atlas · static product preview
          </div>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
            no live data
          </span>
        </div>

        <div
          className="grid gap-2 p-4 md:gap-3"
          style={{
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            backgroundImage:
              "linear-gradient(rgba(124,155,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(124,155,255,0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }}
        >
          {ATLAS_CELLS.map((c) => {
            const core = c.label === "Brain Core";
            const offline = c.status === "offline" || c.status === "planned";
            return (
              <article
                key={c.label}
                className={`relative flex h-[110px] flex-col justify-between rounded-2xl border p-3 ${
                  core
                    ? "border-accent/40 bg-accent/[0.08] shadow-glow"
                    : offline
                      ? "border-white/8 bg-white/[0.012]"
                      : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <span className="absolute -left-px -top-px h-2.5 w-2.5 border-l border-t border-accent" />
                <span className="absolute -right-px -top-px h-2.5 w-2.5 border-r border-t border-accent" />
                <span className="absolute -left-px -bottom-px h-2.5 w-2.5 border-l border-b border-accent" />
                <span className="absolute -right-px -bottom-px h-2.5 w-2.5 border-r border-b border-accent" />

                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <c.Icon className="h-3 w-3 text-accent" />
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/80">
                      {c.label}
                    </span>
                  </div>
                  <span
                    className={`rounded border px-1 py-px font-mono text-[8.5px] uppercase tracking-wider ${
                      core
                        ? "border-accent/40 bg-accent/[0.1] text-accent"
                        : offline
                          ? "border-white/10 bg-white/[0.03] text-white/55"
                          : "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
                    }`}
                  >
                    {c.status}
                  </span>
                </header>

                <ul className="grid grid-cols-2 gap-1">
                  {["pill", "pill"].map((_, i) => (
                    <li
                      key={i}
                      className="h-[14px] rounded-sm border border-white/8 bg-white/[0.012]"
                    />
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>

      <p className="text-[11.5px] text-white/45">
        Every cell on the desktop reads from your local stores — brain, missions,
        sources, terminal pins. Click a cell to open a detail panel, then export
        the entire Atlas to Markdown.
      </p>
    </section>
  );
}

// ============================================================================
// Customer value cards
// ============================================================================

const VALUE_PROPS = [
  { title: "Own your memory", body: "Notes, repos, vaults stay on your machine. No vendor lock-in." },
  { title: "Dispatch missions, don't chat", body: "Briefs in, named deliverables out. Receipts for everything." },
  { title: "Connect repos and notes", body: "Attach a repo URL, point at a folder, paste a note. The brain grows." },
  { title: "Approve from your phone", body: "Risky actions wait for a tap. Cloud spend, repo writes, shell commands." },
  { title: "Local-first by default", body: "Deterministic engine ships in the box. Ollama if installed. Cloud if you opt in." },
  { title: "Bring your own model", body: "Anthropic, OpenAI, Google keys you control. Or stay local forever." },
  { title: "Export every deliverable", body: "Markdown, shell, JSON, text. Copy or download per artifact." },
  { title: "Build your private AI brain", body: "Not a chat. A persistent operator that learns who you are." }
];

function ValuePropsSection() {
  return (
    <section className="flex flex-col gap-5">
      <SectionHeading
        eyebrow="04 · why operators pay"
        title="What you actually get."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {VALUE_PROPS.map((v) => (
          <article
            key={v.title}
            className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-white/[0.02] p-4 transition hover:border-accent/30"
          >
            <span className="text-[13px] font-semibold text-white">{v.title}</span>
            <span className="text-[11.5px] text-white/55">{v.body}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// Mobile Companion teaser
// ============================================================================

function MobileCompanionSection() {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-accent/25 bg-accent/[0.04] p-6 shadow-glow">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
            05 · mobile companion
          </span>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Capture and approve from your phone.
          </h2>
          <p className="mt-1 max-w-[60ch] text-[13px] text-white/65">
            Mobile is not the product. The desktop is. Mobile is the capture
            device and the approval gate — voice notes, screenshots, share-sheet
            into your brain. Risky actions wait for your tap.
          </p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/55">
          planned · secure pairing
        </span>
      </header>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-4">
        {[
          { t: "Capture", b: "voice · screenshot · share-sheet" },
          { t: "Approve", b: "cloud spend · repo writes · shell" },
          { t: "View", b: "receipts · deliverables · flight recorder" },
          { t: "Dispatch", b: "ask my brain · send to desktop" }
        ].map((c) => (
          <li
            key={c.t}
            className="flex flex-col gap-0.5 rounded-xl border border-white/8 bg-white/[0.012] p-3"
          >
            <span className="text-[12.5px] font-semibold text-white">{c.t}</span>
            <span className="text-[11px] text-white/55">{c.b}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ============================================================================
// Roadmap
// ============================================================================

const ROADMAP = [
  {
    phase: "Now",
    tone: "ok" as const,
    items: [
      "Desktop shell with eight operator surfaces",
      "Mission lifecycle scaffold (eight typed stages)",
      "Brain bootstrap · identity · sources · engines",
      "BYOK key fields and local Brain Notes"
    ]
  },
  {
    phase: "Next",
    tone: "soon" as const,
    items: [
      "Operations Pipeline live (real telemetry per stage)",
      "Signed installers · macOS · Windows · Linux",
      "Obsidian + Local folder indexers",
      "Docker self-host runtime"
    ]
  },
  {
    phase: "Later",
    tone: "muted" as const,
    items: [
      "Agent runtime (Inbox Triager · Repo Watchdog · Research Scout)",
      "Workflow chains across missions",
      "Connected feeds in Intelligence Terminal",
      "Operator-tier shared workspaces"
    ]
  }
];

function RoadmapSection() {
  return (
    <section id="roadmap" className="flex flex-col gap-5">
      <SectionHeading
        eyebrow="06 · roadmap"
        title="What ships when."
        sub="Honest staging. Now is what you'd find on your machine today. Next is in active build. Later is committed but not yet engineered."
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {ROADMAP.map((r) => (
          <article
            key={r.phase}
            className={`flex flex-col gap-3 rounded-2xl border bg-white/[0.02] p-4 ${
              r.tone === "ok"
                ? "border-emerald-400/30"
                : r.tone === "soon"
                  ? "border-accent/30"
                  : "border-white/10"
            }`}
          >
            <header className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
                {r.phase}
              </span>
              <span
                className={`rounded-md border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                  r.tone === "ok"
                    ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
                    : r.tone === "soon"
                      ? "border-accent/30 bg-accent/[0.06] text-accent"
                      : "border-white/10 bg-white/[0.03] text-white/55"
                }`}
              >
                {r.tone === "ok" ? "shipped" : r.tone === "soon" ? "in build" : "committed"}
              </span>
            </header>
            <ul className="flex flex-col gap-1.5">
              {r.items.map((it) => (
                <li key={it} className="flex items-start gap-2 text-[12px] text-white/75">
                  <span
                    className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
                      r.tone === "ok"
                        ? "bg-emerald-400"
                        : r.tone === "soon"
                          ? "bg-accent"
                          : "bg-white/35"
                    }`}
                  />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
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
        eyebrow="07 · pricing"
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

