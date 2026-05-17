"use client";

import { useState } from "react";
import clsx from "clsx";
import { CheckCircle2, Cpu, Loader2, ShieldCheck, Wand2 } from "lucide-react";
import { useBrainStore } from "@/store/brain";

/**
 * Auto Configure Workspace · Phase 13.
 *
 * Single button that runs a small probe and applies sane defaults
 * without inventing successes. The probes are real:
 *
 *   · Ollama: fetch("http://localhost:11434/api/version") with a short
 *     timeout. Success → enable the ollama engine. Failure → leave it
 *     off and report "not connected".
 *   · Deterministic engine: always available, always enabled.
 *   · Cloud: never enabled here. Cloud is opt-in via Settings.
 *
 * Result panel lists the actual outcomes, never a fabricated success.
 */

interface ProbeResult {
  label: string;
  state: "ok" | "warn" | "muted" | "err";
  detail: string;
}

const OLLAMA_TIMEOUT_MS = 1500;

async function probeOllama(): Promise<ProbeResult> {
  const url = "http://localhost:11434/api/version";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!r.ok) return { label: "Ollama", state: "warn", detail: `unreachable · HTTP ${r.status}` };
    const j = (await r.json()) as { version?: string };
    return {
      label: "Ollama",
      state: "ok",
      detail: j.version ? `connected · v${j.version}` : "connected"
    };
  } catch {
    clearTimeout(timer);
    return {
      label: "Ollama",
      state: "muted",
      detail: "not reachable on localhost:11434"
    };
  }
}

export function AutoConfigure() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ProbeResult[]>([]);
  const enableEngine = useBrainStore((s) => s.enableEngine);
  const addMemorySource = useBrainStore((s) => s.addMemorySource);
  const sources = useBrainStore((s) => s.memorySources);

  const onRun = async () => {
    setRunning(true);
    setResults([]);
    const out: ProbeResult[] = [];

    // 1. deterministic — always-on
    enableEngine("deterministic");
    out.push({
      label: "Local engine",
      state: "ok",
      detail: "deterministic rules · always ready"
    });

    // 2. brain notes — manual source
    if (!sources.some((s) => s.kind === "brain-notes")) {
      addMemorySource({ kind: "brain-notes", label: "Brain Notes", state: "manual" });
    }
    out.push({
      label: "Memory",
      state: "ok",
      detail: "Brain Notes source enabled (local)"
    });

    // 3. receipts — controlled by mission store, always on
    out.push({
      label: "Receipts",
      state: "ok",
      detail: "every dispatch lands in Operations Archive"
    });

    // 4. ollama probe
    const ollama = await probeOllama();
    out.push(ollama);
    if (ollama.state === "ok") enableEngine("ollama");

    // 5. cloud — honestly off
    out.push({
      label: "Cloud",
      state: "muted",
      detail: "not configured · add provider keys under Settings"
    });

    // 6. terminal feeds — honest
    out.push({
      label: "Intelligence Terminal",
      state: "muted",
      detail: "offline until you add sources"
    });

    setResults(out);
    setRunning(false);
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-accent/25 bg-accent/[0.04] p-4 shadow-glow">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-accent" />
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-white">Auto-configure workspace</span>
            <span className="text-[11px] text-white/55">
              Probes real engines, sets honest defaults, never reports a success that didn't happen.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="no-drag inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {running ? "Probing…" : "Run"}
        </button>
      </header>

      {results.length > 0 && (
        <ul className="flex flex-col gap-1">
          {results.map((r) => (
            <li
              key={r.label}
              className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5"
            >
              <div className="flex items-center gap-2">
                <StatePill state={r.state} />
                <span className="text-[12px] font-semibold text-white">{r.label}</span>
              </div>
              <span className="font-mono text-[10.5px] text-white/60">{r.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatePill({ state }: { state: ProbeResult["state"] }) {
  const cls = {
    ok: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
    warn: "border-amber-400/35 bg-amber-500/[0.08] text-amber-200",
    muted: "border-white/10 bg-white/[0.03] text-white/55",
    err: "border-rose-400/35 bg-rose-500/[0.08] text-rose-200"
  }[state];
  const Icon =
    state === "ok" ? CheckCircle2 : state === "muted" ? Cpu : ShieldCheck;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
        cls
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {state}
    </span>
  );
}
