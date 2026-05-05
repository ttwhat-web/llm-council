"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2, Eraser, Cpu, Loader2 } from "lucide-react";
import clsx from "clsx";
import { ModeSelect } from "./ModeSelect";
import { Toggle } from "./Toggle";
import { CopyButton } from "./CopyButton";
import { SafetyBadge } from "./SafetyBadge";
import type { CleanResponse, FixResponse, Mode } from "@/lib/types";

interface Props {
  variant?: "web" | "floating";
}

interface Settings {
  mode: Mode;
  useLocalAI: boolean;
  autoMode: boolean;
}

const STORAGE_KEY = "promptfixer.settings.v1";

const DEFAULTS: Settings = {
  mode: "general",
  useLocalAI: true,
  autoMode: true
};

export function PromptFixer({ variant = "web" }: Props) {
  const compact = variant === "floating";
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<FixResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate persisted settings.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const fix = useCallback(async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          mode: settings.autoMode ? undefined : settings.mode,
          useLocalAI: settings.useLocalAI,
          autoMode: settings.autoMode
        })
      });
      const data = (await res.json()) as FixResponse & { error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Fix failed");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [input, busy, settings]);

  const clean = useCallback(async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input })
      });
      const data = (await res.json()) as CleanResponse & { error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Clean failed");
      } else {
        setInput(data.cleaned);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [input, busy]);

  // Cmd/Ctrl+Enter to fix.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void fix();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fix]);

  return (
    <div className={clsx("flex h-full w-full flex-col gap-4", compact ? "p-3" : "p-6")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">PromptFixer</div>
            {!compact && (
              <div className="text-[11px] text-white/50">
                Clean → structure → supervise → ship.
              </div>
            )}
          </div>
        </div>
        <ModeSelect
          value={settings.mode}
          onChange={(mode) => setSettings((s) => ({ ...s, mode }))}
          compact={compact}
          disabled={settings.autoMode}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Toggle
          label="Auto"
          hint="Detect mode from input"
          checked={settings.autoMode}
          onChange={(autoMode) => setSettings((s) => ({ ...s, autoMode }))}
        />
        <Toggle
          label="Use Local AI"
          hint="Gemma supervisor pass"
          checked={settings.useLocalAI}
          onChange={(useLocalAI) => setSettings((s) => ({ ...s, useLocalAI }))}
        />
      </div>

      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a messy prompt, an error log, or just describe what you need…"
          rows={compact ? 5 : 8}
          spellCheck={false}
          className="no-drag w-full resize-none rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/90 placeholder:text-white/30 focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
        <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] uppercase tracking-wider text-white/30">
          ⌘ / ctrl + ⏎
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={fix}
          disabled={busy || !input.trim()}
          className="no-drag inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent/90 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Fix
        </button>
        <button
          type="button"
          onClick={clean}
          disabled={busy || !input.trim()}
          className="no-drag inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Eraser className="h-4 w-4" /> Clean
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
          >
            {error}
          </motion.div>
        )}

        {result && (
          <motion.div
            key={result.elapsedMs + "_" + result.mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex min-h-0 flex-1 flex-col gap-3"
          >
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
              <span className="rounded-md bg-white/5 px-2 py-0.5">
                Mode: <span className="text-white/85">{result.mode}</span>
              </span>
              {result.detectedMode && (
                <span className="rounded-md bg-white/5 px-2 py-0.5">
                  Detected: <span className="text-white/85">{result.detectedMode}</span>
                </span>
              )}
              <span className="rounded-md bg-white/5 px-2 py-0.5">
                {result.elapsedMs}ms
              </span>
              {result.supervisor.used && (
                <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-accent">
                  <Cpu className="h-3 w-3" />
                  {result.supervisor.error
                    ? `${result.supervisor.model || "supervisor"} (fallback)`
                    : `${result.supervisor.model} · ${result.supervisor.latencyMs}ms`}
                </span>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/8 bg-black/30">
              <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
                <div className="text-[11px] font-medium uppercase tracking-wider text-white/55">
                  Optimised Prompt
                </div>
                <CopyButton text={result.prompt} />
              </div>
              <pre className="scrollbar-thin min-h-0 flex-1 overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-[12px] leading-relaxed text-white/85">
                {result.prompt}
              </pre>
            </div>

            <SafetyBadge safety={result.safety} />

            {result.supervisor.notes && (
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-white/65">
                <span className="text-white/45">Supervisor note: </span>
                {result.supervisor.notes}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
