"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Circle,
  Cpu,
  Database,
  FileText,
  Loader,
  Rocket,
  Save,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";
import { useBrainStore } from "@/store/brain";
import {
  useMissionStore,
  STAGES,
  STAGE_META,
  type MissionStage,
  type RuntimeStatus
} from "@/store/mission";

/**
 * Mission Control · Phase 12 redesign.
 *
 * Top row:
 *   [ Brief ]  [ Execution graph ]  [ Brain state ]
 *
 * Bottom row:
 *   [ Mission timeline · receipt · deliverables · archive jump ]
 *
 * The execution graph is a real timeline of the eight typed stages.
 * When the engine isn't reachable, the pipeline halts at "briefing"
 * and the runtime label switches to one of:
 *
 *   waiting-for-engine · local-mode · offline
 *
 * No card animates fake progress.
 */

const MODE_OPTIONS = [
  "auto",
  "claude",
  "chatgpt",
  "cursor",
  "gemini",
  "dev",
  "terminal",
  "business",
  "general"
] as const;
const QUALITY_OPTIONS = ["fast", "smart", "expert", "code", "local"] as const;

interface BlueprintTile {
  id: string;
  label: string;
  blurb: string;
  seed: string;
}

const BLUEPRINTS: BlueprintTile[] = [
  {
    id: "fix-prompt",
    label: "Fix messy prompt",
    blurb: "Clean, structure and score a freeform prompt.",
    seed: "Take this messy prompt and turn it into an execution-ready brief:\n\n"
  },
  {
    id: "architect",
    label: "Architect a product",
    blurb: "Idea → architecture, stack, file tree, risks.",
    seed: "I want to build "
  },
  {
    id: "stack-trace",
    label: "Debug stack trace",
    blurb: "Paste a stack trace, get a triage plan.",
    seed: "Help me debug this stack trace and propose a fix:\n\n"
  },
  {
    id: "terminal-fix",
    label: "Terminal-safe command",
    blurb: "Translate intent to a safe shell command.",
    seed: "I want a shell command to "
  }
];

