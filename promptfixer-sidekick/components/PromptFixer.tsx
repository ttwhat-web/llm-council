"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eraser, Hammer, Loader2, Wand2 } from "lucide-react";
import clsx from "clsx";
import { ModeSelect } from "./ModeSelect";
import { QualitySelect } from "./QualitySelect";
import { ModelRadar } from "./ModelRadar";
import { PipelineViz } from "./PipelineViz";
import { Toggle } from "./Toggle";
import { OutputTabs, MetaRow } from "./OutputTabs";
import { TemplatePicker } from "./TemplatePicker";
import { HistoryDrawer } from "./HistoryDrawer";
import { CommandBar, type CommandAction } from "./CommandBar";
import { CommandStrip } from "./CommandStrip";
import { HeaderStatus } from "./HeaderStatus";
import { AgentActions } from "./AgentActions";
import { LivePreview } from "./LivePreview";
import { MissionLog } from "./MissionLog";
import { MissionAlertInbox } from "./MissionAlertInbox";
import { MissionAlertToggle } from "./MissionAlertToggle";
import { ScoreBadges } from "./ScoreBadges";
import { SafetyBadge } from "./SafetyBadge";
import { ArchitectView } from "./ArchitectView";
import { SkillSuggestions } from "./SkillSuggestions";
import { SkillsExplorer } from "./SkillsExplorer";
import { useClientContext } from "@/lib/clientContext";
import { getQuality } from "@/lib/quality";
import { newId, saveEntry, type HistoryEntry } from "@/lib/history";
import {
  appendLog,
  logCommand,
  logsFromResponse,
  logsFromStageEvents,
  logTemplate,
  logUserSubmit,
  makeLogEntry
} from "@/lib/missionLog";
import type { SkillId } from "@/lib/skills/types";
import type {
  ArchitectResponse,
  CleanResponse,
  ClientContext,
  FixResponse,
  LogEntry,
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
  /**
   * User opt-in for Mission Alerts (Pro). When the public feature flag is
   * off, the toggle renders as a Pro lock and this stays false.
   */
  notifyOnHumanNeeded: boolean;
  /**
   * The user identifier used for Mission Alerts linking + alert-author
   * attribution. Free-form until auth lands; treated as opaque by the
   * server. Persisted so the user doesn't retype it.
   */
  alertUser: string;
}

const STORAGE_KEY = "promptfixer.settings.v6";

const DEFAULTS: Settings = {
  mode: "general",
  modelQuality: "fast",
  autoMode: true,
  allowCloudFallback: false,
  notifyOnHumanNeeded: false,
  alertUser: ""
};

/** Public feature flag (NEXT_PUBLIC_*); read at module-load on the client. */
const MISSION_ALERTS_FLAG =
  (process.env.NEXT_PUBLIC_MISSION_ALERTS_ENABLED || "").toLowerCase() === "true";

