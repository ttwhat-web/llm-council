"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  BookOpen,
  Brain,
  Cpu,
  Database,
  FileText,
  Folder,
  Github,
  HardDrive,
  Mail,
  Package
} from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";

/**
 * Brain layer · Phase D.
 *
 * The "Build your own AI Brain" surface. Three zones:
 *
 *   1. Brain status — single ring showing connected sources, indexed
 *      docs, and last sync. Honestly zero today.
 *   2. Memory sources — Obsidian / GitHub / Gmail / Drive / Local /
 *      Knowledge packs / Connected models. Each card is honest about
 *      its connector state.
 *   3. Knowledge graph — placeholder grid that says "no facts yet".
 */

type ConnectorState = "not connected" | "coming soon" | "manual";

interface SourceCard {
  name: string;
  blurb: string;
  Icon: typeof Folder;
  state: ConnectorState;
  cta: string;
}

const SOURCES: SourceCard[] = [
  {
    name: "Obsidian vault",
    blurb: "Index a folder of markdown notes. Read-only · two-way sync optional later.",
    Icon: BookOpen,
    state: "coming soon",
    cta: "Pick vault folder"
  },
  {
    name: "GitHub repos",
    blurb: "Index issues, PRs, and READMEs across the repos you select.",
    Icon: Github,
    state: "not connected",
    cta: "Connect GitHub"
  },
  {
    name: "Gmail",
    blurb: "Read-only summaries of new threads · classified by intent · never sent.",
    Icon: Mail,
    state: "coming soon",
    cta: "Connect Gmail"
  },
  {
    name: "Google Drive",
    blurb: "Index docs and sheets in a chosen folder. Local OCR for PDFs.",
    Icon: HardDrive,
    state: "coming soon",
    cta: "Connect Drive"
  },
  {
    name: "Local folders",
    blurb: "Point at any directory of text / md / pdf / code. Indexes on-device first.",
    Icon: Folder,
    state: "coming soon",
    cta: "Add folder"
  }
];

const KNOWLEDGE_PACKS: SourceCard[] = [
  {
    name: "Operator handbook",
    blurb: "Curated prompt anatomy, mode taxonomy, deliverable specs.",
    Icon: Package,
    state: "manual",
    cta: "Browse pack"
  },
  {
    name: "Engineering tactics",
    blurb: "Debugging heuristics · code review checklists · safe shell recipes.",
    Icon: Package,
    state: "coming soon",
    cta: "Install pack"
  }
];

const MODELS: Array<{ name: string; via: string; state: ConnectorState }> = [
  { name: "Local · Ollama", via: "http://localhost:11434", state: "not connected" },
  { name: "Anthropic · Claude", via: "BYOK", state: "not connected" },
  { name: "OpenAI · GPT", via: "BYOK", state: "not connected" },
  { name: "Google · Gemini", via: "BYOK", state: "not connected" }
];

export default function BrainPage() {
  const [pulse, setPulse] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="brain · build your own ai brain"
        title="Brain"
        sub="Connect what should inform every mission. Local-first · opt-in cloud. Connectors below are honest about whether they're wired today."
        right={
          <button
            type="button"
            onClick={() => setPulse(true)}
            className="no-drag rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06]"
          >
            {pulse ? "ping · no sources" : "ping brain"}
          </button>
        }
      />

      {/* ============================== Status ============================== */}
      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="sources connected" value="0" />
          <Stat label="documents indexed" value="0" />
          <Stat label="brain notes" value="manual" />
          <Stat label="last sync" value="never" />
        </div>
      </section>

      {/* =========================== Memory sources ========================== */}
      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-white">
            Memory sources
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
            opt-in · local-first · revocable
          </span>
        </header>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {SOURCES.map((s) => (
            <SourceTile key={s.name} card={s} />
          ))}
        </div>
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
          {KNOWLEDGE_PACKS.map((s) => (
            <SourceTile key={s.name} card={s} />
          ))}
        </div>
      </section>

      {/* =========================== Connected models ======================== */}
      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-white">Connected models</h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
            routes resolved at dispatch
          </span>
        </header>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {MODELS.map((m) => (
            <article
              key={m.name}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.018] px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-accent" />
                <div className="flex flex-col">
                  <span className="text-[12.5px] font-medium text-white">{m.name}</span>
                  <span className="font-mono text-[10px] text-white/45">{m.via}</span>
                </div>
              </div>
              <StatePill state={m.state} />
            </article>
          ))}
        </div>
      </section>

      {/* ============================ Graph block ============================ */}
      <section className="rounded-2xl border border-white/8 bg-white/[0.018] p-4">
        <header className="mb-2 flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-accent" />
          <span className="text-[13px] font-semibold text-white">Knowledge graph</span>
        </header>
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.008] px-5 py-10 text-center">
          <Brain className="mx-auto h-6 w-6 text-white/35" />
          <p className="mt-2 text-[12px] text-white/75">No facts in the brain yet.</p>
          <p className="mt-1 text-[11px] text-white/45">
            Connect a source above or capture a Brain Note under Memory. The
            graph fills in as the brain learns who you are and what you work on.
          </p>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// Atoms
// ============================================================================

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

function SourceTile({ card }: { card: SourceCard }) {
  const { Icon } = card;
  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-accent" />
          <span className="text-[13px] font-semibold text-white">{card.name}</span>
        </div>
        <StatePill state={card.state} />
      </header>
      <p className="text-[11.5px] text-white/55">{card.blurb}</p>
      <button
        type="button"
        disabled
        className="mt-1 inline-flex cursor-not-allowed items-center gap-1 self-start rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-white/45"
      >
        <FileText className="h-3 w-3" /> {card.cta}
      </button>
    </article>
  );
}

function StatePill({ state }: { state: ConnectorState }) {
  const cls = {
    "not connected": "border-white/10 bg-white/[0.03] text-white/55",
    "coming soon": "border-amber-400/25 bg-amber-500/[0.05] text-amber-200/80",
    manual: "border-emerald-400/25 bg-emerald-500/[0.05] text-emerald-200/80"
  }[state];
  return (
    <span
      className={clsx(
        "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
        cls
      )}
    >
      {state}
    </span>
  );
}

