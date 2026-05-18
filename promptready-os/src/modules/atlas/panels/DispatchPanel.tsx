"use client";

import { useState } from "react";
import { Rocket, X } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";

const MODES = ["auto", "claude", "chatgpt", "cursor", "gemini", "dev", "terminal", "business", "general"] as const;
const QUALITIES = ["fast", "smart", "expert", "code", "local"] as const;

/**
 * Inline mission dispatch · used inside the Atlas Mission System
 * detail. Submits to the real mission store; no leaving Atlas.
 */

export function DispatchPanel({ onClose }: { onClose: () => void }) {
  const dispatch = useMissionStore((s) => s.dispatch);
  const sources = useBrainStore((s) => s.memorySources);
  const githubLabel = sources.find((s) => s.kind === "github")?.label;
  const [brief, setBrief] = useState("");
  const [mode, setMode] = useState<(typeof MODES)[number]>("auto");
  const [quality, setQuality] = useState<(typeof QUALITIES)[number]>("fast");
  const [repoContext, setRepoContext] = useState(githubLabel ?? "");
  const [useMemory, setUseMemory] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!brief.trim() || submitting) return;
    setSubmitting(true);
    await dispatch(
      useMemory ? brief : brief + "\n\n(memory scan disabled by operator)",
      mode,
      quality,
      repoContext.trim() || null
    );
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="flex flex-col gap-2">
      <header className="flex items-center justify-between">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
          dispatch mission · inline
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-white/55 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      </header>

      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="Brief · paste a messy prompt, error log, or describe what you need"
        rows={5}
        spellCheck={false}
        className="no-drag w-full resize-y rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white/90 placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
      />

      <div className="grid grid-cols-2 gap-2">
        <Select label="Mode" value={mode} onChange={(v) => setMode(v as (typeof MODES)[number])}>
          {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Select label="Quality" value={quality} onChange={(v) => setQuality(v as (typeof QUALITIES)[number])}>
          {QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
        </Select>
      </div>

      <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
        Repo context
        <input
          type="text"
          value={repoContext}
          onChange={(e) => setRepoContext(e.target.value)}
          placeholder="owner/repo or full URL · optional"
          className="rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 font-sans text-[12px] normal-case text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
      </label>

      <label className="inline-flex items-center gap-2 text-[11px] text-white/75">
        <input
          type="checkbox"
          checked={useMemory}
          onChange={(e) => setUseMemory(e.target.checked)}
          className="accent-current"
        />
        Scan brain memory ({sources.length} source{sources.length === 1 ? "" : "s"})
      </label>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!brief.trim() || submitting}
        className="no-drag inline-flex items-center justify-center gap-1.5 rounded-md bg-accent/90 px-3 py-2 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Rocket className="h-3.5 w-3.5" />
        {submitting ? "Dispatching…" : "Dispatch from Atlas"}
      </button>
      <p className="text-[10px] text-white/40">
        Mission runs in-place. Timeline + receipt + Mission node pulse all update on this page.
      </p>
    </div>
  );
}

function Select({
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
