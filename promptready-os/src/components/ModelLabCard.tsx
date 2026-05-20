"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { FlaskConical, Loader2 } from "lucide-react";
import { probeOllama, type OllamaProbeResult } from "@/services/missionRunner";
import { useMissionStore } from "@/store/mission";

/**
 * Model Lab · honest local engine board.
 *
 * Every number on this card is real or "—". Latency is averaged from
 * actual mission receipts (engine === "ollama") — never benchmarked or
 * invented. Speed labels are coarse buckets derived from that real
 * latency. Memory is unknown, so it is always "—". Cloud models
 * (Claude / GPT) are BYOK and we never store keys, so they read as
 * offline here. The deterministic "Local" engine is always ready.
 */

type Tone = "ok" | "warn" | "muted" | "accent";

const PILL_TONE: Record<Tone, string> = {
  ok: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
  warn: "border-amber-400/30 bg-amber-500/[0.08] text-amber-200",
  muted: "border-white/10 bg-white/[0.03] text-white/55",
  accent: "border-accent/30 bg-accent/[0.08] text-accent"
};

const STORAGE_KEY = "promptready-os.model-lab.results";
const MAX_RESULTS = 20;

interface SavedResult {
  model: string;
  latencyMs: number;
  at: number;
}

interface OllamaModelDef {
  kind: "ollama";
  label: string;
  match: string; // lowercase substring tested against probe.models
}

const OLLAMA_MODELS: OllamaModelDef[] = [
  { kind: "ollama", label: "Gemma", match: "gemma" },
  { kind: "ollama", label: "Qwen", match: "qwen" },
  { kind: "ollama", label: "Llama", match: "llama" }
];

const CLOUD_MODELS = ["Claude", "GPT"] as const;

function loadResults(): SavedResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SavedResult[]) : [];
  } catch {
    return [];
  }
}

function saveResults(results: SavedResult[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(0, MAX_RESULTS)));
  } catch {
    // ignore
  }
}

function speedLabel(latencyMs: number | null): string {
  if (latencyMs === null) return "—";
  if (latencyMs < 1500) return "fast";
  if (latencyMs < 4000) return "med";
  return "slow";
}

function fmtLatency(latencyMs: number | null): string {
  return latencyMs === null ? "—" : `${latencyMs}ms`;
}

function fmtTime(at: number): string {
  try {
    return new Date(at).toLocaleTimeString();
  } catch {
    return "—";
  }
}