export default function MissionControlPage() {
  const [brief, setBrief] = useState("");
  const [mode, setMode] = useState<(typeof MODE_OPTIONS)[number]>("auto");
  const [quality, setQuality] = useState<(typeof QUALITY_OPTIONS)[number]>("fast");

  const current = useMissionStore((s) => s.current);
  const runtime = useMissionStore((s) => s.runtime);
  const history = useMissionStore((s) => s.history);
  const dispatch = useMissionStore((s) => s.dispatch);
  const cancel = useMissionStore((s) => s.cancel);

  const onDispatch = () => {
    if (!brief.trim()) return;
    dispatch(brief, mode, quality);
  };

  const activeStage: MissionStage = current?.stage ?? "idle";

  return (
    <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="mission control · operator console"
        title="Mission Brief"
        sub="Paste anything — a messy prompt, a stack trace, a brief. Dispatch routes it through the local pipeline and streams telemetry into the execution graph."
        right={<RuntimeChip runtime={runtime} />}
      />

      {/* ============================ Top row ============================ */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)_minmax(0,320px)]">
        <BriefColumn
          brief={brief}
          setBrief={setBrief}
          mode={mode}
          setMode={setMode}
          quality={quality}
          setQuality={setQuality}
          onDispatch={onDispatch}
          onCancel={cancel}
          dispatched={!!current}
          runtime={runtime}
        />
        <ExecutionGraph
          activeStage={activeStage}
          runtime={runtime}
          mission={current?.brief}
        />
        <BrainStatePanel />
      </div>

      {/* ============================ Bottom row ========================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)_minmax(0,360px)]">
        <MissionTimeline mission={current} />
        <DeliverablesPanel mission={current} />
        <ArchivePanel history={history} />
      </div>
    </div>
  );
}

// ============================================================================
// Brief column
// ============================================================================

function BriefColumn({
  brief,
  setBrief,
  mode,
  setMode,
  quality,
  setQuality,
  onDispatch,
  onCancel,
  dispatched,
  runtime
}: {
  brief: string;
  setBrief: (v: string) => void;
  mode: (typeof MODE_OPTIONS)[number];
  setMode: (v: (typeof MODE_OPTIONS)[number]) => void;
  quality: (typeof QUALITY_OPTIONS)[number];
  setQuality: (v: (typeof QUALITY_OPTIONS)[number]) => void;
  onDispatch: () => void;
  onCancel: () => void;
  dispatched: boolean;
  runtime: RuntimeStatus;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <SectionLabel
        eyebrow="01 · brief"
        title="Mission Brief"
        sub="Mode is inferred from the brief unless you pin it."
      />
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
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </SelectField>
        <SelectField label="Quality" value={quality} onChange={(v) => setQuality(v as (typeof QUALITY_OPTIONS)[number])}>
          {QUALITY_OPTIONS.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </SelectField>
      </div>

      <div>
        <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
          Mission Blueprints
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BLUEPRINTS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBrief(brief ? brief + "\n\n" + b.seed : b.seed)}
              title={b.blurb}
              className="no-drag inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/80 transition hover:bg-white/[0.06]"
            >
              <Sparkles className="h-3 w-3 text-accent/80" />
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        {dispatched ? (
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
            ? "Routing is live. Stages stream into the execution graph on the right."
            : "Engine not connected yet — the pipeline halts at briefing. Cancel any time."}
        </p>
      </div>
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
  mission?: string;
}) {
  const activeIdx = STAGES.indexOf(activeStage);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.018] p-4 shadow-glass">
      <SectionLabel
        eyebrow="02 · execution graph"
        title="Pipeline"
        sub={
          mission
            ? "Mission staged. Each card lights as the runtime advances. No card animates without a real event."
            : "Eight typed stages stream events when a mission runs. Idle today — no fake activity."
        }
      />

      <ol className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {STAGES.filter((s) => s !== "idle").map((stage, i) => {
          const meta = STAGE_META[stage];
          const realIdx = i + 1; // because we dropped "idle"
          const state: "done" | "current" | "pending" =
            activeIdx > realIdx ? "done" : activeIdx === realIdx ? "current" : "pending";
          return <TimelineCard key={stage} code={meta.code} label={meta.label} blurb={meta.blurb} state={state} />;
        })}
      </ol>

      {runtime !== "ready" && (
        <div className="mt-1 flex items-center gap-2 rounded-md border border-amber-400/25 bg-amber-500/[0.05] px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-amber-200/85">
          <Loader className="h-3 w-3" />
          {runtime === "waiting-for-engine"
            ? "waiting for engine · local-first · offline"
            : runtime === "local-mode"
              ? "local mode · ollama unreachable"
              : "offline · no engine path resolved"}
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
// Brain state panel (right column)
// ============================================================================

function BrainStatePanel() {
  const identity = useBrainStore((s) => s.identity);
  const sources = useBrainStore((s) => s.memorySources);
  const engines = useBrainStore((s) => s.engines);
  const missionCount = useBrainStore((s) => s.missionCount);
  const demo = useBrainStore((s) => s.demo);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <SectionLabel
        eyebrow="03 · brain state"
        title={identity ? identity.name : "No brain yet"}
        sub={
          identity
            ? `${identity.mode} · ${sources.length} source${sources.length === 1 ? "" : "s"} · ${engines.length} engine${engines.length === 1 ? "" : "s"}`
            : "Bootstrap a brain to populate this column."
        }
      />

      {demo && (
        <div className="rounded-md border border-accent/25 bg-accent/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
          demo data · clearly labelled
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Stat label="missions" value={String(missionCount)} />
        <Stat label="sources" value={String(sources.length)} />
        <Stat label="engines" value={String(engines.length)} />
        <Stat label="vault" value={demo ? "1" : "0"} />
      </div>

      <div>
        <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
          active memory
        </div>
        {sources.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 bg-white/[0.008] px-3 py-2 text-[11px] text-white/45">
            No memory connected.
          </div>
        ) : (
          <ul className="flex flex-col gap-1 text-[11.5px]">
            {sources.slice(0, 4).map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1"
              >
                <span className="flex items-center gap-1.5 text-white/85">
                  <Database className="h-3 w-3 text-accent" />
                  {s.label}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
                  {s.state}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
          engines
        </div>
        {engines.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 bg-white/[0.008] px-3 py-2 text-[11px] text-white/45">
            No engine selected.
          </div>
        ) : (
          <ul className="flex flex-col gap-1 text-[11.5px]">
            {engines.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1"
              >
                <span className="flex items-center gap-1.5 text-white/85">
                  <Cpu className="h-3 w-3 text-accent" />
                  {e.label}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
                  {e.state}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// Mission timeline (bottom-left)
// ============================================================================

function MissionTimeline({ mission }: { mission: ReturnType<typeof useMissionStore.getState>["current"] }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.018] p-4">
      <SectionLabel
        eyebrow="04 · mission timeline"
        title="Live log"
        sub="Every stage event lands here, oldest first. Nothing is logged that didn't happen."
      />
      <div className="rounded-xl border border-white/8 bg-black/30 p-3">
        {!mission ? (
          <ul className="flex flex-col gap-1 font-mono text-[10.5px] text-white/55">
            <LogLine kind="info" tag="boot" message="PromptReady OS shell ready" />
            <LogLine kind="info" tag="route" message="Local-first · Ollama probe deferred until first mission" />
            <LogLine kind="info" tag="brain" message="Brain identity loaded from local store" />
            <LogLine kind="info" tag="safety" message="Screen armed" />
          </ul>
        ) : (
          <ul className="flex max-h-[260px] flex-col gap-1 overflow-auto font-mono text-[10.5px]">
            {mission.events.map((e, i) => (
              <LogLine key={i} kind={e.kind} tag={e.tag} message={e.message} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// Deliverables
// ============================================================================

function DeliverablesPanel({ mission }: { mission: ReturnType<typeof useMissionStore.getState>["current"] }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <SectionLabel
        eyebrow="05 · deliverables"
        title="Mission Output"
        sub="Ten named deliverables generated per run. Cursor Task · Claude Prompt · Linear Issue · Terminal Safe Command · and more."
      />

      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.012] p-4 text-center">
        <FileText className="mx-auto h-5 w-5 text-white/35" />
        <p className="mt-1 text-[12px] text-white/75">No deliverables yet.</p>
        <p className="mt-1 text-[10.5px] text-white/45">
          {mission
            ? "Pipeline halted before validation. When the engine ships, the right side fills with named formats."
            : "Dispatch a mission to populate this panel."}
        </p>
      </div>

      <MissionReceiptPanel mission={mission} />
    </section>
  );
}

function MissionReceiptPanel({
  mission
}: {
  mission: ReturnType<typeof useMissionStore.getState>["current"];
}) {
  return (
    <article className="rounded-xl border border-white/8 bg-white/[0.012] p-3">
      <header className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
          mission receipt
        </span>
        <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/45">
          {mission ? mission.stage : "no mission yet"}
        </span>
      </header>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {[
          ["mode", mission?.mode ?? "—"],
          ["quality", mission?.quality ?? "—"],
          ["runtime", mission?.runtime ?? "—"],
          ["events", mission ? String(mission.events.length) : "—"]
        ].map(([k, v]) => (
          <li key={k} className="flex items-center justify-between text-[10.5px]">
            <span className="font-mono uppercase tracking-wider text-white/35">{k}</span>
            <span className="font-mono text-white/65">{v}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-end gap-1.5">
        <button
          type="button"
          disabled={!mission}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-white/45 disabled:cursor-not-allowed"
        >
          <Save className="h-3 w-3" /> Save receipt
        </button>
        <button
          type="button"
          disabled={!mission}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-white/45 disabled:cursor-not-allowed"
        >
          <ArrowRight className="h-3 w-3" /> Open in Library
        </button>
      </div>
    </article>
  );
}

// ============================================================================
// Archive jump (bottom-right)
// ============================================================================

function ArchivePanel({
  history
}: {
  history: ReturnType<typeof useMissionStore.getState>["history"];
}) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.018] p-4">
      <SectionLabel
        eyebrow="06 · archive"
        title="Recent missions"
        sub="The Library page holds every receipt. Quick jumps here for the last few."
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
                {m.stage}
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
  const tone = {
    ok: "text-emerald-300/80",
    info: "text-white/45",
    warn: "text-amber-300/80",
    err: "text-rose-300/80"
  }[kind];
  return (
    <li className="flex items-center gap-2">
      <span className={clsx("font-mono uppercase tracking-wider", tone)}>{kind}</span>
      <span className="rounded border border-white/10 bg-white/[0.03] px-1 py-px text-[9px] uppercase tracking-wider text-white/45">
        {tag}
      </span>
      <span className="text-white/65">{message}</span>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
        {label}
      </span>
      <span className="text-[14px] font-semibold text-white">{value}</span>
    </div>
  );
}

function RuntimeChip({ runtime }: { runtime: RuntimeStatus }) {
  const meta = {
    ready: { tone: "ok" as const, label: "engine ready", Icon: ShieldCheck },
    "waiting-for-engine": {
      tone: "warn" as const,
      label: "waiting for engine",
      Icon: Loader
    },
    "local-mode": { tone: "warn" as const, label: "local mode", Icon: Cpu },
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
