import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircuitBoard,
  Cpu,
  GitBranch,
  PlayCircle,
  ScanLine,
  ShieldCheck,
  Workflow
} from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";

/**
 * operator.center landing — `/`.
 *
 * Strict brand vocabulary: mission · dispatch · operator · runtime ·
 * telemetry · audit · recorder · skill · workflow · stack.
 * No "chatbot", no "ask AI anything", no "AI assistant".
 *
 * Mission Control lives at /app and stays anonymous-friendly.
 */

export default function LandingPage() {
  return (
    <MarketingShell>
      <Hero />
      <DeliverablesStrip />
      <LiveDemoPlaceholder />
      <SkillsGrid />
      <TelemetryPanel />
      <PricingPreview />
      <Faq />
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
        Operate, don&apos;t prompt.
      </div>
      <h1 className="max-w-[18ch] text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
        The AI command center for shipping work, not prompting.
      </h1>
      <p className="max-w-[58ch] text-[15px] leading-relaxed text-white/65 md:text-base">
        Turn messy prompts, screenshots, logs and ideas into{" "}
        <span className="text-white">named, replayable, audited</span> missions.
        Across every model. With a kill switch.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/app"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent/90 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-accent"
        >
          Start free
          <ArrowRight className="h-4 w-4" />
        </Link>
        <a
          href="#demo"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/[0.08]"
        >
          <PlayCircle className="h-4 w-4 text-accent/80" />
          Watch a 90s mission
        </a>
        <span className="text-[11px] text-white/40">
          No credit card. 10 free missions / day.
        </span>
      </div>
    </section>
  );
}

// ============================================================================
// Deliverables strip
// ============================================================================

const DELIVERABLES = [
  "Cursor Task",
  "Claude Prompt",
  "ChatGPT Prompt",
  "Gemini Prompt",
  "Markdown Spec",
  "Technical Plan",
  "PRD",
  "Linear-ready Issue",
  "GitHub Issue",
  "Jira Ticket",
  "Terminal Safe Command"
];

function DeliverablesStrip() {
  return (
    <section id="deliverables" className="flex flex-col gap-4">
      <SectionHeading
        eyebrow="01 · output"
        title="One mission. Eleven deliverables."
        sub="Every output ships in the format your tool actually wants. No copy-paste juggling. Every mission audited, every step replayable."
      />
      <div className="flex flex-wrap gap-1.5">
        {DELIVERABLES.map((d) => (
          <span
            key={d}
            className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-white/75"
          >
            {d}
          </span>
        ))}
      </div>
    </section>
  );
}

function LiveDemoPlaceholder() {
  return (
    <section
      id="demo"
      className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] p-5"
    >
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
          live demo · 90s
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
          Watch one mission, end to end.
        </h2>
        <p className="max-w-[60ch] text-[13px] text-white/60">
          From paste to permalink. Telemetry, score, safety screen, deliverable.
          We&apos;ll embed the live demo here once the marketing capture lands —
          for now,{" "}
          <Link href="/app" className="text-accent underline-offset-2 hover:underline">
            run your own mission
          </Link>{" "}
          on the free tier and you have your own demo.
        </p>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-accent/[0.08] to-transparent md:block" />
    </section>
  );
}

// ============================================================================
// Skills grid
// ============================================================================

const SKILLS = [
  { Icon: Workflow, name: "Prompt Fixer", blurb: "Six typed stages: Clean → Intent → Structure → Constraints → Generate → Validate." },
  { Icon: CircuitBoard, name: "Architect", blurb: "Idea → architecture, stack, file tree, deployment checklist, risks." },
  { Icon: ScanLine, name: "Prompt Cleaner", blurb: "Deterministic noise stripper. Smart-quotes, zero-width, paste artefacts." },
  { Icon: GitBranch, name: "Saved Workflows", blurb: "Compose shipped skills into one tap. Replay across days and machines." },
  { Icon: Cpu, name: "Model Router", blurb: "Anthropic · OpenAI · Ollama · deterministic. Explicit cost / quality knob." },
  { Icon: ShieldCheck, name: "Safety + Score", blurb: "Every output graded on clarity, specificity, safety, model-fit. Dangerous outputs blocked." }
];

