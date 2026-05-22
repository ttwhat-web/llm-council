"use client";

/**
 * Operator Voice Console · route /voice.
 *
 * A Jarvis-style operator control room. The operator talks (browser Web
 * Speech API, when available) or types commands; Atlas parses them into
 * SAFE local tasks and prepares actions. NOTHING auto-executes — no
 * shell, no filesystem writes, no auto desktop control. Every "action"
 * is a local, reversible store call (note / mission dispatch / paste
 * clean / in-app navigation) the operator triggers explicitly.
 *
 * Layout: center Voice Orb + command box · bottom Task Queue · right Safe
 * Actions · left Memory Context · plus Paste Intelligence and a
 * planned/locked Desktop Control panel.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clipboard,
  Clock3,
  Copy,
  Cpu,
  FileText,
  LayoutGrid,
  Lock,
  Mic,
  MicOff,
  Radio,
  Rocket,
  RotateCcw,
  ScrollText,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Waves
} from "lucide-react";

import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";
import { AtlasOrb, type AtlasOrbMode } from "@/components/AtlasOrb";
import { cleanPaste } from "@/services/pasteClean";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { useBrainStore } from "@/store/brain";
import { getTelegramBridgeStatus } from "@/services/telegramLive";

import { parseCommand, COMMAND_HINTS, type ParsedCommand } from "./commandParser";
import { useSpeech, useMicPermission, type MicPermission } from "./useSpeech";
import { useWaveform } from "./useWaveform";
import { TestConsole } from "./TestConsole";
import {
  loadTasks,
  saveTasks,
  makeTask,
  loadCaptures,
  saveCaptures,
  makeCapture,
  loadAutoClean,
  saveAutoClean,
  type VoiceTask,
  type VoiceCapture,
  type TaskStatus
} from "./voiceTasks";

type OrbStatus = "idle" | "listening" | "thinking" | "ready" | "blocked";

// ---------------------------------------------------------------------------
// Atlas presence modes (H · purely visual). The selectable "scene" combines
// with live activity (listening / reasoning / blocked) to drive the orb.
// ---------------------------------------------------------------------------

type AtlasScene = "general" | "market" | "research" | "coding" | "replay" | "voice" | "risk";

const ATLAS_SCENES: { id: AtlasScene; label: string; icon: typeof Activity }[] = [
  { id: "general", label: "general", icon: Sparkles },
  { id: "market", label: "market", icon: TrendingUp },
  { id: "research", label: "research", icon: Brain },
  { id: "coding", label: "coding", icon: Cpu },
  { id: "replay", label: "replay", icon: RotateCcw },
  { id: "voice", label: "voice", icon: Mic },
  { id: "risk", label: "risk", icon: AlertTriangle }
];

/** Live status outranks the chosen scene so the orb always reflects reality. */
function resolveOrbMode(status: OrbStatus, scene: AtlasScene): AtlasOrbMode {
  if (status === "blocked") return "risk";
  if (status === "listening") return "listening";
  if (status === "thinking") return "reasoning";
  if (status === "ready") return "mission";
  // idle → reflect the chosen scene
  return scene as AtlasOrbMode;
}

function readMarketAlertCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem("promptready-os.intel-terminal.alerts");
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export default function VoiceConsolePage() {
  const navigate = useNavigate();

  // stores
  const dispatch = useMissionStore((s) => s.dispatch);
  const current = useMissionStore((s) => s.current);
  const history = useMissionStore((s) => s.history);
  const addMemoryDocs = useAtlasStore((s) => s.addMemoryDocs);
  const memoryDocs = useAtlasStore((s) => s.memoryDocs);
  const memorySources = useBrainStore((s) => s.memorySources);

  // local persisted state
  const [tasks, setTasks] = useState<VoiceTask[]>([]);
  const [captures, setCaptures] = useState<VoiceCapture[]>([]);
  useEffect(() => {
    setTasks(loadTasks());
    setCaptures(loadCaptures());
  }, []);
  const commit = useCallback((next: VoiceTask[]) => {
    setTasks(next);
    saveTasks(next);
  }, []);
  const commitCaptures = useCallback((next: VoiceCapture[]) => {
    setCaptures(next);
    saveCaptures(next);
  }, []);

  // command box + parse
  const [command, setCommand] = useState("");
  const [parsed, setParsed] = useState<ParsedCommand | null>(null);
  const [orb, setOrb] = useState<OrbStatus>("idle");
  const [queueFilter, setQueueFilter] = useState<"all" | "approval">("all");

  // H · Atlas presence scene (purely visual)
  const [scene, setScene] = useState<AtlasScene>("voice");
  const orbMode = resolveOrbMode(orb, scene);

  // paste cleaner + Smart Paste Autopilot
  const [pasteIn, setPasteIn] = useState("");
  const [cleaned, setCleaned] = useState<string | null>(null);
  const [changes, setChanges] = useState<string[]>([]);
  const [autoApplied, setAutoApplied] = useState(false);
  const [preCleanText, setPreCleanText] = useState<string | null>(null);
  const [autoClean, setAutoClean] = useState(false);
  const [pasteEvents, setPasteEvents] = useState(0);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setAutoClean(loadAutoClean());
  }, []);
  const setAutoCleanPref = useCallback((on: boolean) => {
    setAutoClean(on);
    saveAutoClean(on);
  }, []);

  // speech
  const onSpeechFinal = useCallback((text: string) => {
    setCommand(text);
    commitCaptures([makeCapture(text, "speech"), ...loadCaptures()]);
  }, [commitCaptures]);
  const speech = useSpeech(onSpeechFinal);
  const micPermission = useMicPermission();

  // The mic is "active" (capturing) ONLY while speech is listening. The
  // waveform hook opens getUserMedia only when this is true, and we tear it
  // all down the instant listening stops. No background / hidden listening.
  const micActive = speech.listening;
  const waveform = useWaveform(micActive);

  // ---- talk control: click-toggle + hold-Space, with a permission guard ----
  const startTalk = useCallback(() => {
    if (!speech.supported || micPermission === "denied") return;
    speech.start();
  }, [speech, micPermission]);
  const stopTalk = useCallback(() => {
    speech.stop();
  }, [speech]);
  const toggleTalk = useCallback(() => {
    if (speech.listening) stopTalk();
    else startTalk();
  }, [speech.listening, startTalk, stopTalk]);

  // Double-tap the orb to immediately submit the current command (a quick
  // "commit" affordance). Single tap still toggles talk. This is purely a
  // local convenience — it just calls the existing submit path.
  const lastTapRef = useRef(0);
  const onOrbActivate = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      lastTapRef.current = 0;
      if (command.trim()) {
        submitRef.current?.();
        return;
      }
    }
    lastTapRef.current = now;
    toggleTalk();
  }, [command, toggleTalk]);
  // submit is defined below; keep a ref so the double-tap handler can reach it
  const submitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (micPermission === "denied") {
      setOrb("blocked");
      return;
    }
    if (speech.listening) setOrb("listening");
    else if (orb === "listening" || orb === "blocked") setOrb("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.listening, micPermission]);

  // Hold Space to talk — but NEVER while typing in an input/textarea/editable.
  useEffect(() => {
    if (!speech.supported) return;
    const isTyping = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      if (isTyping(e.target)) return;
      e.preventDefault();
      if (!speech.listening) startTalk();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (isTyping(e.target)) return;
      e.preventDefault();
      if (speech.listening) stopTalk();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [speech.supported, speech.listening, startTalk, stopTalk]);

  // ---- run the paste cleaner (manual button) ----
  const runClean = useCallback(
    (text?: string) => {
      const input = text ?? pasteIn;
      const r = cleanPaste(input);
      setCleaned(r.cleaned);
      setChanges(r.changes);
      setAutoApplied(false);
      setPreCleanText(null);
    },
    [pasteIn]
  );

  // ---- C · Smart Paste Autopilot ----
  // When the operator pastes, ALWAYS compute a clean preview ("Atlas cleaned
  // paste"). If the autoclean preference is on we also apply it into the box
  // (still reversible via Undo). We never execute and never paste elsewhere.
  const onPasteCapture = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pasted = e.clipboardData.getData("text");
      if (!pasted) return;
      setPasteEvents((n) => n + 1);
      const r = cleanPaste(pasted);
      setCleaned(r.cleaned);
      setChanges(r.changes);
      if (autoClean) {
        // intercept the native paste and drop the cleaned text in instead
        e.preventDefault();
        setPreCleanText(pasted);
        setPasteIn(r.cleaned);
        setAutoApplied(true);
      } else {
        // let the raw paste land in the box; just show the preview + offer Accept
        setPreCleanText(pasted);
        setAutoApplied(false);
      }
    },
    [autoClean]
  );

  // Accept the cleaned preview into the paste box (manual path).
  const acceptCleaned = useCallback(() => {
    if (cleaned == null) return;
    setPreCleanText(pasteIn);
    setPasteIn(cleaned);
    setAutoApplied(true);
  }, [cleaned, pasteIn]);

  // Undo restores the exact pre-clean text.
  const undoClean = useCallback(() => {
    if (preCleanText == null) return;
    setPasteIn(preCleanText);
    setPreCleanText(null);
    setAutoApplied(false);
  }, [preCleanText]);

  // ---- submit a command (the only entry point) ----
  const submit = useCallback(
    (rawText?: string, via: VoiceCapture["via"] = "text") => {
      const raw = (rawText ?? command).trim();
      if (!raw) return;
      setOrb("thinking");
      const plan = parseCommand(raw);
      setParsed(plan);

      // record the capture (typed) — speech captures are recorded on final.
      if (via === "text") {
        commitCaptures([makeCapture(raw, "text"), ...loadCaptures()]);
      }

      // create the queued task
      const status: TaskStatus = plan.blocked ? "blocked" : "ready";
      const task = makeTask({
        title: plan.title,
        source: via === "speech" ? "voice · speech" : "voice · text",
        status,
        actionType: plan.actionType,
        body: plan.payload && "body" in plan.payload ? plan.payload.body : undefined
      });
      commit([task, ...loadTasks()]);

      // prepare (NOT auto-run) side effects that are pure-local + reversible
      if (plan.payload) {
        const p = plan.payload;
        if (p.kind === "navigation") {
          navigate(p.to);
        } else if (p.kind === "paste-clean") {
          if (p.mode === "open-panel") {
            pasteRef.current?.focus();
            pasteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            runClean();
          }
        } else if (p.kind === "approval-filter") {
          setQueueFilter("approval");
        } else if (p.kind === "summarize-receipt") {
          const latest = history[0];
          if (latest) {
            const body = receiptNote(latest);
            // overwrite the just-queued task body with the real summary
            commit(
              loadTasks().map((x) =>
                x.id === task.id ? { ...x, title: `Receipt · ${latest.id}`, body } : x
              )
            );
          } else {
            commit(
              loadTasks().map((x) =>
                x.id === task.id
                  ? { ...x, status: "blocked", title: "No receipts yet", body: "Mission history is empty." }
                  : x
              )
            );
          }
        } else if (p.kind === "task-list") {
          const seeds: VoiceTask[] = ["Review inbox", "Draft daily plan", "Check approvals", "Tidy memory"].map(
            (title) => makeTask({ title, source: "voice · task list", status: "pending", actionType: "note" })
          );
          commit([...seeds, ...loadTasks()]);
        }
      }

      setOrb(plan.blocked ? "blocked" : "ready");
      setCommand("");
    },
    [command, commit, commitCaptures, history, navigate, runClean]
  );
  submitRef.current = () => submit();

  // ---- task actions (all local) ----
  const setStatus = (id: string, status: TaskStatus) =>
    commit(loadTasks().map((t) => (t.id === id ? { ...t, status } : t)));
  const removeTask = (id: string) => commit(loadTasks().filter((t) => t.id !== id));
  const createMissionFromTask = (t: VoiceTask) => {
    if (current) return;
    void dispatch(t.body ? `${t.title}\n\n${t.body}` : t.title, "general", "smart", null);
    setStatus(t.id, "done");
  };
  const saveTaskToBrain = (t: VoiceTask) => {
    addMemoryDocs([
      {
        name: t.title.slice(0, 60),
        ext: "md",
        size: (t.body ?? t.title).length,
        body: t.body ?? `# ${t.title}\n\nCaptured via the Operator Voice Console.`
      }
    ]);
    setStatus(t.id, "done");
  };

  // ---- paste cleaner downstream actions ----
  const copyCleaned = () => {
    if (cleaned != null) void navigator.clipboard?.writeText(cleaned).catch(() => undefined);
  };
  const saveCleaned = () => {
    if (cleaned == null) return;
    addMemoryDocs([{ name: "Cleaned paste", ext: "md", size: cleaned.length, body: cleaned }]);
  };
  const missionFromCleaned = () => {
    if (cleaned == null || current) return;
    void dispatch(`Review and act on this cleaned paste:\n\n${cleaned}`, "general", "smart", null);
  };

  const tg = getTelegramBridgeStatus();
  const githubSources = memorySources.filter((s) => s.kind === "github");
  const visibleTasks =
    queueFilter === "approval" ? tasks.filter((t) => t.actionType === "approval") : tasks;

  // recent commands chips · de-duplicated, most recent first (real captures)
  const recentCommands = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of captures) {
      const v = c.text.trim();
      if (!v || seen.has(v.toLowerCase())) continue;
      seen.add(v.toLowerCase());
      out.push(v);
      if (out.length >= 6) break;
    }
    return out;
  }, [captures]);

  // Deck stats — all real local sources; "—" where there is no honest source.
  const marketAlerts = readMarketAlertCount();
  const deck = useMemo<DeckStat[]>(() => {
    const pending = tasks.filter((t) => t.status === "pending").length;
    const latestReceipt = history[0] ?? null;
    return [
      { key: "tasks", label: "tasks", value: String(tasks.length), icon: ScrollText, hint: "queued" },
      { key: "pending", label: "pending", value: String(pending), icon: Clock3, hint: "awaiting" },
      { key: "missions", label: "recent missions", value: String(history.length), icon: Rocket, hint: history[0]?.id ?? "none" },
      {
        key: "receipts",
        label: "receipts",
        value: String(history.length),
        icon: ShieldCheck,
        hint: latestReceipt ? latestReceipt.id : "none"
      },
      { key: "clipboard", label: "clipboard events", value: "—", icon: Clipboard, hint: "untracked" },
      { key: "paste", label: "paste events", value: String(pasteEvents), icon: FileText, hint: "this session" },
      {
        key: "market",
        label: "market alerts",
        value: marketAlerts > 0 ? String(marketAlerts) : "—",
        icon: TrendingUp,
        hint: "intel terminal"
      },
      {
        key: "telegram",
        label: "telegram activity",
        value: tg.live === "live-connected" ? "live" : tg.live === "live-ready" ? "ready" : tg.live === "error" ? "error" : "—",
        icon: Send,
        hint: tg.live === "simulator" ? "simulator" : tg.source
      },
      { key: "voice", label: "voice activity", value: String(captures.length), icon: Mic, hint: "captures" },
      { key: "memory", label: "atlas memory", value: String(memoryDocs.length), icon: Brain, hint: "notes" }
    ];
  }, [tasks, history, pasteEvents, marketAlerts, tg.live, tg.source, captures.length, memoryDocs.length]);

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="voice · operator console"
        title="Operator Voice Console"
        sub="Talk or type. Atlas parses commands into safe, local tasks and prepares actions. Nothing auto-runs — no shell, no filesystem, no desktop control."
        right={
          <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
            remote · {tgLabel(tg.live)}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* LEFT · Memory Context */}
        <MemoryContext
          memoryDocs={memoryDocs}
          history={history}
          githubCount={githubSources.length}
          taskCount={tasks.length}
          captures={captures}
        />

        {/* CENTER · Orb + command + deck + paste */}
        <div className="flex flex-col gap-4">
          <MicActiveBanner active={micActive} />
          <VoiceOrb
            status={orb}
            orbMode={orbMode}
            scene={scene}
            onScene={setScene}
            speech={speech}
            micPermission={micPermission}
            waveform={waveform}
            command={command}
            recentCommands={recentCommands}
            onCommand={setCommand}
            onSubmit={() => submit()}
            onToggleTalk={toggleTalk}
            onOrbActivate={onOrbActivate}
            onMicDown={startTalk}
            onMicUp={stopTalk}
          />
          <CommandDeck stats={deck} />
          <TestConsole />
          <PasteIntelligence
            value={pasteIn}
            onChange={(v) => {
              setPasteIn(v);
              // typing/clearing invalidates a stale undo target
              if (preCleanText != null) setPreCleanText(null);
            }}
            onClean={() => runClean()}
            cleaned={cleaned}
            changes={changes}
            autoApplied={autoApplied}
            canUndo={preCleanText != null}
            autoClean={autoClean}
            onAutoClean={setAutoCleanPref}
            onPasteCapture={onPasteCapture}
            onAccept={acceptCleaned}
            onUndo={undoClean}
            onCopy={copyCleaned}
            onSave={saveCleaned}
            onMission={missionFromCleaned}
            missionBusy={!!current}
            textareaRef={pasteRef}
          />
          <DesktopControl />
        </div>

        {/* RIGHT · Safe Actions */}
        <SafeActions parsed={parsed} />
      </div>

      {/* BOTTOM · Task Queue */}
      <TaskQueue
        tasks={visibleTasks}
        filter={queueFilter}
        onFilter={setQueueFilter}
        onDone={(id) => setStatus(id, "done")}
        onCopy={(t) => void navigator.clipboard?.writeText(t.body ?? t.title).catch(() => undefined)}
        onMission={createMissionFromTask}
        onSave={saveTaskToBrain}
        onDelete={removeTask}
        missionBusy={!!current}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voice Orb
