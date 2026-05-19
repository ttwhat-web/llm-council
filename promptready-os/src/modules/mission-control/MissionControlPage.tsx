"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Circle,
  Cpu,
  Download,
  FileText,
  Github,
  Loader,
  Rocket,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";
import { BrainGraph } from "@/components/BrainGraph";
import { RepoContextCard, type RepoContextValue } from "@/components/RepoContextCard";
import { CodeOperatorActions } from "@/components/CodeOperatorActions";
import { useBrainStore } from "@/store/brain";
import {
  useMissionStore,
  STAGES,
  STAGE_META,
  type MissionStage,
  type RuntimeStatus,
  type MissionReceipt
} from "@/store/mission";
import type { Deliverable } from "@/services/missionRunner";

/**
 * Mission Control · Phase 13.
 *
 * Cockpit, not a form. The Brain Graph (compact) lives in the right
 * column as the visual anchor — "I am building my own AI brain". Below
 * it sits the brain state. The center column owns the Execution Graph
 * timeline; the bottom row holds Flight Recorder (log) · Deliverables
 * (real artifact cards) · Operations Archive jumps.
 */

const MODE_OPTIONS = ["auto", "claude", "chatgpt", "cursor", "gemini", "dev", "terminal", "business", "general"] as const;
const QUALITY_OPTIONS = ["fast", "smart", "expert", "code", "local"] as const;

const BLUEPRINTS = [
  { id: "fix-prompt", label: "Fix messy prompt", seed: "Take this messy prompt and turn it into an execution-ready brief:\n\n" },
  { id: "architect", label: "Architect a product", seed: "I want to build " },
  { id: "stack-trace", label: "Debug stack trace", seed: "Help me debug this stack trace and propose a fix:\n\n" },
  { id: "terminal-fix", label: "Terminal-safe command", seed: "I want a shell command to " }
];

