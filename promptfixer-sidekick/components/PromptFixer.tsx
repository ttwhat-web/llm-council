"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2, Eraser, Loader2 } from "lucide-react";
import clsx from "clsx";
import { ModeSelect } from "./ModeSelect";
import { QualitySelect } from "./QualitySelect";
import { EngineStatus } from "./EngineStatus";
import { Toggle } from "./Toggle";
import { OutputTabs } from "./OutputTabs";
import { TemplatePicker } from "./TemplatePicker";
import { HistoryDrawer } from "./HistoryDrawer";
import { useClientContext } from "@/lib/clientContext";
import { getQuality } from "@/lib/quality";
import { newId, saveEntry, type HistoryEntry } from "@/lib/history";
import type {
  CleanResponse,
  ClientContext,
  FixResponse,
  Mode,
  ModelQuality,
  OutputAction
} from "@/lib/types";

interface Props {
  variant?: "web" | "floating";
}

interface Settings {
  mode: Mode;
  modelQuality: ModelQuality;
  autoMode: boolean;
  /**
   * Only consulted when modelQuality === "local". Strict (false) is the
   * default — Local mode never silently falls through to cloud.
   */
  allowCloudFallback: boolean;
}

const STORAGE_KEY = "promptfixer.settings.v4";

const DEFAULTS: Settings = {
  mode: "general",
  modelQuality: "fast",
  autoMode: true,
  allowCloudFallback: false
};

export function PromptFixer({ variant = "web" }: Props) {
  const compact = variant === "floating";
  const detectedContext: ClientContext = variant === "floating" ? "desktop" : "web";
  const clientContext = useClientContext(detectedContext);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<FixResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<OutputAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  const isLocal = settings.modelQuality === "local";
  const derivedEngine = getQuality(settings.modelQuality).engine;

  // ---- persisted settings ----
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

  // ---- API calls ----
  const callFix = useCallback(
    async (override?: { action: OutputAction; previousSections: FixResponse["sections"] }) => {
      if (!override && !input.trim()) return;
      if (busy || busyAction) return;
      if (override) setBusyAction(override.action);
      else setBusy(true);
      setError(null);

      try {
        const res = await fetch("/api/fix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: override ? "" : input,
            mode: settings.autoMode && !override ? undefined : settings.mode,
            engine: derivedEngine,
            autoMode: !override && settings.autoMode,
            clientContext,
            allowCloudFallback: isLocal ? settings.allowCloudFallback : false,
            modelQuality: settings.modelQuality,
            action: override?.action,
            previousSections: override?.previousSections
          })
        });
        const data = (await res.json()) as FixResponse & { error?: string };
        if (!res.ok || !data.ok) {
          setError(data.error || "Fix failed");
          if ((data as FixResponse).usage) {
            setResult((prev) =>
              prev ? { ...prev, usage: (data as FixResponse).usage } : prev
            );
          }
          return;
        }
        setResult(data);

        // Persist to local history (only on a fresh fix; transforms reuse).
        if (!override) {
          const entry: HistoryEntry = {
            id: newId(),
            timestamp: Date.now(),
            input,
            output: data.prompt,
            mode: data.mode,
            engine: derivedEngine,
            modelQuality: settings.modelQuality,
            score: data.score
          };
          saveEntry(entry);
          setHistoryKey((k) => k + 1);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        if (override) setBusyAction(null);
        else setBusy(false);
      }
    },
    [input, busy, busyAction, settings, derivedEngine, clientContext, isLocal]
  );

  const clean = useCallback(async () => {
    if (!input.trim() || busy || busyAction) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input })
      });
      const data = (await res.json()) as CleanResponse & { error?: string };
      if (!res.ok || !data.ok) setError(data.error || "Clean failed");
      else setInput(data.cleaned);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [input, busy, busyAction]);

  const onAction = useCallback(
    (action: OutputAction) => {
      if (!result?.sections) return;
      void callFix({ action, previousSections: result.sections });
    },
    [callFix, result]
  );

  const reopenHistory = useCallback((entry: HistoryEntry) => {
    setInput(entry.input);
    setSettings((s) => ({ ...s, mode: entry.mode, modelQuality: entry.modelQuality }));
    setResult(null);
    setError(null);
  }, []);

  // ⌘/Ctrl + Enter to fix
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void callFix();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [callFix]);

  return (
    <div className={clsx("flex h-full w-full flex-col gap-4", compact ? "p-3" : "p-6")}>
      {/* ---- header ---- */}
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <div className="flex items-center gap-2">
          <ModeSelect
            value={settings.mode}
            onChange={(mode) => setSettings((s) => ({ ...s, mode }))}
            compact={compact}
            disabled={settings.autoMode}
          />
          <QualitySelect
            value={settings.modelQuality}
            onChange={(modelQuality) => setSettings((s) => ({ ...s, modelQuality }))}
            compact={compact}
          />
        </div>
      </div>

      {/* ---- secondary chrome ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <TemplatePicker
          compact={compact}
          onPick={(t) => {
            setInput(t.body);
            setSettings((s) => ({ ...s, mode: t.mode, autoMode: false }));
          }}
        />
        <HistoryDrawer compact={compact} reloadKey={historyKey} onReopen={reopenHistory} />
        <div className="ml-auto">
          <Toggle
            label="Auto mode"
            hint="Detect best mode from input"
            checked={settings.autoMode}
            onChange={(autoMode) => setSettings((s) => ({ ...s, autoMode }))}
          />
        </div>
      </div>

      {isLocal && (
        <Toggle
          label="Allow cloud fallback"
          hint="Off by default. When on, calls go to the cloud if Ollama is unavailable — your input leaves the machine and may count toward your quota."
          checked={settings.allowCloudFallback}
          onChange={(allowCloudFallback) =>
            setSettings((s) => ({ ...s, allowCloudFallback }))
          }
        />
      )}

      {/* ---- input ---- */}
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
          onClick={() => void callFix()}
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

      <EngineStatus
        selectedEngine={derivedEngine}
        clientContext={clientContext}
        allowCloudFallback={isLocal ? settings.allowCloudFallback : false}
        lastSupervisor={result?.supervisor}
        lastUsage={result?.usage}
        compact={compact}
      />

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
            key={result.elapsedMs + "_" + result.mode + "_" + (result.action ?? "fix")}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex min-h-0 flex-1 flex-col gap-3"
          >
            <OutputTabs
              result={result}
              modelQuality={settings.modelQuality}
              clientContext={clientContext}
              allowCloudFallback={isLocal ? settings.allowCloudFallback : false}
              busy={busy}
              busyAction={busyAction}
              onAction={onAction}
              compact={compact}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
