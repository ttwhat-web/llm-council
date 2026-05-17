"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Rocket,
  Save,
  ShieldCheck,
  Sparkles,
  Zap
} from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";

/**
 * Mission Control — the centerpiece of PromptReady OS.
 *
 * Three-zone HUD: Mission Brief (input) → Operations Pipeline (live
 * telemetry, model routing, mission log) → Deliverables console.
 *
 * Phase 11 scope: the surface renders fully and accepts a mission
 * brief, but until the desktop runtime is wired to the prompt-fixer
 * pipeline behind it, the Dispatch button shows an honest "engine
 * not connected" state rather than faking a run. No animated fake
 * telemetry.
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
  const [dispatched, setDispatched] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="mission control · operator console"
        title="Mission Brief"
        sub="Paste anything — a messy prompt, a stack trace, a brief. Dispatch routes it through the local pipeline; deliverables ship on the right."
        right={
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/45">
            <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">
              ⌘K · command palette
            </span>
            <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">
              ⌘↵ · dispatch
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)_minmax(0,360px)]">
        {/* ============================ Brief ============================ */}
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
                <option key={m} value={m}>{m}</option>
              ))}
            </SelectField>
            <SelectField label="Quality" value={quality} onChange={(v) => setQuality(v as (typeof QUALITY_OPTIONS)[number])}>
              {QUALITY_OPTIONS.map((q) => (
                <option key={q} value={q}>{q}</option>
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
                  onClick={() => setBrief((prev) => (prev ? prev + "\n\n" : "") + b.seed)}
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
            <button
              type="button"
              onClick={() => setDispatched((v) => !v)}
              disabled={!brief.trim()}
              className={clsx(
                "no-drag inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
                dispatched
                  ? "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/40 hover:bg-emerald-500/20"
                  : "bg-accent/90 text-white shadow-glow hover:bg-accent"
              )}
            >
              {dispatched ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Mission queued · awaiting engine
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Dispatch Mission
                </>
              )}
            </button>
            <p className="text-[10.5px] text-white/40">
              Engine not connected in this preview shell. When wired, dispatch
              routes through the operator.center pipeline and streams real
              telemetry into the panel on the right.
            </p>
          </div>
        </section>

        {/* ====================== Operations Pipeline ===================== */}
        <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.018] p-4 shadow-glass">
          <SectionLabel
            eyebrow="02 · operations pipeline"
            title="Live telemetry"
            sub="Six typed stages stream real events when a mission runs. Idle today — no fake activity."
          />

          <div className="rounded-xl border border-white/8 bg-white/[0.012] p-3">
            <div className="flex items-center justify-between pb-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                pipeline
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
                idle · engine offline
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 md:grid-cols-8">
              {["INPUT", "CLEAN", "INTENT", "STRUCTURE", "CONSTRAINTS", "GENERATE", "VALIDATE", "OUTPUT"].map(
                (s) => (
                  <StageChip key={s} label={s} />
                )
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-black/30 p-3">
            <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              <span>mission log</span>
              <span className="text-white/30">awaiting dispatch</span>
            </div>
            <ul className="flex flex-col gap-1 font-mono text-[10.5px] text-white/55">
              <LogLine kind="info" tag="boot" message="PromptReady OS shell ready" />
              <LogLine kind="info" tag="route" message="Local-first · Ollama probe deferred until first mission" />
              <LogLine kind="info" tag="brain" message="0 sources connected · manual notes only" />
              <LogLine kind="info" tag="safety" message="Screen armed" />
            </ul>
          </div>

          <ModelRouting mode={mode} quality={quality} />
        </section>

        {/* ============================ Deliverables ===================== */}
        <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <SectionLabel
            eyebrow="03 · deliverables"
            title="Mission Output"
            sub="Ten named deliverables generated per run — Cursor Task · Claude Prompt · Linear Issue · Terminal Safe Command · and more."
          />

          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.012] p-5 text-center">
            <p className="text-[12px] text-white/75">No deliverables yet.</p>
            <p className="mt-1 text-[11px] text-white/45">
              Dispatch a mission to populate this panel. Outputs render as
              named formats and save to the Operations Archive.
            </p>
          </div>

          <MissionReceiptPanel />

          <div className="flex flex-wrap gap-1.5">
            {[
              "Cursor Task",
              "Claude Prompt",
              "ChatGPT Prompt",
              "Linear Issue",
              "GitHub Issue",
              "Terminal Safe"
            ].map((f) => (
              <span
                key={f}
                className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-white/60"
              >
                {f}
              </span>
            ))}
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-white/40">
              + 4 more
            </span>
          </div>
        </section>
      </div>
    </div>
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
        className="no-drag rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 font-sans text-[12px] uppercase-none normal-case text-white focus:border-accent/40 focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function StageChip({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg p-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
      <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-white/30">
        {label}
      </span>
    </div>
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

function ModelRouting({ mode, quality }: { mode: string; quality: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.012] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          model routing
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
          static · awaiting first run
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10.5px]">
        <Cell Icon={Activity} label="mode" value={mode} mono />
        <Cell Icon={Zap} label="quality" value={quality} mono />
        <Cell Icon={Cpu} label="local" value="ollama · probe-on-run" mono />
        <Cell Icon={ShieldCheck} label="cloud" value="provider keys absent" mono tone="muted" />
      </div>
    </div>
  );
}

function Cell({
  Icon,
  label,
  value,
  mono,
  tone
}: {
  Icon: typeof Activity;
  label: string;
  value: string;
  mono?: boolean;
  tone?: "ok" | "warn" | "muted";
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-white/6 bg-white/[0.012] px-2 py-1.5">
      <Icon className="h-3 w-3 text-white/45" />
      <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">{label}</span>
      <span
        className={clsx(
          "ml-auto truncate text-[11px]",
          mono && "font-mono",
          tone === "muted" ? "text-white/50" : "text-white/85"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function MissionReceiptPanel() {
  return (
    <article className="rounded-xl border border-white/8 bg-white/[0.012] p-3">
      <header className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
          mission receipt
        </span>
        <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/45">
          no mission yet
        </span>
      </header>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {[
          ["mode", "—"],
          ["route", "—"],
          ["latency", "—"],
          ["score", "—"]
        ].map(([k, v]) => (
          <li key={k} className="flex items-center justify-between text-[10.5px]">
            <span className="font-mono uppercase tracking-wider text-white/35">{k}</span>
            <span className="font-mono text-white/45">{v}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-end gap-1.5">
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-white/45"
        >
          <Save className="h-3 w-3" /> Save receipt
        </button>
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-white/45"
        >
          <ArrowRight className="h-3 w-3" /> Open in Library
        </button>
      </div>
    </article>
  );
}

