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
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clipboard,
  Copy,
  Lock,
  Mic,
  MicOff,
  Rocket,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Trash2,
  Waves
} from "lucide-react";

import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";
import { cleanPaste } from "@/services/pasteClean";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { useBrainStore } from "@/store/brain";
import { getTelegramBridgeStatus } from "@/services/telegramLive";

import { parseCommand, COMMAND_HINTS, type ParsedCommand } from "./commandParser";
import { useSpeech } from "./useSpeech";
import {
  loadTasks,
  saveTasks,
  makeTask,
  loadCaptures,
  saveCaptures,
  makeCapture,
  type VoiceTask,
  type VoiceCapture,
  type TaskStatus
} from "./voiceTasks";

type OrbStatus = "idle" | "listening" | "thinking" | "ready" | "blocked";

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

  // paste cleaner
  const [pasteIn, setPasteIn] = useState("");
  const [cleaned, setCleaned] = useState<string | null>(null);
  const [changes, setChanges] = useState<string[]>([]);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  // speech
  const onSpeechFinal = useCallback((text: string) => {
    setCommand(text);
    commitCaptures([makeCapture(text, "speech"), ...loadCaptures()]);
  }, [commitCaptures]);
  const speech = useSpeech(onSpeechFinal);

  useEffect(() => {
    if (speech.listening) setOrb("listening");
    else if (orb === "listening") setOrb("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.listening]);

  // ---- run the paste cleaner ----
  const runClean = useCallback(
    (text?: string) => {
      const input = text ?? pasteIn;
      const r = cleanPaste(input);
      setCleaned(r.cleaned);
      setChanges(r.changes);
    },
    [pasteIn]
  );

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

        {/* CENTER · Orb + command + paste */}
        <div className="flex flex-col gap-4">
          <VoiceOrb
            status={orb}
            speech={speech}
            command={command}
            onCommand={setCommand}
            onSubmit={() => submit()}
            onMicDown={() => (speech.supported ? speech.start() : undefined)}
            onMicUp={() => speech.stop()}
          />
          <PasteIntelligence
            value={pasteIn}
            onChange={setPasteIn}
            onClean={() => runClean()}
            cleaned={cleaned}
            changes={changes}
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
  speech,
  command,
  onCommand,
  onSubmit,
  onMicDown,
  onMicUp
}: {
  status: OrbStatus;
  speech: ReturnType<typeof useSpeech>;
  command: string;
  onCommand: (v: string) => void;
  onSubmit: () => void;
  onMicDown: () => void;
  onMicUp: () => void;
}) {
  const tone = orbTone(status);
  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-gradient-to-b from-black via-zinc-950 to-black p-6 text-white">
      <div className="relative flex h-44 w-44 items-center justify-center">
        {/* halo rings */}
        <span
          className={clsx(
            "absolute inset-0 rounded-full border",
            status === "listening" ? "animate-ping border-accent/40" : "border-white/5"
          )}
        />
        <span className={clsx("absolute inset-3 rounded-full border", tone.ring)} />
        <div
          className={clsx(
            "flex h-32 w-32 flex-col items-center justify-center rounded-full border text-center transition",
            tone.core
          )}
        >
          <Waves className={clsx("h-7 w-7", tone.icon)} />
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-white/55">
            {status}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[13px] font-semibold">Atlas listening</span>
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
          {speech.supported ? "browser speech API" : "browser speech API unavailable · use text"}
        </span>
        {speech.transcript && (
          <span className="mt-1 max-w-[40ch] text-center text-[11px] text-accent/90">“{speech.transcript}”</span>
        )}
        {speech.error && <span className="mt-0.5 text-[10px] text-rose-300">{speech.error}</span>}
      </div>

      {/* push-to-talk */}
      <button
        type="button"
        disabled={!speech.supported}
        onMouseDown={onMicDown}
        onMouseUp={onMicUp}
        onMouseLeave={() => speech.listening && onMicUp()}
        onTouchStart={onMicDown}
        onTouchEnd={onMicUp}
        className={clsx(
          "inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40",
          speech.listening
            ? "border-accent/50 bg-accent/[0.12] text-accent shadow-glow"
            : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
        )}
        title={speech.supported ? "Hold to talk" : "Speech API unavailable"}
      >
        {speech.listening ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
        {speech.listening ? "listening · release to send" : "hold to talk"}
      </button>

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
    </section>
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
  onCopy: () => void;
  onSave: () => void;
  onMission: () => void;
  missionBusy: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-white">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clipboard className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold">Paste Intelligence</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
          does not change meaning · no execution
        </span>
      </header>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Paste text or code copied from an AI tool / terminal…"
        className="min-h-[90px] resize-y rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
      />
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
          <div className="flex flex-wrap gap-1">
            {changes.map((c, i) => (
              <span
                key={i}
                className="rounded border border-white/8 bg-white/[0.02] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55"
              >
                {c}
              </span>
            ))}
          </div>
          <pre className="max-h-[180px] overflow-auto rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-[11.5px] text-white/85">
            {cleaned || "(empty)"}
          </pre>
        </div>
      )}
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

function orbTone(status: OrbStatus): { ring: string; core: string; icon: string } {
  switch (status) {
    case "listening":
      return {
        ring: "border-accent/40",
        core: "border-accent/50 bg-accent/[0.1] shadow-glow",
        icon: "text-accent"
      };
    case "thinking":
      return {
        ring: "border-sky-400/30",
        core: "border-sky-400/40 bg-sky-500/[0.08]",
        icon: "text-sky-300"
      };
    case "ready":
      return {
        ring: "border-emerald-400/30",
        core: "border-emerald-400/40 bg-emerald-500/[0.08]",
        icon: "text-emerald-300"
      };
    case "blocked":
      return {
        ring: "border-amber-400/30",
        core: "border-amber-400/40 bg-amber-500/[0.08]",
        icon: "text-amber-300"
      };
    default:
      return {
        ring: "border-white/10",
        core: "border-white/10 bg-white/[0.03]",
        icon: "text-white/60"
      };
  }
}
