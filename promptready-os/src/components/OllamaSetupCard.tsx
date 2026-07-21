"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Cpu, Loader2, Check, Copy } from "lucide-react";
import { probeOllama } from "@/services/missionRunner";

/**
 * Ollama Setup · Sprint M.
 *
 * Honest local-engine setup guide. Probes the local Ollama daemon and
 * shows which suggested models are installed vs missing, with copyable
 * `ollama pull` commands. No fake availability — everything reflects a
 * real probe of localhost:11434.
 */

const SUGGESTED = [
  { tag: "gemma2:2b", note: "fast · light · good default" },
  { tag: "qwen2.5-coder:7b", note: "code missions" },
  { tag: "llama3.1:8b", note: "general reasoning" }
];

const STEPS: Array<{ n: number; label: string; cmd?: string }> = [
  { n: 1, label: "Install Ollama", cmd: "curl -fsSL https://ollama.com/install.sh | sh" },
  { n: 2, label: "Start the daemon", cmd: "ollama serve" },
  { n: 3, label: "Pull a starter model", cmd: "ollama pull gemma2:2b" },
  { n: 4, label: "Open Operator Core (this app)" },
  { n: 5, label: "Settings → Intelligence → Model Lab → probe" },
  { n: 6, label: "Run a test mission to confirm" }
];

export function OllamaSetupCard() {
  const [probing, setProbing] = useState(true);
  const [reachable, setReachable] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const probe = () => {
    setProbing(true);
    void probeOllama()
      .then((r) => {
        setReachable(r.reachable);
        setModels(r.models);
      })
      .catch(() => {
        setReachable(false);
        setModels([]);
      })
      .finally(() => setProbing(false));
  };

  useEffect(() => {
    let alive = true;
    setProbing(true);
    void probeOllama()
      .then((r) => {
        if (!alive) return;
        setReachable(r.reachable);
        setModels(r.models);
      })
      .catch(() => alive && setReachable(false))
      .finally(() => alive && setProbing(false));
    return () => {
      alive = false;
    };
  }, []);

  const copy = (cmd: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(cmd);
      setCopied(cmd);
      window.setTimeout(() => setCopied(null), 1500);
    }
  };

  const has = (tag: string) => models.some((m) => m.toLowerCase().startsWith(tag.split(":")[0].toLowerCase()));

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Ollama Setup</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
              probing
                ? "border-white/10 bg-white/[0.03] text-white/55"
                : reachable
                  ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
                  : "border-white/10 bg-white/[0.03] text-white/55"
            )}
          >
            {probing && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
            {probing ? "probing…" : reachable ? "reachable" : "offline"}
          </span>
          <button
            type="button"
            onClick={probe}
            className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
          >
            re-probe
          </button>
        </div>
      </header>

      <p className="text-[11px] text-white/55">
        Optional local engine. Operator Core works offline on the deterministic
        engine; Ollama adds local LLM missions with zero cloud cost.
      </p>

      {/* steps */}
      <ol className="flex flex-col gap-1">
        {STEPS.map((s) => (
          <li key={s.n} className="flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/10 font-mono text-[10px] text-white/55">
              {s.n}
            </span>
            <span className="flex-1 text-[11.5px] text-white/80">{s.label}</span>
            {s.cmd && (
              <button
                type="button"
                onClick={() => copy(s.cmd!)}
                className="inline-flex items-center gap-1 rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[9.5px] text-accent hover:bg-black/60"
                title="Copy command"
              >
                {copied === s.cmd ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {s.cmd}
              </button>
            )}
          </li>
        ))}
      </ol>

      {/* models */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
          suggested models {reachable ? `· ${models.length} installed` : "· probe to check"}
        </span>
        {SUGGESTED.map((m) => {
          const installed = reachable && has(m.tag);
          const cmd = `ollama pull ${m.tag}`;
          return (
            <div key={m.tag} className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5">
              <div className="flex min-w-0 flex-col">
                <span className="font-mono text-[11px] text-white">{m.tag}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">{m.note}</span>
              </div>
              {installed ? (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-400/30 bg-emerald-500/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-200">
                  <Check className="h-3 w-3" /> installed
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => copy(cmd)}
                  className="inline-flex items-center gap-1 rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[9.5px] text-accent hover:bg-black/60"
                  title="Copy pull command"
                >
                  {copied === cmd ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  pull
                </button>
              )}
            </div>
          );
        })}
        {reachable && models.length > 0 && (
          <p className="font-mono text-[9px] uppercase tracking-wider text-white/35">
            detected: {models.slice(0, 8).join(" · ")}
          </p>
        )}
      </div>
    </section>
  );
}