export function ModelLabCard() {
  const history = useMissionStore((s) => s.history);

  const [probing, setProbing] = useState(true);
  const [probe, setProbe] = useState<OllamaProbeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<SavedResult | null>(null);
  const [saved, setSaved] = useState<SavedResult[]>(() => loadResults());
  const [selected, setSelected] = useState<string>("deterministic");

  useEffect(() => {
    let alive = true;
    setProbing(true);
    probeOllama()
      .then((res) => {
        if (alive) setProbe(res);
      })
      .catch(() => {
        if (alive) setProbe({ reachable: false, models: [] });
      })
      .finally(() => {
        if (alive) setProbing(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const reachable = probe?.reachable ?? false;
  const probeModels = useMemo(
    () => (probe?.models ?? []).map((m) => m.toLowerCase()),
    [probe]
  );

  // Real average latency per ollama model, from actual receipts only.
  const latencyFor = useMemo(() => {
    return (match: string): number | null => {
      const samples = history
        .filter(
          (r) =>
            r.engine === "ollama" &&
            typeof r.llmLatencyMs === "number" &&
            (r.model ?? "").toLowerCase().includes(match)
        )
        .map((r) => r.llmLatencyMs as number);
      if (samples.length === 0) return null;
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      return Math.round(avg);
    };
  }, [history]);

  // Models offered in the action select.
  const selectableOllama = reachable
    ? OLLAMA_MODELS.filter((m) => probeModels.some((pm) => pm.includes(m.match)))
    : [];

  async function runTest() {
    if (busy) return;
    setBusy(true);
    try {
      const isOllama = selected !== "deterministic";
      const receipt = await useMissionStore
        .getState()
        .dispatch(
          "ping · model lab connectivity test",
          "general",
          "fast",
          null,
          isOllama ? { engine: "ollama", ollamaModel: selected } : undefined
        );
      if (receipt) {
        const latencyMs =
          typeof receipt.llmLatencyMs === "number"
            ? receipt.llmLatencyMs
            : typeof receipt.elapsedMs === "number"
            ? receipt.elapsedMs
            : 0;
        const result: SavedResult = {
          model: isOllama ? selected : "Local (deterministic)",
          latencyMs,
          at: Date.now()
        };
        setLastResult(result);
      }
    } finally {
      setBusy(false);
    }
  }

  function saveResult() {
    if (!lastResult) return;
    const next = [lastResult, ...saved].slice(0, MAX_RESULTS);
    setSaved(next);
    saveResults(next);
  }

  const headerPill: { label: string; tone: Tone } = probing
    ? { label: "probing…", tone: "muted" }
    : reachable
    ? { label: "ollama reachable", tone: "ok" }
    : { label: "ollama offline", tone: "muted" };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-glow">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Model Lab</span>
        </div>
        <span
          className={clsx(
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
            PILL_TONE[headerPill.tone]
          )}
        >
          {probing && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
          {headerPill.label}
        </span>
      </header>

      <p className="text-[11px] text-white/55">
        Latency is averaged from real local mission receipts only — never
        benchmarked or invented. Memory is unknown, so it stays "—". Cloud
        models are BYOK and we never store keys, so they read offline here.
      </p>

      {/* Table-like grid */}
      <div className="mt-3 overflow-hidden rounded-xl border border-white/8 bg-white/[0.012]">
        <div className="grid grid-cols-[1.1fr_0.9fr_0.7fr_0.6fr_0.6fr_1fr] gap-1 border-b border-white/8 bg-white/[0.02] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">
          <span>model</span>
          <span>status</span>
          <span>latency</span>
          <span>speed</span>
          <span>memory</span>
          <span>availability</span>
        </div>

        {OLLAMA_MODELS.map((m) => {
          const found = probeModels.some((pm) => pm.includes(m.match));
          let statusLabel: string;
          let statusTone: Tone;
          let availability: string;
          if (!reachable) {
            statusLabel = "offline";
            statusTone = "muted";
            availability = "ollama off";
          } else if (found) {
            statusLabel = "installed";
            statusTone = "ok";
            availability = "local";
          } else {
            statusLabel = "not pulled";
            statusTone = "muted";
            availability = "pull to use";
          }
          const latency = reachable && found ? latencyFor(m.match) : null;
          return (
            <Row
              key={m.label}
              model={m.label}
              statusLabel={statusLabel}
              statusTone={statusTone}
              latency={fmtLatency(latency)}
              speed={speedLabel(latency)}
              memory="—"
              availability={availability}
            />
          );
        })}

        {CLOUD_MODELS.map((m) => (
          <Row
            key={m}
            model={m}
            statusLabel="offline"
            statusTone="muted"
            latency="—"
            speed="—"
            memory="—"
            availability="BYOK · cloud"
            note="needs key"
          />
        ))}

        <Row
          model="Local"
          statusLabel="ready"
          statusTone="ok"
          latency="instant"
          speed="fast"
          memory="—"
          availability="always"
        />
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5 font-mono text-[11px] text-white outline-none focus:border-accent/30"
        >
          <option value="deterministic">Local (deterministic)</option>
          {selectableOllama.map((m) => {
            const real = probeModels.find((pm) => pm.includes(m.match)) ?? m.match;
            return (
              <option key={m.match} value={real}>
                {m.label} · {real}
              </option>
            );
          })}
        </select>

        <button
          type="button"
          onClick={runTest}
          disabled={busy}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider",
            busy
              ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-white/40"
              : "border-accent/30 bg-accent/[0.08] text-accent hover:bg-accent/[0.14]"
          )}
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          {busy ? "running…" : "Run test mission"}
        </button>

        <button
          type="button"
          onClick={saveResult}
          disabled={!lastResult}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider",
            lastResult
              ? "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
              : "cursor-not-allowed border-white/10 bg-white/[0.03] text-white/30"
          )}
        >
          Save result
        </button>

        {lastResult && (
          <span className="font-mono text-[10px] text-white/55">
            last · {lastResult.model} · {lastResult.latencyMs}ms
          </span>
        )}
      </div>

      {/* Saved results */}
      <div className="mt-3 border-t border-white/8 pt-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">
          saved results
        </span>
        {saved.length === 0 ? (
          <p className="mt-1 text-[10.5px] text-white/40">needs data · run a test to record one</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-1">
            {saved.map((r, i) => (
              <li
                key={`${r.at}-${i}`}
                className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 font-mono text-[10px] text-white/65"
              >
                <span className="text-white/80">{r.model}</span>
                <span>{r.latencyMs}ms</span>
                <span className="text-white/45">{fmtTime(r.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Row({
  model,
  statusLabel,
  statusTone,
  latency,
  speed,
  memory,
  availability,
  note
}: {
  model: string;
  statusLabel: string;
  statusTone: Tone;
  latency: string;
  speed: string;
  memory: string;
  availability: string;
  note?: string;
}) {
  return (
    <div className="grid grid-cols-[1.1fr_0.9fr_0.7fr_0.6fr_0.6fr_1fr] items-center gap-1 px-2.5 py-1.5 text-[11px] text-white/80">
      <span className="font-semibold text-white">{model}</span>
      <span>
        <span
          className={clsx(
            "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
            PILL_TONE[statusTone]
          )}
        >
          {statusLabel}
        </span>
      </span>
      <span className="font-mono tabular-nums text-white/65">{latency}</span>
      <span className="font-mono text-white/65">{speed}</span>
      <span className="font-mono text-white/45">{memory}</span>
      <span className="font-mono text-[10px] text-white/55">
        {availability}
        {note ? ` · ${note}` : ""}
      </span>
    </div>
  );
}
