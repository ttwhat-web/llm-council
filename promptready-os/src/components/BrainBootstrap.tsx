"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  ArrowRight,
  Brain,
  Check,
  Cpu,
  Database,
  Sparkles
} from "lucide-react";
import {
  useBrainStore,
  BRAIN_NAMES,
  BRAIN_MODE_OPTIONS,
  MEMORY_OPTIONS,
  ENGINE_OPTIONS,
  type BrainMode,
  type MemorySourceKind,
  type EngineKind
} from "@/store/brain";

/**
 * First-launch bootstrap.
 *
 * Five steps:
 *   1. Choose brain name (preset or custom)
 *   2. Select mode
 *   3. Connect memory sources (multi-select)
 *   4. Choose engines (multi-select · deterministic always on)
 *   5. Create
 *
 * Plus a permanent "Try demo Brain · Atlas / Builder" shortcut.
 *
 * Renders as a full-screen overlay only when `bootstrapped === false`.
 * Once a brain exists, the component returns null and the shell stays
 * the only thing on screen.
 */

const STEPS = ["Identity", "Mode", "Memory", "Engines", "Create"] as const;

export function BrainBootstrap() {
  const bootstrapped = useBrainStore((s) => s.bootstrapped);
  const bootstrap = useBrainStore((s) => s.bootstrap);
  const enableDemo = useBrainStore((s) => s.enableDemo);

  const [step, setStep] = useState(0);
  const [namePreset, setNamePreset] = useState<string>("Atlas");
  const [customName, setCustomName] = useState("");
  const [mode, setMode] = useState<BrainMode>("builder");
  const [sources, setSources] = useState<MemorySourceKind[]>(["brain-notes"]);
  const [engines, setEngines] = useState<EngineKind[]>(["deterministic"]);

  if (bootstrapped) return null;

  const finalName = namePreset === "custom" ? customName.trim() : namePreset;
  const canCreate = finalName.length > 0 && engines.length > 0;

  const onCreate = () => {
    if (!canCreate) return;
    bootstrap({ name: finalName, mode, sources, engines });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-graphite-950/95 backdrop-blur">
      <div className="relative flex w-full max-w-[760px] flex-col gap-5 rounded-3xl border border-white/8 bg-white/[0.018] p-7 shadow-glass">
        <header className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
            promptready os · first launch
          </span>
          <h2 className="text-2xl font-semibold text-white">
            Build your own AI Brain.
          </h2>
          <p className="max-w-[60ch] text-[12.5px] text-white/55">
            Five short choices. Everything you pick stays on this machine.
            You can change every answer later from the Brain page.
          </p>
        </header>

        <Stepper step={step} />

        <section className="min-h-[230px] rounded-2xl border border-white/8 bg-white/[0.012] p-5">
          {step === 0 && (
            <IdentityStep
              namePreset={namePreset}
              customName={customName}
              onPreset={setNamePreset}
              onCustom={setCustomName}
            />
          )}
          {step === 1 && <ModeStep mode={mode} onChange={setMode} />}
          {step === 2 && (
            <MemoryStep sources={sources} onChange={setSources} />
          )}
          {step === 3 && <EngineStep engines={engines} onChange={setEngines} />}
          {step === 4 && (
            <CreateStep
              name={finalName}
              mode={mode}
              sources={sources}
              engines={engines}
            />
          )}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={enableDemo}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] font-medium text-white/70 transition hover:bg-white/[0.06]"
          >
            <Sparkles className="h-3 w-3 text-accent" />
            Try demo Brain · Atlas / Builder
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/75 transition hover:bg-white/[0.06]"
              >
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                disabled={step === 0 && !finalName}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ArrowRight className="h-3 w-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onCreate}
                disabled={!canCreate}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check className="h-3 w-3" />
                Create Brain
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]">
      {STEPS.map((s, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className={clsx(
                "flex h-5 min-w-5 items-center justify-center rounded-md border px-1.5",
                active
                  ? "border-accent/40 bg-accent/[0.1] text-accent"
                  : done
                    ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
                    : "border-white/10 bg-white/[0.03] text-white/45"
              )}
            >
              {done ? <Check className="h-2.5 w-2.5" /> : String(i + 1).padStart(2, "0")}
            </span>
            <span className={active ? "text-white" : "text-white/45"}>{s}</span>
            {i < STEPS.length - 1 && <span className="text-white/15">·</span>}
          </div>
        );
      })}
    </div>
  );
}

function StepHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <header className="mb-3 flex flex-col gap-0.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-accent">{eyebrow}</span>
      <h3 className="text-[15px] font-semibold text-white">{title}</h3>
      <p className="text-[11.5px] text-white/55">{sub}</p>
    </header>
  );
}

