"use client";

import { useEffect, useState } from "react";
import { Copy, Cpu, Loader2, Rocket, X } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { probeOllama, type OllamaProbeResult } from "@/services/missionRunner";

const MODES = ["auto", "claude", "chatgpt", "cursor", "gemini", "dev", "terminal", "business", "general"] as const;
const QUALITIES = ["fast", "smart", "expert", "code", "local"] as const;
const SUGGESTED_OLLAMA_MODELS = ["gemma2:2b", "llama3.1:8b", "qwen2.5-coder:7b"] as const;

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
  const [engine, setEngine] = useState<"deterministic" | "ollama">("deterministic");
  const [ollamaModel, setOllamaModel] = useState<string>("gemma2:2b");
  const [probe, setProbe] = useState<OllamaProbeResult | null>(null);
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    if (engine !== "ollama" || probe) return;
    setProbing(true);
    void probeOllama().then((p) => {
      setProbe(p);
      if (p.models.length > 0 && !p.models.includes(ollamaModel)) {
        setOllamaModel(p.models[0]);
      }
      setProbing(false);
    });
  }, [engine, probe, ollamaModel]);

  const modelAvailable =
    engine !== "ollama" ||
    !probe ||
    probe.models.some((m) => m === ollamaModel || m.startsWith(`${ollamaModel}:`));

  const onSubmit = async () => {
    if (!brief.trim() || submitting) return;
    setSubmitting(true);
    await dispatch(
      useMemory ? brief : brief + "\n\n(memory scan disabled by operator)",
      mode,
      quality,
      repoContext.trim() || null,
      engine === "ollama" ? { engine: "ollama", ollamaModel } : undefined
    );
    setSubmitting(false);
    onClose();
  };

  const pullCommand = `ollama pull ${ollamaModel}`;
  const onCopyPull = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(pullCommand);
    }
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

      {/* Engine selector */}
      <div className="rounded-md border border-white/8 bg-white/[0.012] p-2">
        <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
          <span>engine</span>
          {probing && <Loader2 className="h-2.5 w-2.5 animate-spin text-accent" />}
        </div>
        <div className="flex items-center gap-1">
          <EngineChip on={engine === "deterministic"} onClick={() => setEngine("deterministic")}>
            deterministic
          </EngineChip>
          <EngineChip on={engine === "ollama"} onClick={() => setEngine("ollama")}>
            ollama
            {probe && (
              <span
                className={`ml-1 inline-block h-1 w-1 rounded-full ${
                  probe.reachable ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
            )}
          </EngineChip>
        </div>

        {engine === "ollama" && (
          <div className="mt-1.5 flex flex-col gap-1.5">
            <select
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              className="no-drag rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[11.5px] text-white focus:border-accent/40 focus:outline-none"
            >
              {(probe?.models.length ? probe.models : SUGGESTED_OLLAMA_MODELS).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              {!probe?.models.includes(ollamaModel) && probe?.models.length === 0 && (
                <option value={ollamaModel}>{ollamaModel}</option>
              )}
            </select>
            <input
              type="text"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              placeholder="custom model id"
              className="no-drag rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[11px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
            />
            {probe && !probe.reachable && (
              <p className="rounded-md border border-amber-400/25 bg-amber-500/[0.05] px-2 py-1 text-[10.5px] text-amber-200/85">
                Ollama not reachable at localhost:11434 · runner will fall back to deterministic.
              </p>
            )}
            {probe && probe.reachable && !modelAvailable && (
              <div className="rounded-md border border-amber-400/25 bg-amber-500/[0.05] p-2">
                <p className="text-[10.5px] text-amber-200/85">Model not installed.</p>
                <div className="mt-1 flex items-center gap-1">
                  <code className="flex-1 truncate rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10.5px] text-white">
                    {pullCommand}
                  </code>
                  <button
                    type="button"
                    onClick={onCopyPull}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
                  >
                    <Copy className="h-2.5 w-2.5" /> copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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

function EngineChip({
  on,
  onClick,
  children
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        on
          ? "inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/[0.1] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-accent"
          : "inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
      }
    >
      <Cpu className="h-2.5 w-2.5" />
      {children}
    </button>
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
