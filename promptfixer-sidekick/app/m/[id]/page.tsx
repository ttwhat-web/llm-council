import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";
import { getMissionStore, isMissionId } from "@/lib/missions/store";
import { toPublicReceipt } from "@/lib/missions/types";
import type { PublicMissionReceipt } from "@/lib/missions/types";

/**
 * Public mission permalink — `/m/<id>`.
 *
 * Server-rendered. Returns 404 unless the receipt exists AND its
 * visibility is "shared". The owner of a private receipt sees the
 * same 404 here; their owner-side view lives in Mission Control.
 */

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  if (!isMissionId(params.id)) return { title: "Mission · operator.center" };
  const store = await getMissionStore();
  const receipt = await store.getShared(params.id);
  if (!receipt) return { title: "Mission · operator.center" };
  return {
    title: `${receipt.title} · operator.center`,
    description: receipt.inputSummary,
    openGraph: {
      title: receipt.title,
      description: receipt.inputSummary,
      type: "article"
    }
  };
}

export default async function MissionPermalink({ params }: Props) {
  if (!isMissionId(params.id)) notFound();
  const store = await getMissionStore();
  const stored = await store.getShared(params.id);
  if (!stored) notFound();
  const receipt = toPublicReceipt(stored);
  return <MissionView receipt={receipt} />;
}

// ============================================================================
// View
// ============================================================================

const STAGE_ORDER = [
  "input",
  "clean",
  "intent",
  "structure",
  "constraints",
  "generate",
  "validate",
  "output"
] as const;

const STAGE_LABEL: Record<(typeof STAGE_ORDER)[number], string> = {
  input: "INPUT",
  clean: "CLEAN",
  intent: "INTENT",
  structure: "STRUCTURE",
  constraints: "CONSTRAINTS",
  generate: "GENERATE",
  validate: "VALIDATE",
  output: "OUTPUT"
};