export function PromptFixer({ variant = "web" }: Props) {
  const compact = variant === "floating";
  const detectedContext: ClientContext = variant === "floating" ? "desktop" : "web";
  const clientContext = useClientContext(detectedContext);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<FixResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<OutputAction | null>(null);
  const [busyArchitect, setBusyArchitect] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [inboxReloadKey, setInboxReloadKey] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [architect, setArchitect] = useState<ArchitectResponse | null>(null);
  const [forcedTab, setForcedTab] = useState<"architect" | undefined>(undefined);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdInitialQuery, setCmdInitialQuery] = useState<string>("");
  const [busySkillId, setBusySkillId] = useState<SkillId | null>(null);
  const [busyWorkflowId, setBusyWorkflowId] = useState<string | null>(null);

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
      if (busy || busyAction || busyArchitect) return;
      if (override) setBusyAction(override.action);
      else setBusy(true);
      setError(null);

      const startedAt = Date.now();
      if (!override) {
        setLog((prev) => appendLog(prev, logUserSubmit(input)));
        setArchitect(null);
        setForcedTab(undefined);
      }

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
            previousSections: override?.previousSections,
            notifyOnHumanNeeded:
              MISSION_ALERTS_FLAG && settings.notifyOnHumanNeeded,
            alertUser: settings.alertUser || undefined
          })
        });
        const data = (await res.json()) as FixResponse & { error?: string };
        if (!res.ok || !data.ok) {
          setError(data.error || "Fix failed");
          setLog((prev) =>
            appendLog(prev, makeLogEntry("err", data.error || "Fix failed", "error"))
          );
          if ((data as FixResponse).usage) {
            setResult((prev) =>
              prev ? { ...prev, usage: (data as FixResponse).usage } : prev
            );
          }
          return;
        }
        setResult(data);
        setLog((prev) =>
          appendLog(
            prev,
            logsFromResponse(data, { autoMode: settings.autoMode, startedAt })
          )
        );
        if (typeof data.supervisor.latencyMs === "number") {
          setLatencyHistory((prev) => [...prev.slice(-7), data.supervisor.latencyMs!]);
        }
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
        // Inbox refresh — gives the fire-and-forget dispatcher a moment
        // to land its write before the GET. The poll catches it either way.
        if (MISSION_ALERTS_FLAG && settings.alertUser) {
          setTimeout(() => setInboxReloadKey((k) => k + 1), 600);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        if (override) setBusyAction(null);
        else setBusy(false);
      }
    },
    [input, busy, busyAction, busyArchitect, settings, derivedEngine, clientContext, isLocal]
  );

  const runArchitect = useCallback(async () => {
    if (!input.trim() || busy || busyAction || busyArchitect) return;
    setBusyArchitect(true);
    setError(null);
    setLog((prev) =>
      appendLog(prev, makeLogEntry("info", "Architect plan requested", "architect"))
    );
    try {
      const res = await fetch("/api/architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          modelQuality: settings.modelQuality,
          clientContext,
          allowCloudFallback: isLocal ? settings.allowCloudFallback : false,
          notifyOnHumanNeeded:
            MISSION_ALERTS_FLAG && settings.notifyOnHumanNeeded,
          alertUser: settings.alertUser || undefined
        })
      });
      const data = (await res.json()) as ArchitectResponse & { error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Architect failed");
        setLog((prev) =>
          appendLog(prev, makeLogEntry("err", data.error || "Architect failed", "architect"))
        );
        return;
      }
      setArchitect(data);
      setForcedTab("architect");
      setLog((prev) =>
        appendLog(
          prev,
          makeLogEntry(
            data.isDeterministic ? "warn" : "ok",
            `Architect plan ready · ${data.resolved}${data.model ? " · " + data.model : ""}${typeof data.latencyMs === "number" ? " · " + data.latencyMs + "ms" : ""}`,
            "architect"
          )
        )
      );
      if (MISSION_ALERTS_FLAG && settings.alertUser) {
        setTimeout(() => setInboxReloadKey((k) => k + 1), 600);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyArchitect(false);
    }
  }, [input, busy, busyAction, busyArchitect, settings, clientContext, isLocal]);

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

  const onRunSkill = useCallback(
    async (skillId: SkillId) => {
      if (!input.trim() || busy || busyAction || busyArchitect || busySkillId) return;
      setBusySkillId(skillId);
      setError(null);
      const startedAt = Date.now();
      setLog((prev) =>
        appendLog(prev, makeLogEntry("info", `Skill — ${skillId} dispatched`, skillId))
      );
      try {
        const res = await fetch("/api/skills/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skillId,
            input,
            modelQuality: settings.modelQuality,
            clientContext,
            allowCloudFallback: isLocal ? settings.allowCloudFallback : false,
            notifyOnHumanNeeded:
              MISSION_ALERTS_FLAG && settings.notifyOnHumanNeeded,
            alertUser: settings.alertUser || undefined
          })
        });
        const data = (await res.json()) as {
          ok: boolean;
          skillId?: SkillId;
          status?: string;
          result?: { ok: boolean; output?: unknown; error?: string };
          error?: string;
        };
        if (!res.ok || !data.ok) {
          const msg = data.error || `Skill ${skillId} failed`;
          setError(msg);
          setLog((prev) => appendLog(prev, makeLogEntry("err", msg, skillId)));
          return;
        }
        const inner = data.result;
        if (!inner?.ok) {
          const msg = inner?.error || `Skill ${skillId} failed`;
          setError(msg);
          setLog((prev) => appendLog(prev, makeLogEntry("err", msg, skillId)));
          return;
        }

        // Map per-skill output back into the existing UI state.
        if (skillId === "prompt-fixer") {
          const fix = inner.output as FixResponse;
          setResult(fix);
          setArchitect(null);
          setForcedTab(undefined);
          if (fix.events && fix.events.length > 0) {
            setLog((prev) =>
              appendLog(
                prev,
                logsFromStageEvents(fix.events!, {
                  startedAt,
                  elapsedMs: fix.elapsedMs,
                  mode: fix.mode
                })
              )
            );
          } else {
            setLog((prev) =>
              appendLog(
                prev,
                logsFromResponse(fix, { autoMode: settings.autoMode, startedAt })
              )
            );
          }
          if (typeof fix.supervisor.latencyMs === "number") {
            setLatencyHistory((prev) => [...prev.slice(-7), fix.supervisor.latencyMs!]);
          }
        } else if (skillId === "architect") {
          const arch = inner.output as ArchitectResponse;
          setArchitect(arch);
          setForcedTab("architect");
          setLog((prev) =>
            appendLog(
              prev,
              makeLogEntry(
                arch.isDeterministic ? "warn" : "ok",
                `Architect plan ready · ${arch.resolved}${arch.model ? " · " + arch.model : ""}${typeof arch.latencyMs === "number" ? " · " + arch.latencyMs + "ms" : ""}`,
                "architect"
              )
            )
          );
        } else if (skillId === "prompt-cleaner") {
          const cleaned = inner.output as { cleaned: string; removed: string[] };
          setInput(cleaned.cleaned);
          setLog((prev) =>
            appendLog(
              prev,
              makeLogEntry(
                "ok",
                cleaned.removed.length
                  ? `Cleaned · stripped ${cleaned.removed.join(", ")}`
                  : "Cleaned · input already clean",
                "cleaner"
              )
            )
          );
        }

        if (MISSION_ALERTS_FLAG && settings.alertUser) {
          setTimeout(() => setInboxReloadKey((k) => k + 1), 600);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusySkillId(null);
      }
    },
    [
      input,
      busy,
      busyAction,
      busyArchitect,
      busySkillId,
      settings,
      clientContext,
      isLocal
    ]
  );

  const onRunWorkflow = useCallback(
    async (workflowId: string) => {
      if (!input.trim() || busy || busyAction || busyArchitect || busyWorkflowId) return;
      setBusyWorkflowId(workflowId);
      setError(null);
      setLog((prev) =>
        appendLog(prev, makeLogEntry("info", `Workflow — ${workflowId} dispatched`, "workflow"))
      );
      try {
        const res = await fetch("/api/workflows/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId,
            input,
            modelQuality: settings.modelQuality,
            clientContext,
            allowCloudFallback: isLocal ? settings.allowCloudFallback : false,
            alertUser: settings.alertUser || undefined
          })
        });
        const data = (await res.json()) as {
          ok: boolean;
          workflowId?: string;
          result?: {
            ok: boolean;
            outputs: Record<string, unknown>;
            elapsedMs: number;
            error?: string;
          };
          error?: string;
        };
        if (!res.ok || !data.ok) {
          const msg = data.result?.error || data.error || `Workflow ${workflowId} failed`;
          setError(msg);
          setLog((prev) => appendLog(prev, makeLogEntry("err", msg, "workflow")));
          return;
        }
        const wfResult = data.result;
        if (!wfResult) return;

        // Wire the per-node outputs back into the UI surface that mirrors
        // their dedicated entry points.
        const fix = wfResult.outputs.fix as FixResponse | undefined;
        const arch = wfResult.outputs.architect as ArchitectResponse | undefined;
        if (fix) {
          setResult(fix);
          if (typeof fix.supervisor?.latencyMs === "number") {
            setLatencyHistory((prev) => [...prev.slice(-7), fix.supervisor.latencyMs!]);
          }
        }
        if (arch) {
          setArchitect(arch);
          setForcedTab("architect");
        }
        setLog((prev) =>
          appendLog(
            prev,
            makeLogEntry(
              "ok",
              `Workflow ${workflowId} complete · ${wfResult.elapsedMs}ms`,
              "workflow"
            )
          )
        );

        if (MISSION_ALERTS_FLAG && settings.alertUser) {
          setTimeout(() => setInboxReloadKey((k) => k + 1), 600);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusyWorkflowId(null);
      }
    },
    [
      input,
      busy,
      busyAction,
      busyArchitect,
      busyWorkflowId,
      settings,
      clientContext,
      isLocal
    ]
  );

  const reopenHistory = useCallback((entry: HistoryEntry) => {
    setInput(entry.input);
    setSettings((s) => ({ ...s, mode: entry.mode, modelQuality: entry.modelQuality }));
    setResult(null);
    setArchitect(null);
    setForcedTab(undefined);
    setError(null);
  }, []);

  const onCommand = useCallback(
    (action: CommandAction) => {
      switch (action.kind) {
        case "run-fix":
          setLog((prev) => appendLog(prev, logCommand("/fix")));
          void callFix();
          break;
        case "run-architect":
          setLog((prev) => appendLog(prev, logCommand("/architect")));
          void runArchitect();
          break;
        case "load-template":
          setLog((prev) => appendLog(prev, logTemplate(action.label)));
          setInput(action.body);
          setSettings((s) => ({ ...s, mode: action.mode, autoMode: false }));
          break;
        case "set-mode":
          setSettings((s) => ({ ...s, mode: action.mode, autoMode: false }));
          setLog((prev) => appendLog(prev, logCommand(`/mode ${action.mode}`)));
          break;
        case "compare":
          setLog((prev) => appendLog(prev, logCommand("/compare")));
          break;
      }
    },
    [callFix, runArchitect]
  );

  const openCmd = useCallback((q: string = "") => {
    setCmdInitialQuery(q);
    setCmdOpen(true);
  }, []);

  // ⌘/Ctrl + Enter to fix; ⌘/Ctrl + K to open the command bar.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "Enter") {
        e.preventDefault();
        void callFix();
      } else if (meta && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCmdInitialQuery("");
        setCmdOpen((v) => !v);
      } else if (e.key === "Escape") {
        setCmdOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [callFix]);

  // ---- shared bits ----
  const radarProps = {
    selectedEngine: derivedEngine,
    selectedQuality: settings.modelQuality,
    selectedMode: settings.mode,
    clientContext,
    allowCloudFallback: isLocal ? settings.allowCloudFallback : false,
    lastSupervisor: result?.supervisor,
    lastUsage: result?.usage,
    busy: busy || busyArchitect,
    latencyHistory
  };

  return (
    <div
      className={clsx(
        "relative flex h-full w-full flex-col gap-4",
        compact ? "p-3" : "p-5 md:p-6"
      )}
    >
      {/* ---- floating Mission Control HUD (xl+ only — gives the
              3-col grid breathing room at lg) ---- */}
      {!compact && (
        <div className="pointer-events-none absolute right-5 top-5 z-20 hidden xl:block">
          <div className="pointer-events-auto">
            <ModelRadar {...radarProps} />
          </div>
        </div>
      )}

      {/* ============================================================
           TOP COMMAND HEADER
         ============================================================ */}
      <header
        className={clsx(
          "flex flex-col gap-3",
          !compact && "xl:pr-[300px]"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/30 shadow-glow">
              <span className="font-mono text-[11px] tracking-wider text-accent">PF</span>
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-white">
                  PromptFixer
                </span>
                <span className="rounded-md border border-accent/25 bg-accent/[0.06] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-accent">
                  Command Center
                </span>
              </div>
              {!compact && (
                <div className="text-[11px] text-white/45">
                  Route, supervise and deploy AI workflows.
                </div>
              )}
            </div>
          </div>
          <HeaderStatus
            selectedEngine={derivedEngine}
            selectedQuality={settings.modelQuality}
            selectedMode={settings.mode}
            clientContext={clientContext}
            lastSupervisor={result?.supervisor}
            lastUsage={result?.usage}
            busy={busy || busyArchitect}
          />
        </div>

        <CommandStrip
          onOpen={() => openCmd()}
          onPrefilled={(q) => openCmd(q)}
          onCommand={onCommand}
          compact={compact}
        />
      </header>

      {/* ============================================================
           MAIN GRID — three columns at lg+, stacked on small.
         ============================================================ */}
      <div
        className={clsx(
          "grid grid-cols-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)_360px] lg:items-start",
          !compact && "xl:pr-[300px]"
        )}
      >
        {/* ---------- COLUMN 1 — MISSION INPUT ---------- */}
        <section className="flex flex-col gap-3 rounded-2xl border border-white/6 bg-white/[0.012] p-3">
          <ColumnHeader label="Mission Input" tag="01 · INPUT" />

          <Toggle
            label="Auto mode"
            hint="Detect best mode from input"
            checked={settings.autoMode}
            onChange={(autoMode) => setSettings((s) => ({ ...s, autoMode }))}
          />

          <div className="grid grid-cols-2 gap-2">
            <ModeSelect
              value={settings.mode}
              onChange={(mode) => setSettings((s) => ({ ...s, mode }))}
              compact
              disabled={settings.autoMode}
            />
            <QualitySelect
              value={settings.modelQuality}
              onChange={(modelQuality) =>
                setSettings((s) => ({ ...s, modelQuality }))
              }
              compact
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <TemplatePicker
              compact
              onPick={(t) => {
                setInput(t.body);
                setSettings((s) => ({ ...s, mode: t.mode, autoMode: false }));
                setLog((prev) => appendLog(prev, logTemplate(t.id)));
              }}
            />
            <HistoryDrawer compact reloadKey={historyKey} onReopen={reopenHistory} />
            <AgentActions
              compact
              onPick={(body, mode) => {
                setInput(body);
                setSettings((s) => ({ ...s, mode, autoMode: false }));
                setLog((prev) => appendLog(prev, logTemplate("agent action")));
              }}
            />
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

          <MissionAlertToggle
            unlocked={MISSION_ALERTS_FLAG}
            userEmail={settings.alertUser}
            onUserEmailChange={(alertUser) =>
              setSettings((s) => ({ ...s, alertUser }))
            }
            notifyEnabled={MISSION_ALERTS_FLAG && settings.notifyOnHumanNeeded}
            onNotifyChange={(notifyOnHumanNeeded) =>
              setSettings((s) => ({ ...s, notifyOnHumanNeeded }))
            }
            compact
          />

          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a messy prompt, an error log, or describe what you need…"
              rows={compact ? 5 : 9}
              spellCheck={false}
              className="no-drag w-full resize-none rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5 text-[13px] text-white/90 placeholder:text-white/30 focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
            <div className="pointer-events-none absolute bottom-2 right-3 font-mono text-[9px] uppercase tracking-wider text-white/30">
              ⌘/Ctrl + ⏎
            </div>
          </div>

          <SkillSuggestions
            input={input}
            busySkillId={busySkillId}
            onPick={(skillId) => void onRunSkill(skillId)}
            compact={compact}
          />

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void callFix()}
              disabled={busy || !input.trim()}
              className="no-drag inline-flex items-center justify-center gap-2 rounded-xl bg-accent/90 px-3 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Run Mission
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void runArchitect()}
                disabled={busyArchitect || !input.trim() || busy}
                className="no-drag inline-flex items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/[0.08] px-2.5 py-1.5 text-[12px] font-semibold text-accent transition hover:bg-accent/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
                title="Prompt → architecture, stack, file tree, roadmap"
              >
                {busyArchitect ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Hammer className="h-3.5 w-3.5" />
                )}
                Architect
              </button>
              <button
                type="button"
                onClick={clean}
                disabled={busy || !input.trim()}
                className="no-drag inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] font-medium text-white/85 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Eraser className="h-3.5 w-3.5" />
                Clean Signal
              </button>
            </div>
          </div>

          <SkillsExplorer
            busySkillId={busySkillId}
            onRunSkill={(skillId) => void onRunSkill(skillId)}
            onRunWorkflow={(workflowId) => void onRunWorkflow(workflowId)}
            workflowBusyId={busyWorkflowId}
            compact={compact}
          />
        </section>

        {/* ---------- COLUMN 2 — OPERATIONS PIPELINE ---------- */}
        <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.018] p-3 shadow-glass">
          <ColumnHeader label="Operations Pipeline" tag="02 · TELEMETRY" reactor />

          <PipelineViz
            busy={busy || busyArchitect}
            result={result}
            autoMode={settings.autoMode}
            compact={compact}
          />

          <MissionLog
            entries={log}
            busy={busy || busyArchitect}
            compact={compact}
          />

          <LivePreview
            input={input}
            mode={settings.mode}
            autoMode={settings.autoMode}
            compact={compact}
          />

          {result ? (
            <div className="flex flex-col gap-2.5">
              <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/35">
                Score
              </div>
              <ScoreBadges score={result.score} compact={compact} />

              <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/35">
                Telemetry
              </div>
              <MetaRow result={result} />

              <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/35">
                Safety
              </div>
              <SafetyBadge safety={result.safety} />
            </div>
          ) : (
            <PipelineEmpty />
          )}

          <MissionAlertInbox
            unlocked={MISSION_ALERTS_FLAG}
            userEmail={settings.alertUser}
            reloadKey={inboxReloadKey}
            compact={compact}
          />
        </section>

        {/* ---------- COLUMN 3 — OUTPUT CONSOLE ---------- */}
        <section className="flex min-h-0 flex-col gap-3 rounded-2xl border border-white/6 bg-white/[0.012] p-3 lg:max-h-[calc(100vh-7rem)] lg:overflow-hidden">
          <ColumnHeader label="Output Console" tag="03 · DELIVERABLE" />

          <AnimatePresence mode="popLayout">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-200"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
            {result ? (
              <motion.div
                key={result.elapsedMs + "_" + result.mode + "_" + (result.action ?? "fix")}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <OutputTabs
                  result={result}
                  modelQuality={settings.modelQuality}
                  clientContext={clientContext}
                  allowCloudFallback={isLocal ? settings.allowCloudFallback : false}
                  architect={architect}
                  forceTab={forcedTab}
                  busy={busy}
                  busyAction={busyAction}
                  onAction={onAction}
                  compact={compact}
                />
              </motion.div>
            ) : architect ? (
              <ArchitectView data={architect} />
            ) : (
              <OutputEmpty
                disabled={!input.trim() || busy}
                onRun={() => void callFix()}
                onCommand={() => openCmd()}
              />
            )}
          </div>
        </section>
      </div>

      {/* ---- non-xl radar (stacks at the end below the columns) ---- */}
      {!compact && (
        <div className="xl:hidden">
          <ModelRadar {...radarProps} className="!w-full" />
        </div>
      )}
      {compact && <ModelRadar {...radarProps} className="!w-full" />}

      <CommandBar
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onAction={onCommand}
        initialQuery={cmdInitialQuery}
      />
    </div>
  );
}