function SkillsGrid() {
  return (
    <section id="skills" className="flex flex-col gap-5">
      <SectionHeading
        eyebrow="02 · runtime"
        title="A growing skill library. One runtime."
        sub="Skills are typed capabilities the runtime composes. Workflows chain them. Tools call out. Memory holds state."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SKILLS.map((s) => (
          <div
            key={s.name}
            className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4 transition hover:border-accent/30"
          >
            <s.Icon className="h-4 w-4 text-accent" />
            <div className="text-[13px] font-semibold text-white">{s.name}</div>
            <p className="text-[12px] leading-relaxed text-white/55">{s.blurb}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// Telemetry panel
// ============================================================================

function TelemetryPanel() {
  return (
    <section id="telemetry" className="flex flex-col gap-5">
      <SectionHeading
        eyebrow="03 · telemetry"
        title="Every mission audited. Every step replayable."
        sub="The Operations Pipeline streams real per-stage events. Receipts include provider, model, latency, score, safety findings."
      />
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 text-[10px] font-mono uppercase tracking-[0.2em] text-white/45">
          <span>operations pipeline</span>
          <span className="text-emerald-300">running · 412ms</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-8">
          {["INPUT", "CLEAN", "INTENT", "STRUCTURE", "CONSTRAINTS", "GENERATE", "VALIDATE", "OUTPUT"].map((s, i) => (
            <div
              key={s}
              className={`flex flex-col items-center gap-1 rounded-lg p-2 ${
                i <= 5 ? "" : i === 6 ? "bg-accent/[0.07]" : ""
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  i <= 5
                    ? "bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.5)]"
                    : i === 6
                      ? "bg-accent shadow-[0_0_8px_2px_rgba(124,155,255,0.6)]"
                      : "bg-white/15"
                }`}
              />
              <span
                className={`font-mono text-[9px] uppercase tracking-[0.1em] ${
                  i <= 5 ? "text-white/75" : i === 6 ? "text-accent" : "text-white/30"
                }`}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
        <ul className="mt-4 flex flex-col divide-y divide-white/5 text-[11px]">
          {[
            ["ok", "clean", "Stripped smart-quotes, zero-width chars · 12ms"],
            ["ok", "intent", "auto → claude · 18ms"],
            ["ok", "structure", "5 constraints drafted · 24ms"],
            ["ok", "generate", "route=cloud · model=claude-sonnet-4-6 · 287ms"],
            ["ok", "validate", "clarity=88 · spec=82 · fit=91 · safety:0"]
          ].map(([kind, tag, msg], i) => (
            <li key={i} className="flex items-center gap-2 py-1">
              <span
                className={`font-mono text-[9px] uppercase tracking-wider ${
                  kind === "ok" ? "text-emerald-300/80" : "text-white/40"
                }`}
              >
                {String(kind).toUpperCase()}
              </span>
              <span className="rounded border border-white/10 bg-white/[0.03] px-1 py-px font-mono text-[9px] uppercase text-white/55">
                {tag}
              </span>
              <span className="text-white/75">{msg}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ============================================================================
// Pricing preview
// ============================================================================

function PricingPreview() {
  return (
    <section id="pricing-preview" className="flex flex-col gap-5">
      <SectionHeading
        eyebrow="04 · access"
        title="Pricing that respects the operator."
        sub="Free until you hit the wall. Pro at $19. Team at $39 / seat. Founder Lifetime at $99 — first 100 only."
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <PlanCard
          name="Free"
          price="$0"
          highlights={["10 daily missions", "5 saved stacks", "1 recording draft"]}
          cta="Start free"
          href="/app"
        />
        <PlanCard
          name="Pro"
          price="$19 / mo"
          highlights={[
            "Unlimited missions",
            "Unlimited stacks + recordings",
            "All eleven deliverables",
            "Mission alerts (Telegram)"
          ]}
          cta="See plans"
          href="/pricing"
          highlight
        />
        <PlanCard
          name="Founder Lifetime"
          price="$99 once"
          highlights={[
            "Pro for life",
            "Capped at first 100 founders",
            "First in line for the operator API"
          ]}
          cta="Claim a slot"
          href="/pricing"
        />
      </div>
    </section>
  );
}

function PlanCard({
  name,
  price,
  highlights,
  cta,
  href,
  highlight
}: {
  name: string;
  price: string;
  highlights: string[];
  cta: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border bg-white/[0.02] p-5 transition ${
        highlight ? "border-accent/40 shadow-glow" : "border-white/8"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{name}</span>
        <span className="font-mono text-[12px] text-white/65">{price}</span>
      </div>
      <ul className="flex flex-col gap-1.5 text-[12px] text-white/75">
        {highlights.map((h) => (
          <li key={h} className="flex items-start gap-2">
            <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${highlight ? "text-accent" : "text-white/55"}`} />
            <span>{h}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition ${
          highlight
            ? "bg-accent/90 text-white shadow-glow hover:bg-accent"
            : "border border-white/10 bg-white/[0.03] text-white/85 hover:bg-white/[0.06]"
        }`}
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ============================================================================
// FAQ
// ============================================================================

function Faq() {
  const items: Array<[string, string]> = [
    [
      "Is this another ChatGPT?",
      "No. ChatGPT is a chat surface; operator.center is an execution layer. We dispatch missions to the model that fits, run a typed pipeline, score the output and ship it as a named deliverable. There's no conversation buffer to lose."
    ],
    [
      "Where does my data go?",
      "By default: through your selected cloud provider (Anthropic / OpenAI) and back. With Local mode (Ollama) it never leaves your machine. With BYOK on Pro+, the cloud spend rides on your keys, not ours."
    ],
    [
      "Can I bring my own API keys?",
      "Yes — Pro and Team support BYOK at a 20% discount. Enterprise gets dedicated provider routing, on-prem runtime and audit log streaming."
    ],
    [
      "Can I self-host?",
      "Enterprise can. The runtime is a single Next bundle and a Postgres / Redis pair. The Tauri shell already runs the engine offline."
    ]
  ];
  return (
    <section className="flex flex-col gap-5">
      <SectionHeading eyebrow="05 · faq" title="Honest answers." />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map(([q, a]) => (
          <div
            key={q}
            className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4"
          >
            <div className="text-[13px] font-semibold text-white">{q}</div>
            <p className="text-[12px] leading-relaxed text-white/65">{a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// Shared
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