function IdentityStep({
  namePreset,
  customName,
  onPreset,
  onCustom
}: {
  namePreset: string;
  customName: string;
  onPreset: (v: string) => void;
  onCustom: (v: string) => void;
}) {
  return (
    <div>
      <StepHeading
        eyebrow="01 · identity"
        title="Name your brain."
        sub="A name makes the brain feel like a partner instead of an app. You can rename it later."
      />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[...BRAIN_NAMES, "custom"].map((n) => {
          const active = namePreset === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onPreset(n)}
              className={clsx(
                "flex items-center justify-center rounded-xl border px-3 py-2 text-[12.5px] font-semibold transition",
                active
                  ? "border-accent/40 bg-accent/[0.1] text-white shadow-glow"
                  : "border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06]"
              )}
            >
              {n === "custom" ? "Custom…" : n}
            </button>
          );
        })}
      </div>
      {namePreset === "custom" && (
        <div className="mt-3">
          <input
            type="text"
            value={customName}
            onChange={(e) => onCustom(e.target.value)}
            placeholder="What should your brain be called?"
            autoFocus
            className="w-full rounded-md border border-white/8 bg-white/[0.025] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

function ModeStep({ mode, onChange }: { mode: BrainMode; onChange: (m: BrainMode) => void }) {
  return (
    <div>
      <StepHeading
        eyebrow="02 · mode"
        title="What does this brain do most?"
        sub="The mode biases routing, deliverable shapes, and the order of suggestions."
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {BRAIN_MODE_OPTIONS.map((m) => {
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange(m.value)}
              className={clsx(
                "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition",
                active
                  ? "border-accent/40 bg-accent/[0.08] shadow-glow"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              )}
            >
              <span className="text-[13px] font-semibold text-white">{m.label}</span>
              <span className="text-[11px] text-white/55">{m.blurb}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MemoryStep({
  sources,
  onChange
}: {
  sources: MemorySourceKind[];
  onChange: (next: MemorySourceKind[]) => void;
}) {
  const toggle = (kind: MemorySourceKind) => {
    if (sources.includes(kind)) onChange(sources.filter((s) => s !== kind));
    else onChange([...sources, kind]);
  };
  return (
    <div>
      <StepHeading
        eyebrow="03 · memory"
        title="What should the brain remember?"
        sub="Sources you tick are scaffolded immediately and start indexing when the desktop runtime ships. Brain Notes always works."
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {MEMORY_OPTIONS.map((m) => {
          const active = sources.includes(m.value);
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => toggle(m.value)}
              className={clsx(
                "flex items-start gap-2 rounded-xl border px-3 py-2 text-left transition",
                active
                  ? "border-accent/40 bg-accent/[0.08] shadow-glow"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              )}
            >
              <Database
                className={clsx(
                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                  active ? "text-accent" : "text-white/45"
                )}
              />
              <div className="flex flex-col">
                <span className="text-[12.5px] font-semibold text-white">{m.label}</span>
                <span className="text-[11px] text-white/55">{m.blurb}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EngineStep({
  engines,
  onChange
}: {
  engines: EngineKind[];
  onChange: (next: EngineKind[]) => void;
}) {
  const toggle = (k: EngineKind) => {
    if (k === "deterministic") return;
    if (engines.includes(k)) onChange(engines.filter((e) => e !== k));
    else onChange([...engines, k]);
  };
  return (
    <div>
      <StepHeading
        eyebrow="04 · engines"
        title="Which engines may dispatch?"
        sub="Deterministic always runs. Tick Ollama for local models, Cloud for BYOK providers."
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {ENGINE_OPTIONS.map((e) => {
          const active = engines.includes(e.value);
          const locked = e.value === "deterministic";
          return (
            <button
              key={e.value}
              type="button"
              onClick={() => toggle(e.value)}
              disabled={locked}
              className={clsx(
                "flex flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left transition",
                active
                  ? "border-accent/40 bg-accent/[0.08] shadow-glow"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                locked && "cursor-default"
              )}
            >
              <div className="flex items-center gap-1.5">
                <Cpu
                  className={clsx(
                    "h-3.5 w-3.5",
                    active ? "text-accent" : "text-white/45"
                  )}
                />
                <span className="text-[12.5px] font-semibold text-white">{e.label}</span>
                {locked && (
                  <span className="rounded border border-emerald-400/30 bg-emerald-500/[0.08] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-emerald-200">
                    always on
                  </span>
                )}
              </div>
              <span className="text-[11px] text-white/55">{e.blurb}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CreateStep({
  name,
  mode,
  sources,
  engines
}: {
  name: string;
  mode: BrainMode;
  sources: MemorySourceKind[];
  engines: EngineKind[];
}) {
  return (
    <div>
      <StepHeading
        eyebrow="05 · review"
        title={`Create ${name || "your brain"}.`}
        sub="Everything below is saved locally and editable from the Brain page."
      />
      <dl className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Row icon={<Brain className="h-3.5 w-3.5 text-accent" />} label="Name" value={name || "—"} />
        <Row icon={<Sparkles className="h-3.5 w-3.5 text-accent" />} label="Mode" value={mode} />
        <Row
          icon={<Database className="h-3.5 w-3.5 text-accent" />}
          label="Memory"
          value={sources.length > 0 ? sources.join(" · ") : "none"}
        />
        <Row
          icon={<Cpu className="h-3.5 w-3.5 text-accent" />}
          label="Engines"
          value={engines.length > 0 ? engines.join(" · ") : "deterministic"}
        />
      </dl>
      <p className="mt-3 text-[11px] text-white/45">
        Local-first. Nothing leaves your machine unless you connect a cloud
        provider later. No account or API key is required.
      </p>
    </div>
  );
}

function Row({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-3 py-1.5">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/45">
        {icon}
        {label}
      </div>
      <div className="text-[12px] text-white">{value}</div>
    </div>
  );
}
