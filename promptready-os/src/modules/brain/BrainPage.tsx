"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Activity,
  BookOpen,
  Brain,
  Cpu,
  Database,
  Folder,
  Github,
  HardDrive,
  Package,
  Pencil,
  Plus,
  RefreshCcw,
  Sparkles
} from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";
import { BrainGraph } from "@/components/BrainGraph";
import { AutoConfigure } from "@/components/AutoConfigure";
import {
  useBrainStore,
  MEMORY_OPTIONS,
  type MemorySourceKind,
  type EngineKind
} from "@/store/brain";

/**
 * Brain dashboard · Phase 12.
 *
 * Top: identity card (name · mode · created · demo badge if applicable).
 * Stats: missions · sources · engines · vault · packs · last activity.
 * Sources: real cards from the store with state pills.
 * Engines: cards with active/configured state.
 * Knowledge packs: curated bundles (still planned).
 * Reset / re-bootstrap controls at the bottom.
 */

const SOURCE_ICON: Record<MemorySourceKind, typeof BookOpen> = {
  "brain-notes": Activity,
  obsidian: BookOpen,
  github: Github,
  drive: HardDrive,
  "local-folder": Folder
};

const KNOWLEDGE_PACKS = [
  {
    name: "Operator handbook",
    blurb: "Curated prompt anatomy, mode taxonomy, deliverable specs.",
    state: "manual" as const
  },
  {
    name: "Engineering tactics",
    blurb: "Debugging heuristics · code review checklists · safe shell recipes.",
    state: "coming-soon" as const
  }
];