// ---------------------------------------------------------------------------

function VoiceOrb({
  status,
  orbMode,
  scene,
  onScene,
  speech,
  micPermission,
  waveform,
  command,
  recentCommands,
  onCommand,
  onSubmit,
  onToggleTalk,
  onOrbActivate,
  onMicDown,
  onMicUp
}: {
  status: OrbStatus;
  orbMode: AtlasOrbMode;
  scene: AtlasScene;
  onScene: (s: AtlasScene) => void;
  speech: ReturnType<typeof useSpeech>;
  micPermission: MicPermission;
  waveform: ReturnType<typeof useWaveform>;
  command: string;
  recentCommands: string[];
  onCommand: (v: string) => void;
  onSubmit: () => void;
  onToggleTalk: () => void;
  onOrbActivate: () => void;
  onMicDown: () => void;
  onMicUp: () => void;
}) {
  const denied = micPermission === "denied";
  const blocked = status === "blocked" || denied;
  const capturing = waveform.capturing || speech.listening;
  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-gradient-to-b from-black via-zinc-950 to-black p-6 text-white">
      {/* H · Atlas presence scene selector — purely visual */}
      <AtlasModesSelector scene={scene} onScene={onScene} />

      {/* Orb — single tap toggles talk · double-tap commits the command */}
      <button
        type="button"
        onClick={blocked ? undefined : onOrbActivate}
        disabled={blocked || !speech.supported}
        title={
          denied
            ? "Microphone permission denied"
            : speech.supported
            ? speech.listening
              ? "Tap to stop · double-tap to command"
              : "Tap to talk · double-tap to command"
            : "Speech API unavailable"
        }
        className="relative flex h-48 w-48 items-center justify-center rounded-full focus:outline-none disabled:cursor-not-allowed"
      >
        {/* listening halo + wave ring + sound ripple — ONLY while capturing */}
        {capturing && (
          <>
            <span className="atlas-listen-halo pointer-events-none absolute inset-0 rounded-full border border-emerald-400/40" aria-hidden />
            <span className="atlas-wave-ring pointer-events-none absolute inset-2 rounded-full border border-emerald-300/30" aria-hidden />
            <span className="atlas-sound-ripple pointer-events-none absolute inset-6 rounded-full border border-emerald-300/20" aria-hidden />
            <style>{`
              .atlas-listen-halo { animation: atlasHalo 1.8s ease-out infinite; }
              .atlas-wave-ring { animation: atlasHalo 1.8s ease-out infinite; animation-delay: 0.45s; }
              .atlas-sound-ripple { animation: atlasHalo 1.8s ease-out infinite; animation-delay: 0.9s; }
              @keyframes atlasHalo {
                0% { transform: scale(0.86); opacity: 0.85; }
                100% { transform: scale(1.18); opacity: 0; }
              }
              @media (prefers-reduced-motion: reduce) {
                .atlas-listen-halo, .atlas-wave-ring, .atlas-sound-ripple { animation: none !important; opacity: 0.4; }
              }
            `}</style>
          </>
        )}
        <AtlasOrb mode={orbMode} size={184} />
        {/* REAL waveform overlay while capturing (honest analyser data) */}
        {capturing && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <WaveformView samples={waveform.samples} active={waveform.capturing} tone="text-emerald-300" />
          </span>
        )}
        <span className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.24em] text-white/55">
          {status}
        </span>
      </button>

      <div className="flex flex-col items-center gap-0.5 pt-3">
        <span className="text-[13px] font-semibold">Atlas</span>
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
          {speech.supported ? "browser speech API" : "browser speech API unavailable · use text"}
        </span>
        <span
          className={clsx(
            "mt-0.5 font-mono text-[9px] uppercase tracking-wider",
            denied ? "text-rose-300" : micPermission === "granted" ? "text-emerald-300/80" : "text-white/40"
          )}
        >
          mic permission · {micPermission}
        </span>
        {denied && (
          <span className="mt-0.5 max-w-[40ch] text-center text-[10px] text-rose-300">
            microphone blocked · enable it in the browser/site settings to talk · text still works
          </span>
        )}
        {/* Atlas heard: … — the last real transcript */}
        {speech.transcript && (
          <span className="mt-1 max-w-[44ch] text-center text-[11.5px] text-accent/90">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/45">atlas heard · </span>
            “{speech.transcript}”
          </span>
        )}
        {(speech.error || waveform.error) && (
          <span className="mt-0.5 text-[10px] text-rose-300">{speech.error ?? waveform.error}</span>
        )}
      </div>

      {/* mic confidence bar — REAL value only · hidden when unknown */}
      <ConfidenceBar confidence={speech.confidence} />

      {/* push-to-talk (hold) — also works via mouse/touch hold */}
      <button
        type="button"
        disabled={!speech.supported || denied}
        onMouseDown={onMicDown}
        onMouseUp={onMicUp}
        onMouseLeave={() => speech.listening && onMicUp()}
        onTouchStart={onMicDown}
        onTouchEnd={onMicUp}
        className={clsx(
          "inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40",
          speech.listening
            ? "border-emerald-400/50 bg-emerald-500/[0.12] text-emerald-200 shadow-glow"
            : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
        )}
        title={speech.supported ? "Hold to talk" : "Speech API unavailable"}
      >
        {speech.listening ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
        {speech.listening ? "listening · release to send" : "hold to talk"}
      </button>

      {/* affordance hints + wake mode (planned/locked) */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/45">
          tap orb to talk
        </span>
        <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/45">
          hold Space to talk
        </span>
        <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/45">
          double-tap to command
        </span>
        <WakeModeToggle />
      </div>

      {/* recent commands chip row (real captures) */}
      {recentCommands.length > 0 && (
        <div className="flex w-full max-w-[640px] flex-col gap-1">
          <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/40">recent commands</span>
          <div className="flex flex-wrap gap-1">
            {recentCommands.map((c, i) => (
              <button
                key={`${c}-${i}`}
                type="button"
                onClick={() => onCommand(c)}
                title={c}
                className="max-w-[220px] truncate rounded border border-white/8 bg-white/[0.02] px-2 py-0.5 font-mono text-[9px] tracking-wider text-white/55 hover:bg-white/[0.06]"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* text command box (always works) */}
      <div className="flex w-full max-w-[640px] flex-col gap-2">
        <div className="flex items-end gap-2">
          <textarea
            value={command}
            onChange={(e) => onCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            rows={2}
            placeholder="Type a command · e.g. create grocery list · open market lab · clean this code"
            className="min-h-[52px] flex-1 resize-y rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={onSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/[0.1] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15]"
          >
            <Sparkles className="h-3.5 w-3.5" /> parse
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {COMMAND_HINTS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => onCommand(h)}
              className="rounded border border-white/8 bg-white/[0.02] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/45 hover:bg-white/[0.06]"
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* voice-history ribbon — most recent transcribed/typed commands */}
      <VoiceHistoryRibbon recent={recentCommands} onPick={onCommand} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// H · Atlas modes selector — drives the orb mode + label (purely visual)
// ---------------------------------------------------------------------------

function AtlasModesSelector({ scene, onScene }: { scene: AtlasScene; onScene: (s: AtlasScene) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      <span className="mr-1 font-mono text-[8.5px] uppercase tracking-[0.22em] text-white/40">atlas mode</span>
      {ATLAS_SCENES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onScene(id)}
          title={`Atlas presence · ${label} (visual only)`}
          className={clsx(
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
            id === scene
              ? id === "risk"
                ? "border-amber-400/40 bg-amber-500/[0.1] text-amber-200"
                : "border-accent/40 bg-accent/[0.08] text-accent"
              : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
          )}
        >
          <Icon className="h-3 w-3" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mic confidence bar — REAL SpeechRecognition confidence ONLY · hidden when
// the engine does not report it (never a fabricated value).
// ---------------------------------------------------------------------------

function ConfidenceBar({ confidence }: { confidence: number | null }) {
  if (confidence == null) return null;
  const pct = Math.round(confidence * 100);
  const tone = pct >= 75 ? "bg-emerald-400" : pct >= 45 ? "bg-accent" : "bg-amber-400";
  return (
    <div className="flex w-full max-w-[280px] flex-col gap-1">
      <div className="flex items-center justify-between font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/45">
        <span>recognition confidence</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
        <div className={clsx("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voice-history ribbon — a horizontal scroll of recent commands (captures).
// ---------------------------------------------------------------------------

function VoiceHistoryRibbon({ recent, onPick }: { recent: string[]; onPick: (v: string) => void }) {
  if (recent.length === 0) return null;
  return (
    <div className="flex w-full max-w-[640px] flex-col gap-1">
      <span className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/40">
        <Activity className="h-3 w-3 text-accent" /> voice history
      </span>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {recent.map((c, i) => (
          <button
            key={`${c}-${i}`}
            type="button"
            onClick={() => onPick(c)}
            title={c}
            className="shrink-0 rounded-full border border-white/8 bg-white/[0.015] px-2.5 py-1 text-[10.5px] text-white/70 hover:bg-white/[0.06]"
          >
            <span className="mr-1 font-mono text-[8px] text-white/30">{i + 1}</span>
            <span className="inline-block max-w-[160px] truncate align-middle">{c}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MIC ACTIVE banner — large + obvious, ONLY while capturing
// ---------------------------------------------------------------------------

function MicActiveBanner({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      role="status"
      aria-live="assertive"
      className="flex items-center justify-center gap-3 rounded-2xl border border-rose-400/50 bg-rose-500/[0.12] px-4 py-3 shadow-glow"
    >
      <span className="relative flex h-3.5 w-3.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400/70" />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-rose-400" />
      </span>
      <span className="font-mono text-[13px] font-bold uppercase tracking-[0.25em] text-rose-200">
        ● mic active · capturing
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Waveform — REAL bars from the analyser while active, else a static ring
// ---------------------------------------------------------------------------

function WaveformView({ samples, active, tone }: { samples: number[]; active: boolean; tone: string }) {
  if (!active || samples.length === 0) {
    // static idle ring — no animation, no fake data
    return <Waves className={clsx("h-7 w-7", tone)} />;
  }
  const w = 96;
  const h = 36;
  const mid = h / 2;
  const step = w / samples.length;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-accent" aria-hidden>
      {samples.map((v, i) => {
        const barH = Math.max(1.5, v * (h - 4));
        return (
          <rect
            key={i}
            x={i * step}
            y={mid - barH / 2}
            width={Math.max(1, step - 1)}
            height={barH}
            rx={1}
            className="fill-accent"
          />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Wake-sound (clap/tap) — PLANNED · LOCKED · off by default · non-functional
// ---------------------------------------------------------------------------

function WakeModeToggle() {
  return (
    <button
      type="button"
      disabled
      aria-disabled
      title="Planned. Local-only when shipped. Off by default. No always-on / background listening exists today — the mic is active only while held or toggled."
      className="inline-flex cursor-not-allowed items-center gap-1.5 rounded border border-amber-400/25 bg-amber-500/[0.05] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200/80 opacity-70"
    >
      <Lock className="h-3 w-3" />
      <Radio className="h-3 w-3" />
      wake mode · planned · local-only when shipped · off by default
    </button>
  );
}

// ---------------------------------------------------------------------------
// Safe Actions (right)
// ---------------------------------------------------------------------------

function SafeActions({ parsed }: { parsed: ParsedCommand | null }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-white">
      <header className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-accent" />
        <span className="text-[13px] font-semibold">Safe Actions</span>
      </header>
      {!parsed ? (
        <p className="text-[11px] text-white/45">
          Parse a command to preview what Atlas understood and the prepared action. Nothing runs
          until you trigger it from the task queue.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <Field label="understood" value={parsed.understood} />
          <Field label="action" value={parsed.willHappen} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="risk" value={parsed.risk} tone={parsed.risk === "medium" ? "warn" : "ok"} />
            <Field
              label="approval"
              value={parsed.requiresApproval ? "required · locked" : "not required"}
              tone={parsed.requiresApproval ? "warn" : "ok"}
            />
          </div>
          {parsed.blocked && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-500/[0.06] p-2.5">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span className="text-[11px] text-amber-200/90">
                blocked · not understood · try: {COMMAND_HINTS.slice(0, 3).join(" · ")}
              </span>
            </div>
          )}
          <p className="rounded-lg border border-white/8 bg-white/[0.012] p-2 font-mono text-[9px] uppercase tracking-wider text-white/40">
            prepare action only · destructive / system actions always require approval · locked
          </p>
        </div>
      )}
    </section>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.012] p-2">
      <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/40">{label}</span>
      <p
        className={clsx(
          "mt-0.5 text-[11.5px] leading-snug",
          tone === "warn" ? "text-amber-200/90" : tone === "ok" ? "text-emerald-300/85" : "text-white/85"
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Memory Context (left)
// ---------------------------------------------------------------------------

function MemoryContext({
  memoryDocs,
  history,
  githubCount,
  taskCount,
  captures
}: {
  memoryDocs: ReturnType<typeof useAtlasStore.getState>["memoryDocs"];
  history: ReturnType<typeof useMissionStore.getState>["history"];
  githubCount: number;
  taskCount: number;
  captures: VoiceCapture[];
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-white">
      <header className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-accent" />
        <span className="text-[13px] font-semibold">Memory Context</span>
      </header>

      <Block title="recent notes" empty={memoryDocs.length === 0 ? "no notes yet" : undefined}>
        {memoryDocs.slice(0, 4).map((d) => (
          <Line key={d.id} text={d.name} />
        ))}
      </Block>

      <Block title="receipts" empty={history.length === 0 ? "no receipts" : undefined}>
        {history.slice(0, 4).map((r) => (
          <Line key={r.id} text={r.brief.slice(0, 48)} sub={`${r.id} · ${r.score ?? "?"}/100`} />
        ))}
      </Block>

      <Block title="repo">
        <Line text={githubCount > 0 ? `${githubCount} GitHub source(s)` : "no GitHub source connected"} />
      </Block>

      <Block title="tasks">
        <Line text={`${taskCount} queued task(s)`} />
      </Block>

      <Block title="voice captures" empty={captures.length === 0 ? "no captures yet" : undefined}>
        {captures.slice(0, 5).map((c) => (
          <Line key={c.id} text={c.text.slice(0, 44)} sub={c.via} />
        ))}
      </Block>
    </section>
  );
}

function Block({ title, empty, children }: { title: string; empty?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/40">{title}</span>
      {empty ? (
        <span className="font-mono text-[10px] text-white/30">{empty}</span>
      ) : (
        <ul className="flex flex-col gap-0.5">{children}</ul>
      )}
    </div>
  );
}

function Line({ text, sub }: { text: string; sub?: string }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1">
      <span className="min-w-0 flex-1 truncate text-[11px] text-white/80" title={text}>
        {text}
      </span>
      {sub && <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-wider text-white/35">{sub}</span>}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Paste Intelligence
// ---------------------------------------------------------------------------

function PasteIntelligence({
  value,
  onChange,
  onClean,
  cleaned,
  changes,
  autoApplied,
  canUndo,
  autoClean,
  onAutoClean,
  onPasteCapture,
  onAccept,
  onUndo,
  onCopy,
  onSave,
  onMission,
  missionBusy,
  textareaRef
}: {
  value: string;
  onChange: (v: string) => void;
  onClean: () => void;
  cleaned: string | null;
  changes: string[];
  autoApplied: boolean;
  canUndo: boolean;
  autoClean: boolean;
  onAutoClean: (on: boolean) => void;
  onPasteCapture: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onAccept: () => void;
  onUndo: () => void;
  onCopy: () => void;
  onSave: () => void;
  onMission: () => void;
  missionBusy: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const showNotice = cleaned != null;
  const realChanges = changes.filter((c) => !/^no artifacts found/.test(c));
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-white">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clipboard className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold">Paste Intelligence</span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">autopilot</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
          does not change meaning · no execution
        </span>
      </header>

      {/* Remember-for-coding control · persists the autoclean preference */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.012] px-3 py-2">
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          remember for coding? auto-clean future pastes
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onAutoClean(true)}
            className={clsx(
              "rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
              autoClean ? "border-emerald-400/40 bg-emerald-500/[0.1] text-emerald-200" : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
            )}
          >
            yes
          </button>
          <button
            type="button"
            onClick={() => onAutoClean(false)}
            className={clsx(
              "rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
              !autoClean ? "border-accent/40 bg-accent/[0.08] text-accent" : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
            )}
          >
            no
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPasteCapture}
        rows={4}
        placeholder="Paste text or code copied from an AI tool / terminal… Atlas auto-cleans the preview."
        className="min-h-[90px] resize-y rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
      />

      {/* Atlas cleaned-paste notice + Accept/Undo */}
      {showNotice && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/25 bg-accent/[0.06] px-3 py-2">
          <span className="flex items-center gap-1.5 text-[11px] text-accent/90">
            <Sparkles className="h-3.5 w-3.5" />
            Atlas cleaned paste{autoApplied ? " · applied" : " · preview"}
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
              · {realChanges.length} change(s)
            </span>
          </span>
          <div className="flex items-center gap-1.5">
            {!autoApplied && (
              <Btn icon={CheckCircle2} label="accept" onClick={onAccept} accent />
            )}
            <Btn icon={RotateCcw} label="undo" onClick={onUndo} disabled={!canUndo} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Btn icon={Sparkles} label="clean" onClick={onClean} accent />
        <Btn icon={Copy} label="copy cleaned" onClick={onCopy} disabled={cleaned == null} />
        <Btn icon={Brain} label="save cleaned" onClick={onSave} disabled={cleaned == null} />
        <Btn
          icon={Rocket}
          label={missionBusy ? "mission running" : "mission from cleaned"}
          onClick={onMission}
          disabled={cleaned == null || missionBusy}
        />
      </div>

      {cleaned != null && (
        <div className="flex flex-col gap-2">
          {/* removed artifacts highlighted from changes[] */}
          <div className="flex flex-wrap gap-1">
            {realChanges.length === 0 ? (
              <span className="rounded border border-white/8 bg-white/[0.02] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/45">
                already clean · no artifacts
              </span>
            ) : (
              realChanges.map((c, i) => (
                <span
                  key={i}
                  className="rounded border border-amber-400/25 bg-amber-500/[0.06] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200/85"
                >
                  {c}
                </span>
              ))
            )}
          </div>
          {/* before → after preview diff (simple line list) */}
          <PasteDiff before={value} after={cleaned} />
        </div>
      )}
    </section>
  );
}

// A lightweight before→after line list. Lines present in `before` but not in
// `after` are flagged as removed; the rest of `after` is shown as the result.
function PasteDiff({ before, after }: { before: string; after: string }) {
  const afterLines = after.split("\n");
  const afterSet = new Set(afterLines.map((l) => l.trimEnd()));
  const removed = before
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l !== "" && !afterSet.has(l))
    .slice(0, 12);
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/40">removed / changed</span>
        {removed.length === 0 ? (
          <span className="rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 font-mono text-[10px] text-white/40">
            nothing removed
          </span>
        ) : (
          <ul className="flex max-h-[160px] flex-col gap-0.5 overflow-auto">
            {removed.map((l, i) => (
              <li
                key={i}
                className="truncate rounded-md border border-rose-400/20 bg-rose-500/[0.05] px-2 py-0.5 font-mono text-[10.5px] text-rose-200/80 line-through"
                title={l}
              >
                {l}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/40">after</span>
        <pre className="max-h-[160px] overflow-auto rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-[11px] text-white/85">
          {after || "(empty)"}
        </pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// D · Atlas Command Deck — READ-ONLY Jarvis grid from real local state.
// ---------------------------------------------------------------------------

interface DeckStat {
  key: string;
  label: string;
  value: string;
  icon: typeof Activity;
  hint?: string;
}

function CommandDeck({ stats }: { stats: DeckStat[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-white">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold">Atlas Command Deck</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
          read-only · real local state · no fake numbers
        </span>
      </header>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          const dim = s.value === "—";
          return (
            <li
              key={s.key}
              className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.015] p-2.5"
            >
              <span className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/45">
                <Icon className="h-3 w-3 text-accent" />
                {s.label}
              </span>
              <span className={clsx("font-mono text-[18px] tabular-nums", dim ? "text-white/30" : "text-white")}>
                {s.value}
              </span>
              {s.hint && (
                <span className="truncate font-mono text-[8.5px] uppercase tracking-wider text-white/35" title={s.hint}>
                  {s.hint}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="rounded-lg border border-white/8 bg-white/[0.012] p-2 font-mono text-[9px] uppercase tracking-wider text-white/40">
        display only · "—" where there is no honest local source · nothing here executes
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Desktop Control (planned / locked)
// ---------------------------------------------------------------------------

const PLANNED_ACTIONS = [
  "open app",
  "focus window",
  "paste cleaned text",
  "create file",
  "run safe command",
  "open URL",
  "send to Claude",
  "send to Cursor"
];

function DesktopControl() {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-white">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold">Desktop Control</span>
        </div>
        <span className="rounded border border-amber-400/25 bg-amber-500/[0.06] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200">
          planned · locked
        </span>
      </header>
      <ul className="grid grid-cols-2 gap-2">
        {PLANNED_ACTIONS.map((a) => (
          <li
            key={a}
            className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.012] px-2.5 py-2 opacity-60"
          >
            <Lock className="h-3 w-3 text-white/40" />
            <span className="flex-1 text-[11px] text-white/65">{a}</span>
            <span className="font-mono text-[8px] uppercase tracking-wider text-white/35">approval</span>
          </li>
        ))}
      </ul>
      <p className="rounded-lg border border-white/8 bg-white/[0.012] p-2 font-mono text-[9px] uppercase tracking-wider text-white/40">
        prepare action only · copy command / link only · shell + filesystem disabled · destructive disabled
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Task Queue (bottom)
// ---------------------------------------------------------------------------

function TaskQueue({
  tasks,
  filter,
  onFilter,
  onDone,
  onCopy,
  onMission,
  onSave,
  onDelete,
  missionBusy
}: {
  tasks: VoiceTask[];
  filter: "all" | "approval";
  onFilter: (f: "all" | "approval") => void;
  onDone: (id: string) => void;
  onCopy: (t: VoiceTask) => void;
  onMission: (t: VoiceTask) => void;
  onSave: (t: VoiceTask) => void;
  onDelete: (id: string) => void;
  missionBusy: boolean;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-white">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold">Task Queue</span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
            local · persisted · {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(["all", "approval"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFilter(f)}
              className={clsx(
                "rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider transition",
                f === filter
                  ? "border-accent/40 bg-accent/[0.08] text-accent"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </header>
      {tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] px-3 py-4 text-center font-mono text-[10px] uppercase tracking-wider text-white/40">
          no tasks · parse a command to queue one
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onDone={() => onDone(t.id)}
              onCopy={() => onCopy(t)}
              onMission={() => onMission(t)}
              onSave={() => onSave(t)}
              onDelete={() => onDelete(t.id)}
              missionBusy={missionBusy}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskCard({
  task,
  onDone,
  onCopy,
  onMission,
  onSave,
  onDelete,
  missionBusy
}: {
  task: VoiceTask;
  onDone: () => void;
  onCopy: () => void;
  onMission: () => void;
  onSave: () => void;
  onDelete: () => void;
  missionBusy: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.015] p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1 text-[12.5px] font-medium text-white" title={task.title}>
          {task.title}
        </span>
        <StatusPill status={task.status} />
      </div>
      <div className="flex flex-wrap items-center gap-2 font-mono text-[8.5px] uppercase tracking-wider text-white/40">
        <span>{task.source}</span>
        <span>· {task.actionType}</span>
      </div>
      {task.body && (
        <pre className="max-h-[80px] overflow-auto rounded-md border border-white/8 bg-black/40 p-2 font-mono text-[10.5px] text-white/70">
          {task.body}
        </pre>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <Btn icon={CheckCircle2} label="done" onClick={onDone} disabled={task.status === "done"} />
        <Btn icon={Copy} label="copy" onClick={onCopy} />
        <Btn
          icon={Rocket}
          label={missionBusy ? "busy" : "mission"}
          onClick={onMission}
          disabled={missionBusy}
        />
        <Btn icon={Brain} label="brain" onClick={onSave} />
        {confirmDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-md border border-rose-400/40 bg-rose-500/[0.1] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-rose-200 hover:bg-rose-500/[0.18]"
          >
            <Trash2 className="h-3 w-3" /> confirm
          </button>
        ) : (
          <Btn icon={Trash2} label="delete" onClick={() => setConfirmDelete(true)} />
        )}
      </div>
    </li>
  );
}

function StatusPill({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, string> = {
    pending: "border-white/10 bg-white/[0.03] text-white/55",
    ready: "border-accent/30 bg-accent/[0.08] text-accent",
    blocked: "border-amber-400/30 bg-amber-500/[0.08] text-amber-200",
    done: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
  };
  return (
    <span className={clsx("rounded border px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider", map[status])}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Shared button
// ---------------------------------------------------------------------------

function Btn({
  icon: Icon,
  label,
  onClick,
  disabled,
  accent
}: {
  icon: typeof Rocket;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40",
        accent
          ? "border-accent/40 bg-accent/[0.1] text-accent hover:bg-accent/[0.15]"
          : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function receiptNote(r: ReturnType<typeof useMissionStore.getState>["history"][number]): string {
  // Built ONLY from real receipt fields — no fabricated content.
  const lines = [
    `# Receipt ${r.id}`,
    "",
    `- Brief: ${r.brief}`,
    `- Mode: ${r.mode} · Quality: ${r.quality}`,
    r.engine ? `- Engine: ${r.engine}${r.model ? ` · ${r.model}` : ""}` : null,
    r.score != null ? `- Score: ${r.score}/100` : null,
    r.elapsedMs != null ? `- Elapsed: ${r.elapsedMs}ms` : null,
    `- Deliverables: ${r.deliverables.length}`,
    `- Stage: ${r.stage} · Runtime: ${r.runtime}`
  ].filter(Boolean);
  return lines.join("\n");
}

function tgLabel(live: string): string {
  switch (live) {
    case "live-connected":
      return "live · connected";
    case "live-ready":
      return "live · ready";
    case "error":
      return "error";
    default:
      return "simulator";
  }
}