export default function MissionControlPage() {
  const [brief, setBrief] = useState("");
  const [mode, setMode] = useState<(typeof MODE_OPTIONS)[number]>("auto");
  const [quality, setQuality] = useState<(typeof QUALITY_OPTIONS)[number]>("fast");
  const [repo, setRepo] = useState<RepoContextValue | null>(null);

  const current = useMissionStore((s) => s.current);
  const runtime = useMissionStore((s) => s.runtime);
  const history = useMissionStore((s) => s.history);
  const dispatch = useMissionStore((s) => s.dispatch);
  const cancel = useMissionStore((s) => s.cancel);

  const brainSourceCount = useBrainStore((s) => s.memorySources.length);
  const identity = useBrainStore((s) => s.identity);

  const onDispatch = () => {
    if (!brief.trim()) return;
    void dispatch(brief, mode, quality, repo ? repoToString(repo) : null);
  };

  const activeStage: MissionStage = current?.stage ?? "idle";
  const inFlight = !!current && current.stage !== "deliverable-ready" && current.stage !== "idle";

  return (
    <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="mission control · operator console"
        title={identity ? `${identity.name}'s cockpit` : "Mission cockpit"}
        sub="Dispatch missions, watch the execution graph, ship named deliverables. Every receipt lands in the Operations Archive."
        right={
          <div className="flex items-center gap-2">
            <RuntimeChip runtime={runtime} />
            {current && <MissionIdChip id={current.id} />}
          </div>
        }
      />

      {/* ====================== Top row ====================== */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)_minmax(0,340px)]">
        {/* Brief column */}
        <div className="flex flex-col gap-4">
          <BriefPanel
            brief={brief}
            setBrief={setBrief}
            mode={mode}
            setMode={setMode}
            quality={quality}
            setQuality={setQuality}
            onDispatch={onDispatch}
            onCancel={cancel}
            inFlight={inFlight}
            runtime={runtime}
            attachedRepo={repo}
            brainSourceCount={brainSourceCount}
          />
          <RepoContextCard value={repo} onChange={setRepo} />
        </div>

        {/* Execution graph */}
        <ExecutionGraph activeStage={activeStage} runtime={runtime} mission={current} />

        {/* Brain column */}
        <div className="flex flex-col gap-4">
          <BrainGraphPanel />
          <BrainStateCard />
        </div>
      </div>

      {/* ====================== Bottom row ====================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)_minmax(0,340px)]">
        <FlightRecorder mission={current} />
        <DeliverablesPanel mission={current} />
        <ArchiveJump history={history} />
      </div>
    </div>
  );
}

// ============================================================================
// Brief panel
// ============================================================================

function BriefPanel({
  brief,
  setBrief,
  mode,
  setMode,
  quality,
  setQuality,
  onDispatch,
  onCancel,
  inFlight,
  runtime,
  attachedRepo,
  brainSourceCount
}: {
  brief: string;
  setBrief: (v: string) => void;
  mode: (typeof MODE_OPTIONS)[number];
  setMode: (v: (typeof MODE_OPTIONS)[number]) => void;
  quality: (typeof QUALITY_OPTIONS)[number];
  setQuality: (v: (typeof QUALITY_OPTIONS)[number]) => void;
  onDispatch: () => void;
  onCancel: () => void;
  inFlight: boolean;
  runtime: RuntimeStatus;
  attachedRepo: RepoContextValue | null;
  brainSourceCount: number;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <SectionLabel eyebrow="01 · brief" title="Mission Brief" />

      <div className="flex flex-wrap items-center gap-1">
        <Chip Icon={Activity} label={`brain · ${brainSourceCount} source${brainSourceCount === 1 ? "" : "s"} attached`} tone="default" />
        {attachedRepo && (
          <Chip Icon={Github} label={`repo · ${shortRepo(attachedRepo.url)}`} tone="accent" />
        )}
      </div>

      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="Paste a messy prompt, an error log, or describe what you need…"
        rows={9}
        spellCheck={false}
        className="no-drag w-full resize-y rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5 text-[13px] text-white/90 placeholder:text-white/30 focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/25"
      />

      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Mode" value={mode} onChange={(v) => setMode(v as (typeof MODE_OPTIONS)[number])}>
          {MODE_OPTIONS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </SelectField>
        <SelectField label="Quality" value={quality} onChange={(v) => setQuality(v as (typeof QUALITY_OPTIONS)[number])}>
          {QUALITY_OPTIONS.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </SelectField>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {BLUEPRINTS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBrief(brief ? brief + "\n\n" + b.seed : b.seed)}
            className="no-drag inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/80 transition hover:bg-white/[0.06]"
          >
            <Sparkles className="h-3 w-3 text-accent/80" />
            {b.label}
          </button>
        ))}
      </div>

      {inFlight ? (
        <button
          type="button"
          onClick={onCancel}
          className="no-drag inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500/15 px-3 py-2 text-sm font-semibold text-rose-100 ring-1 ring-rose-400/40 transition hover:bg-rose-500/25"
        >
          <X className="h-4 w-4" /> Cancel mission
        </button>
      ) : (
        <button
          type="button"
          onClick={onDispatch}
          disabled={!brief.trim()}
          className="no-drag inline-flex items-center justify-center gap-2 rounded-xl bg-accent/90 px-3 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Rocket className="h-4 w-4" /> Dispatch Mission
        </button>
      )}
      <p className="text-[10.5px] text-white/40">
        {runtime === "ready"
          ? "Engine ready. Stages stream into the execution graph."
          : "Running on the deterministic local engine. Cloud + Ollama wire in via Settings."}
      </p>
    </section>
  );
}

// ============================================================================
// Execution graph
// ============================================================================

function ExecutionGraph({
  activeStage,
  runtime,
  mission
}: {
  activeStage: MissionStage;
  runtime: RuntimeStatus;
  mission: MissionReceipt | null;
}) {
  const activeIdx = STAGES.indexOf(activeStage);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.018] p-4 shadow-glass">
      <SectionLabel
        eyebrow="02 · execution graph"
        title="Pipeline"
        sub={
          mission
            ? "Each card lights as the runner advances. Real computation per stage — no fake auto-advance."
            : "Eight typed stages. Dispatch a brief to light them up."
        }
      />

      <ol className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {STAGES.filter((s) => s !== "idle").map((stage, i) => {
          const meta = STAGE_META[stage];
          const realIdx = i + 1;
          const state: "done" | "current" | "pending" =
            activeIdx > realIdx
              ? "done"
              : activeIdx === realIdx
                ? "current"
                : "pending";
          return <TimelineCard key={stage} code={meta.code} label={meta.label} blurb={meta.blurb} state={state} />;
        })}
      </ol>

      {runtime !== "ready" && (
        <div className="mt-1 flex items-center gap-2 rounded-md border border-amber-400/25 bg-amber-500/[0.05] px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-amber-200/85">
          <Loader className="h-3 w-3" />
          {runtime === "waiting-for-engine"
            ? "engine: deterministic local · awaiting first dispatch"
            : runtime === "local-mode"
              ? "engine: deterministic local · cloud/ollama not configured"
              : "engine: offline · no path resolved"}
        </div>
      )}
    </section>
  );
}

function TimelineCard({
  code,
  label,
  blurb,
  state
}: {
  code: string;
  label: string;
  blurb: string;
  state: "done" | "current" | "pending";
}) {
  return (
    <li
      className={clsx(
        "relative flex flex-col gap-1 rounded-xl border px-3 py-2.5",
        state === "current"
          ? "border-accent/40 bg-accent/[0.06] shadow-glow"
          : state === "done"
            ? "border-emerald-400/25 bg-emerald-500/[0.04]"
            : "border-white/8 bg-white/[0.012]"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em]">
          <span
            className={clsx(
              state === "current"
                ? "text-accent"
                : state === "done"
                  ? "text-emerald-300"
                  : "text-white/35"
            )}
          >
            {code}
          </span>
          <span className="text-white/80">{label}</span>
        </span>
        {state === "done" ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
        ) : state === "current" ? (
          <Loader className="h-3.5 w-3.5 animate-pulse text-accent" />
        ) : (
          <Circle className="h-3.5 w-3.5 text-white/25" />
        )}
      </div>
      <p className="text-[10.5px] text-white/50">{blurb}</p>
    </li>
  );
}

// ============================================================================
// Brain graph + state (right column)
// ============================================================================

function BrainGraphPanel() {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.018] p-4 shadow-glass">
      <SectionLabel eyebrow="03 · brain graph" title="Live graph" sub="Click a node for detail." />
      <BrainGraph compact />
      <a
        href="/brain"
        className="self-end font-mono text-[10px] uppercase tracking-wider text-white/55 hover:text-white"
      >
        full graph →
      </a>
    </section>
  );
}

function BrainStateCard() {
  const identity = useBrainStore((s) => s.identity);
  const sources = useBrainStore((s) => s.memorySources);
  const engines = useBrainStore((s) => s.engines);
  const missionCount = useBrainStore((s) => s.missionCount);
  const demo = useBrainStore((s) => s.demo);

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <SectionLabel
        eyebrow="04 · brain state"
        title={identity ? identity.name : "No brain"}
        sub={identity ? `${identity.mode}${demo ? " · demo data" : ""}` : "Bootstrap a brain to populate this card."}
      />
      <div className="grid grid-cols-2 gap-2">
        <Stat label="missions" value={String(missionCount)} />
        <Stat label="sources" value={String(sources.length)} />
        <Stat label="engines" value={String(engines.length)} />
        <Stat label="demo" value={demo ? "yes" : "no"} />
      </div>
    </section>
  );
}

// ============================================================================
// Flight recorder (bottom-left)
// ============================================================================

function FlightRecorder({ mission }: { mission: MissionReceipt | null }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.018] p-4">
      <SectionLabel
        eyebrow="05 · flight recorder"
        title="Live event log"
        sub="Every stage event is logged with its timestamp. Replayable from any receipt."
      />
      <div className="rounded-xl border border-white/8 bg-black/30 p-3">
        {!mission ? (
          <ul className="flex flex-col gap-1 font-mono text-[10.5px] text-white/55">
            <LogLine kind="info" tag="boot" message="Operator Core shell ready" />
            <LogLine kind="info" tag="brain" message="Brain identity loaded from local store" />
            <LogLine kind="info" tag="route" message="Local-first · deterministic engine standby" />
            <LogLine kind="info" tag="safety" message="Screen armed" />
          </ul>
        ) : (
          <ul className="flex max-h-[260px] flex-col gap-1 overflow-auto font-mono text-[10.5px]">
            {mission.events.map((e, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-white/30">{ts(e.at)}</span>
                <LogLineInner kind={e.kind} tag={e.tag} message={e.message} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ts(at: number) {
  const d = new Date(at);
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${m}:${s}.${ms}`;
}

// ============================================================================
// Deliverables
// ============================================================================

function DeliverablesPanel({ mission }: { mission: MissionReceipt | null }) {
  const [open, setOpen] = useState<string | null>(null);
  const deliverables = mission?.deliverables ?? [];

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <SectionLabel
        eyebrow="06 · deliverables"
        title="Mission Output"
        sub="Real artifacts generated by the deterministic engine. Each card downloads or copies cleanly."
      />

      {deliverables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.012] p-4 text-center">
          <FileText className="mx-auto h-5 w-5 text-white/35" />
          <p className="mt-1 text-[12px] text-white/75">No deliverables yet.</p>
          <p className="mt-1 text-[10.5px] text-white/45">
            Dispatch a mission to fill this column.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {deliverables.map((d) => (
            <DeliverableCard
              key={d.id}
              d={d}
              open={open === d.id}
              onToggle={() => setOpen(open === d.id ? null : d.id)}
            />
          ))}
        </ul>
      )}

      <MissionReceiptCard mission={mission} />
    </section>
  );
}

function DeliverableCard({
  d,
  open,
  onToggle
}: {
  d: Deliverable;
  open: boolean;
  onToggle: () => void;
}) {
  const onCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(d.content);
    }
  };
  const onDownload = () => {
    if (typeof window === "undefined") return;
    const ext = d.format === "shell" ? "sh" : d.format === "json" ? "json" : d.format === "markdown" ? "md" : "txt";
    const blob = new Blob([d.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${d.label.toLowerCase().replace(/\s+/g, "-")}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <li className="rounded-xl border border-white/8 bg-white/[0.012]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[12.5px] font-semibold text-white">{d.label}</span>
          <span className="text-[10.5px] text-white/50">{d.blurb}</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
          {d.format}
        </span>
      </button>
      {open && (
        <div className="border-t border-white/6 p-3">
          <pre className="max-h-[180px] overflow-auto rounded-md border border-white/8 bg-black/40 p-2 font-mono text-[10.5px] leading-snug text-white/80">
            {d.content}
          </pre>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <CodeOperatorActions label={d.label} content={d.content} />
            <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-white/80 hover:bg-white/[0.06]"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-2 py-1 text-[10.5px] font-semibold text-white shadow-glow hover:bg-accent"
            >
              <Download className="h-3 w-3" /> Download
            </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function MissionReceiptCard({ mission }: { mission: MissionReceipt | null }) {
  return (
    <article className="rounded-xl border border-accent/25 bg-accent/[0.04] p-3 shadow-glow">
      <header className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
          mission receipt
        </span>
        {mission && <MissionIdChip id={mission.id} />}
      </header>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {[
          ["mode", mission?.mode ?? "—"],
          ["quality", mission?.quality ?? "—"],
          ["stage", mission?.stage ?? "idle"],
          ["score", mission?.score ? `${mission.score}/100` : "—"],
          ["elapsed", mission?.elapsedMs ? `${mission.elapsedMs}ms` : "—"],
          ["memory", mission ? `${mission.memoryMatches ?? 0} match` : "—"]
        ].map(([k, v]) => (
          <li key={k} className="flex items-center justify-between text-[10.5px]">
            <span className="font-mono uppercase tracking-wider text-white/40">{k}</span>
            <span className="font-mono text-white/85">{v}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

// ============================================================================
// Archive jump (bottom-right)
// ============================================================================

function ArchiveJump({ history }: { history: MissionReceipt[] }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.018] p-4">
      <SectionLabel
        eyebrow="07 · operations archive"
        title="Recent missions"
        sub="The Library page holds every receipt. Quick jumps here."
      />
      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.008] p-4 text-center">
          <p className="text-[12px] text-white/75">Archive empty.</p>
          <p className="mt-1 text-[10.5px] text-white/45">
            Completed missions land here automatically.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {history.slice(0, 6).map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11.5px]"
            >
              <span className="truncate text-white/80">{m.brief.slice(0, 56)}</span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
                {m.stage === "deliverable-ready" ? "ready" : m.stage}
              </span>
            </li>
          ))}
        </ul>
      )}
      <a
        href="/library"
        className="self-start font-mono text-[10px] uppercase tracking-wider text-white/55 hover:text-white"
      >
        open archive →
      </a>
    </section>
  );
}

// ============================================================================
// Atoms
// ============================================================================

function SectionLabel({
  eyebrow,
  title,
  sub
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <header className="flex flex-col gap-0.5 border-b border-white/5 pb-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
        {eyebrow}
      </span>
      <span className="text-[13px] font-semibold text-white">{title}</span>
      {sub && <p className="text-[10.5px] text-white/50">{sub}</p>}
    </header>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="no-drag rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 font-sans text-[12px] normal-case text-white focus:border-accent/40 focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function LogLine({
  kind,
  tag,
  message
}: {
  kind: "ok" | "info" | "warn" | "err";
  tag: string;
  message: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <LogLineInner kind={kind} tag={tag} message={message} />
    </li>
  );
}

function LogLineInner({
  kind,
  tag,
  message
}: {
  kind: "ok" | "info" | "warn" | "err";
  tag: string;
  message: string;
}) {
  const tone = {
    ok: "text-emerald-300/80",
    info: "text-white/45",
    warn: "text-amber-300/80",
    err: "text-rose-300/80"
  }[kind];
  return (
    <>
      <span className={clsx("font-mono uppercase tracking-wider", tone)}>{kind}</span>
      <span className="rounded border border-white/10 bg-white/[0.03] px-1 py-px text-[9px] uppercase tracking-wider text-white/45">
        {tag}
      </span>
      <span className="text-white/65">{message}</span>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">{label}</span>
      <span className="text-[14px] font-semibold text-white">{value}</span>
    </div>
  );
}

function Chip({
  Icon,
  label,
  tone
}: {
  Icon: typeof Activity;
  label: string;
  tone: "default" | "accent";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        tone === "accent"
          ? "border-accent/30 bg-accent/[0.08] text-accent"
          : "border-white/10 bg-white/[0.03] text-white/65"
      )}
    >
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function RuntimeChip({ runtime }: { runtime: RuntimeStatus }) {
  const meta = {
    ready: { tone: "ok" as const, label: "engine ready", Icon: ShieldCheck },
    "waiting-for-engine": { tone: "warn" as const, label: "deterministic standby", Icon: Loader },
    "local-mode": { tone: "ok" as const, label: "local · deterministic", Icon: Cpu },
    offline: { tone: "muted" as const, label: "offline", Icon: Activity }
  }[runtime];
  const cls = {
    ok: "border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-200",
    warn: "border-amber-400/35 bg-amber-500/[0.06] text-amber-200",
    muted: "border-white/10 bg-white/[0.03] text-white/55"
  }[meta.tone];
  const { Icon } = meta;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider",
        cls
      )}
    >
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
}

function MissionIdChip({ id }: { id: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
      <ArrowRight className="h-3 w-3" />
      {id}
    </span>
  );
}

function repoToString(r: RepoContextValue) {
  const branch = r.branch ? `#${r.branch}` : "";
  const note = r.note ? ` — ${r.note}` : "";
  return `${r.url}${branch}${note}`;
}

function shortRepo(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\.git$/, "").slice(0, 36);
}