function MissionView({ receipt }: { receipt: PublicMissionReceipt }) {
  const stageStates = computeStageStates(receipt);
  return (
    <MarketingShell>
      <header className="flex flex-col gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
          Mission permalink · {receipt.id.slice(2, 10)}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-4xl">
          {receipt.title}
        </h1>
        <p className="max-w-[68ch] text-[13px] text-white/60">{receipt.inputSummary}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px] uppercase tracking-wider text-white/45">
          <Pill label={`mode · ${receipt.mode}`} />
          <Pill label={`route · ${receipt.supervisor.resolved}`} />
          {receipt.supervisor.model && <Pill label={`model · ${receipt.supervisor.model}`} />}
          <Pill label={`${receipt.elapsedMs}ms`} />
          <Pill label={`${new Date(receipt.createdAt).toUTCString()}`} />
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/[0.08] px-1.5 py-0.5 text-emerald-200">
            <ShieldCheck className="h-3 w-3" /> shared
          </span>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between pb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
              <span>operations pipeline</span>
              <span>{receipt.elapsedMs}ms</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-8">
              {STAGE_ORDER.map((stage) => (
                <StageChip
                  key={stage}
                  label={STAGE_LABEL[stage]}
                  state={stageStates[stage]}
                />
              ))}
            </div>
            {receipt.events && receipt.events.length > 0 && (
              <ul className="mt-3 flex flex-col divide-y divide-white/5 text-[11px]">
                {receipt.events
                  .filter((e) => e.status !== "active")
                  .slice(0, 12)
                  .map((e, i) => (
                    <li key={i} className="flex items-center gap-2 py-1">
                      <span
                        className={`font-mono text-[9px] uppercase tracking-wider ${toneFor(
                          e.status
                        )}`}
                      >
                        {e.status.toUpperCase()}
                      </span>
                      <span className="rounded border border-white/10 bg-white/[0.03] px-1 py-px font-mono text-[9px] uppercase text-white/55">
                        {e.stage}
                      </span>
                      <span className="text-white/75">{e.detail || ""}</span>
                      <span className="ml-auto font-mono text-[9px] text-white/30">
                        {e.elapsedMs}ms
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/30">
            <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
              <div className="flex flex-col">
                <div className="text-[11px] font-medium uppercase tracking-wider text-white/55">
                  Mission Output
                </div>
                <div className="text-[10px] text-white/40">
                  Paste this prompt into your AI tool to get the final answer.
                </div>
              </div>
              <Link
                href="/app"
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/[0.08] px-2.5 py-1 text-[11px] font-medium text-accent transition hover:bg-accent/[0.16]"
              >
                Run your own
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <pre className="scrollbar-thin max-h-[60vh] min-h-0 overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-[12px] leading-relaxed text-white/85">
              {receipt.output}
            </pre>
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <ScoreCardView receipt={receipt} />
          <SafetyCard receipt={receipt} />
          <CtaCard />
        </aside>
      </section>
    </MarketingShell>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5">
      {label}
    </span>
  );
}

function ScoreCardView({ receipt }: { receipt: PublicMissionReceipt }) {
  const items: Array<[string, number]> = [
    ["Clarity", receipt.score.clarity],
    ["Specificity", receipt.score.specificity],
    ["Safety", receipt.score.safety],
    ["Model fit", receipt.score.modelFit]
  ];
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
        Score
      </div>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map(([label, value]) => (
          <li key={label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-white/65">{label}</span>
              <span className="font-mono text-[12px] text-white">{value}</span>
            </div>
            <div className="h-1 rounded-full bg-white/10">
              <span
                className={`block h-full rounded-full ${
                  value >= 80
                    ? "bg-emerald-400"
                    : value >= 60
                      ? "bg-accent"
                      : value >= 40
                        ? "bg-amber-400"
                        : "bg-rose-400"
                }`}
                style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SafetyCard({ receipt }: { receipt: PublicMissionReceipt }) {
  const has = receipt.safetyFindings.length > 0;
  if (!has && !receipt.safetyBlocked) {
    return (
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.05] p-4 text-[12px] text-emerald-200">
        Safety screen passed — no findings on this mission.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-4">
      <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-amber-300">
        Safety findings
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {receipt.safetyFindings.map((f, i) => (
          <li key={i} className="text-[12px] text-amber-100/85">
            <span className="mr-2 font-mono text-[9px] uppercase tracking-wider text-amber-300">
              {f.severity}
            </span>
            {f.reason}
          </li>
        ))}
      </ul>
      {receipt.safetyBlocked && (
        <p className="mt-2 text-[11px] text-rose-200">
          Output was blocked at the safety screen.
        </p>
      )}
    </div>
  );
}

function CtaCard() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-accent/30 bg-accent/[0.06] p-4 shadow-glow">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
        operator.center
      </span>
      <p className="text-[12px] text-white/80">
        Operate, don&apos;t prompt. Dispatch your own missions and get a permalink
        like this for every output.
      </p>
      <Link
        href="/app"
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent"
      >
        Run your own mission
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ============================================================================
// helpers
// ============================================================================

type StageState = "idle" | "complete" | "fallback" | "warning";

function computeStageStates(
  receipt: PublicMissionReceipt
): Record<(typeof STAGE_ORDER)[number], StageState> {
  const out: Record<(typeof STAGE_ORDER)[number], StageState> = {
    input: "complete",
    clean: "idle",
    intent: "idle",
    structure: "idle",
    constraints: "idle",
    generate: "idle",
    validate: "idle",
    output: receipt.safetyBlocked ? "warning" : "complete"
  };

  // Prefer real events when available.
  if (receipt.events && receipt.events.length > 0) {
    for (const stage of STAGE_ORDER) {
      const events = receipt.events.filter((e) => e.stage === stage);
      const last = events[events.length - 1];
      if (!last) continue;
      switch (last.status) {
        case "complete":
          out[stage] = "complete";
          break;
        case "fallback":
          out[stage] = "fallback";
          break;
        case "warning":
          out[stage] = "warning";
          break;
        default:
          out[stage] = "complete";
      }
    }
    return out;
  }

  // Inference fallback.
  out.clean = "complete";
  out.intent = "complete";
  out.structure = "complete";
  out.constraints = "complete";
  out.generate = receipt.supervisor.fallbackUsed ? "fallback" : "complete";
  out.validate = receipt.safetyBlocked || receipt.safetyFindings.length > 0 ? "warning" : "complete";
  return out;
}

function StageChip({ label, state }: { label: string; state: StageState }) {
  const dot =
    state === "complete"
      ? "bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.5)]"
      : state === "fallback"
        ? "bg-amber-400 shadow-[0_0_6px_1px_rgba(251,191,36,0.45)]"
        : state === "warning"
          ? "bg-orange-400 shadow-[0_0_6px_1px_rgba(251,146,60,0.5)]"
          : "bg-white/15";
  const text =
    state === "complete"
      ? "text-white/75"
      : state === "fallback"
        ? "text-amber-200"
        : state === "warning"
          ? "text-orange-200"
          : "text-white/30";
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg p-2">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className={`font-mono text-[9px] uppercase tracking-[0.1em] ${text}`}>{label}</span>
    </div>
  );
}

function toneFor(status: string): string {
  switch (status) {
    case "complete":
      return "text-emerald-300/80";
    case "fallback":
      return "text-amber-300/80";
    case "warning":
      return "text-orange-300/80";
    default:
      return "text-white/40";
  }
}