// ---------- in-file helpers ----------

function ColumnHeader({
  label,
  tag,
  reactor
}: {
  label: string;
  tag: string;
  reactor?: boolean;
}) {
  return (
    <header className="flex items-baseline justify-between border-b border-white/5 pb-2">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/65">
        {reactor && (
          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_2px_rgba(124,155,255,0.5)]">
            <span className="absolute inset-0 animate-[pulse_2s_ease-in-out_infinite] rounded-full bg-accent/35" />
          </span>
        )}
        {label}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
        {tag}
      </span>
    </header>
  );
}

function PipelineEmpty() {
  return (
    <div className="rounded-xl border border-dashed border-white/8 bg-white/[0.01] px-3 py-3 text-center">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
        Reactor idle
      </div>
      <div className="text-[11px] text-white/50">
        Load an input on the left, then{" "}
        <span className="text-accent">Run Mission</span> to start the pipeline.
      </div>
    </div>
  );
}

function OutputEmpty({
  disabled,
  onRun,
  onCommand
}: {
  disabled: boolean;
  onRun: () => void;
  onCommand: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/8 bg-white/[0.01] px-3 py-8 text-center">
      <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
        Awaiting Mission
      </div>
      <div className="max-w-[240px] text-[12px] text-white/55">
        Submit your input from <span className="text-white/85">Mission Input</span>, or
        press <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 font-mono text-[10px]">⌘K</kbd>{" "}
        for commands.
      </div>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={onRun}
          disabled={disabled}
          className="no-drag rounded-lg bg-accent/85 px-2.5 py-1 text-[11px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Run Mission
        </button>
        <button
          type="button"
          onClick={onCommand}
          className="no-drag rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-white/75 transition hover:bg-white/[0.06]"
        >
          ⌘K
        </button>
      </div>
    </div>
  );
}