export default function BrainPage() {
  const identity = useBrainStore((s) => s.identity);
  const sources = useBrainStore((s) => s.memorySources);
  const engines = useBrainStore((s) => s.engines);
  const missionCount = useBrainStore((s) => s.missionCount);
  const vaultCount = useBrainStore((s) => s.vaultCount);
  const knowledgePacks = useBrainStore((s) => s.knowledgePacks);
  const lastActivity = useBrainStore((s) => s.lastActivity);
  const demo = useBrainStore((s) => s.demo);
  const removeMemorySource = useBrainStore((s) => s.removeMemorySource);
  const addMemorySource = useBrainStore((s) => s.addMemorySource);
  const enableEngine = useBrainStore((s) => s.enableEngine);
  const reset = useBrainStore((s) => s.reset);

  const [addingSource, setAddingSource] = useState(false);

  const availableSourceKinds = MEMORY_OPTIONS.filter(
    (m) => !sources.some((s) => s.kind === m.value)
  );
  const availableEngines: EngineKind[] = (
    ["deterministic", "ollama", "cloud"] as EngineKind[]
  ).filter((k) => !engines.some((e) => e.kind === k));

  return (
    <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="brain · build your own ai brain"
        title="Brain"
        sub="Identity, memory, engines, and activity for this brain. Everything is local · revocable · honest."
        right={
          <button
            type="button"
            onClick={reset}
            className="no-drag inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06]"
          >
            <RefreshCcw className="h-3 w-3" />
            re-bootstrap brain
          </button>
        }
      />

      {/* =========================== Identity card =========================== */}
      <section
        className={clsx(
          "flex flex-col gap-4 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between",
          demo
            ? "border-accent/30 bg-accent/[0.04] shadow-glow"
            : "border-white/8 bg-white/[0.02]"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/30 shadow-glow">
            <Brain className="h-5 w-5 text-accent" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
              brain identity
            </span>
            <span className="text-xl font-semibold text-white">
              {identity?.name ?? "No brain yet"}
            </span>
            <span className="text-[11.5px] text-white/55">
              {identity ? (
                <>
                  Mode · <span className="text-white">{identity.mode}</span> · created{" "}
                  {new Date(identity.createdAt).toLocaleString()}
                </>
              ) : (
                "Bootstrap a brain from the welcome flow to fill this card."
              )}
            </span>
          </div>
        </div>
        {demo && (
          <div className="flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
            <Sparkles className="h-3 w-3" />
            demo data · labelled · safe to reset
          </div>
        )}
      </section>

      {/* =============================== Stats =============================== */}
      <section className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="missions" value={String(missionCount)} />
        <Stat label="active memories" value={String(sources.length)} />
        <Stat label="engines" value={String(engines.length)} />
        <Stat label="vaults" value={String(vaultCount)} />
        <Stat label="packs" value={String(knowledgePacks)} />
        <Stat
          label="last activity"
          value={lastActivity ? relativeTime(lastActivity) : "never"}
        />
      </section>

      {/* ============================= Sources =============================== */}
      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-white">Memory sources</h2>
          {availableSourceKinds.length > 0 && (
            <button
              type="button"
              onClick={() => setAddingSource((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
            >
              <Plus className="h-3 w-3" /> add source
            </button>
          )}
        </header>

        {addingSource && availableSourceKinds.length > 0 && (
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-accent/25 bg-accent/[0.04] p-3 md:grid-cols-2 lg:grid-cols-3">
            {availableSourceKinds.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  addMemorySource({
                    kind: m.value,
                    label: m.label,
                    state: m.state
                  });
                  setAddingSource(false);
                }}
                className="flex flex-col items-start gap-0.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-left hover:bg-white/[0.08]"
              >
                <span className="text-[12px] font-semibold text-white">{m.label}</span>
                <span className="text-[10.5px] text-white/55">{m.blurb}</span>
              </button>
            ))}
          </div>
        )}

        {sources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.008] p-5 text-center">
            <p className="text-[12px] text-white/75">No memory connected.</p>
            <p className="mt-1 text-[10.5px] text-white/45">
              Add a source above to give the brain something to draw from.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sources.map((s) => {
              const Icon = SOURCE_ICON[s.kind];
              return (
                <article
                  key={s.id}
                  className="flex items-start justify-between gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3"
                >
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-3.5 w-3.5 text-accent" />
                    <div className="flex flex-col">
                      <span className="text-[12.5px] font-semibold text-white">
                        {s.label}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
                        {s.state}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMemorySource(s.id)}
                    className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55 hover:bg-white/[0.06]"
                  >
                    remove
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ============================== Engines ============================== */}
      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-white">Connected engines</h2>
          {availableEngines.length > 0 && (
            <div className="flex items-center gap-1">
              {availableEngines.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => enableEngine(k)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
                >
                  <Plus className="h-3 w-3" /> {k}
                </button>
              ))}
            </div>
          )}
        </header>
        {engines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.008] p-5 text-center">
            <p className="text-[12px] text-white/75">No engine selected.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {engines.map((e) => (
              <article
                key={e.id}
                className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[12.5px] font-semibold text-white">
                    {e.label}
                  </span>
                </div>
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
                  {e.state}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* =========================== Knowledge packs ========================= */}
      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-white">Knowledge packs</h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
            curated · pinned · versioned
          </span>
        </header>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {KNOWLEDGE_PACKS.map((p) => (
            <article
              key={p.name}
              className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-white/[0.02] p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-accent" />
                  <span className="text-[12.5px] font-semibold text-white">
                    {p.name}
                  </span>
                </div>
                <span
                  className={clsx(
                    "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                    p.state === "manual"
                      ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
                      : "border-white/10 bg-white/[0.03] text-white/55"
                  )}
                >
                  {p.state === "manual" ? "manual" : "planned"}
                </span>
              </div>
              <p className="text-[11px] text-white/55">{p.blurb}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ============================ Brain Graph ============================ */}
      <section className="rounded-2xl border border-white/8 bg-white/[0.018] p-4 shadow-glass">
        <header className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-accent" />
            <span className="text-[13px] font-semibold text-white">Brain Graph</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
            real state · click a node for detail
          </span>
        </header>
        <BrainGraph />
        <p className="mx-auto mt-3 max-w-[60ch] text-center text-[11px] text-white/45">
          Edges only draw to nodes the brain actually knows about. Counts
          are live. The brain wakes as you connect sources, dispatch
          missions, and pin watch cards. {!identity && "Bootstrap a brain to see it light up."}
          {!identity && <Pencil className="ml-1 inline h-3 w-3 text-white/45" />}
        </p>
      </section>

      {/* ============================ Auto setup ============================ */}
      <AutoConfigure />

    </div>
  );
}

// ----------------------------------------------------------------------------

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/8 bg-white/[0.012] px-3 py-2">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/40">
        {label}
      </span>
      <span className="text-[15px] font-semibold text-white">{value}</span>
    </div>
  );
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
