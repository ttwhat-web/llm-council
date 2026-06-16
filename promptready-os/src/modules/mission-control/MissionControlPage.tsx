"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CornerDownLeft,
  FileText,
  Loader,
  X
} from "lucide-react";
import {
  useMissionStore,
  STAGES,
  STAGE_META,
  type MissionStage,
  type MissionReceipt
} from "@/store/mission";
import { useBrainStore } from "@/store/brain";

/**
 * Console · the dispatch surface.
 *
 * Single calm column. One input you type into, one button to dispatch,
 * one quiet trace below it while a mission runs, and a short list of
 * recent missions you can re-open. No three-column cockpit, no brain
 * graph wallpaper, no archive jump rails — those live elsewhere.
 */

const MODES = ["auto", "claude", "chatgpt", "gemini", "cursor", "local"] as const;
const QUALITIES = ["fast", "smart", "expert"] as const;

type Mode = (typeof MODES)[number];
type Quality = (typeof QUALITIES)[number];

const SUGGESTIONS = [
  "Draft an investor update for this quarter.",
  "Summarise this stack trace and propose a fix.",
  "Plan a 3-day product spike for X.",
  "Rewrite this messy prompt into a sharp brief."
];

export default function MissionControlPage() {
  const [brief, setBrief] = useState("");
  const [mode, setMode] = useState<Mode>("auto");
  const [quality, setQuality] = useState<Quality>("fast");
  const [openMission, setOpenMission] = useState<MissionReceipt | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const current = useMissionStore((s) => s.current);
  const history = useMissionStore((s) => s.history);
  const dispatch = useMissionStore((s) => s.dispatch);
  const cancel = useMissionStore((s) => s.cancel);
  const identity = useBrainStore((s) => s.identity);

  const firstName = identity?.name?.split(/\s+/)[0] ?? "Operator";
  const inFlight =
    !!current && current.stage !== "deliverable-ready" && current.stage !== "idle";

  // autosize textarea
  useEffect(() => {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 320)}px`;
  }, [brief]);

  const onDispatch = useCallback(() => {
    const trimmed = brief.trim();
    if (!trimmed || inFlight) return;
    void dispatch(trimmed, mode, quality, null);
    setBrief("");
  }, [brief, dispatch, inFlight, mode, quality]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onDispatch();
    }
  };

  const recent = useMemo(() => history.slice(0, 6), [history]);

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-10 px-6 py-12 md:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-white">
          What should we ship, {firstName}?
        </h1>
        <p className="text-[14px] leading-relaxed text-white/55">
          Type a brief. Operator Center routes it, picks a model, and returns named deliverables.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <div className="rounded-2xl bg-white/[0.03] p-3 transition focus-within:bg-white/[0.045]">
          <textarea
            ref={textareaRef}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tell Operator Center what you need…"
            rows={3}
            aria-label="Mission brief"
            className="min-h-[88px] w-full resize-none bg-transparent text-[15px] leading-relaxed text-white placeholder:text-white/35 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ChipSelect label="Mode" value={mode} options={MODES} onChange={(v) => setMode(v as Mode)} />
            <ChipSelect
              label="Quality"
              value={quality}
              options={QUALITIES}
              onChange={(v) => setQuality(v as Quality)}
            />
            <span className="ml-auto flex items-center gap-2">
              {inFlight && (
                <button
                  type="button"
                  onClick={cancel}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] text-white/55 transition hover:text-white"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              )}
              <button
                type="button"
                onClick={onDispatch}
                disabled={!brief.trim() || inFlight}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/45"
              >
                {inFlight ? (
                  <>
                    <Loader className="h-3.5 w-3.5 animate-spin" /> Working…
                  </>
                ) : (
                  <>
                    Dispatch
                    <span className="hidden items-center gap-0.5 text-[11px] font-normal text-black/50 sm:inline-flex">
                      <CornerDownLeft className="h-3 w-3" /> ⌘
                    </span>
                  </>
                )}
              </button>
            </span>
          </div>
        </div>

        {brief.trim().length === 0 && !current && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => {
                    setBrief(s);
                    textareaRef.current?.focus();
                  }}
                  className="rounded-full bg-white/[0.025] px-3 py-1.5 text-[12.5px] text-white/65 transition hover:bg-white/[0.05] hover:text-white"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {current && (
        <ActiveMission
          mission={current}
          onOpenReceipt={() => setOpenMission(current)}
        />
      )}

      {recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[13px] font-medium text-white/45">Recent</h2>
          <ul className="flex flex-col">
            {recent.map((m, i) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setOpenMission(m)}
                  className={clsx(
                    "flex w-full items-center justify-between gap-3 py-3 text-left transition hover:bg-white/[0.02]",
                    i > 0 && "border-t border-white/[0.04]"
                  )}
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="line-clamp-1 text-[14px] text-white/90">{m.brief || "(empty brief)"}</span>
                    <span className="text-[11.5px] text-white/40">
                      {m.deliverables.length} deliverable{m.deliverables.length === 1 ? "" : "s"} ·
                      {" "}
                      {formatRelative(m.endedAt ?? m.startedAt)}
                      {m.score != null && <> · score {m.score}/100</>}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {openMission && (
        <ReceiptSheet receipt={openMission} onClose={() => setOpenMission(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active mission · quiet inline trace
// ---------------------------------------------------------------------------

function ActiveMission({
  mission,
  onOpenReceipt
}: {
  mission: MissionReceipt;
  onOpenReceipt: () => void;
}) {
  const done = mission.stage === "deliverable-ready";
  const stageIndex = STAGES.indexOf(mission.stage);

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white/[0.018] p-4">
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            "h-1.5 w-1.5 rounded-full",
            done ? "bg-emerald-300" : "animate-pulse bg-accent"
          )}
        />
        <span className="text-[13px] font-medium text-white/85">
          {done ? "Mission complete" : STAGE_META[mission.stage].label}
        </span>
        <span className="ml-auto text-[11.5px] text-white/35">{mission.id}</span>
      </div>
      <p className="line-clamp-2 text-[13px] text-white/55">{mission.brief}</p>

      <ol className="flex flex-col">
        {STAGES.filter((s) => s !== "idle").map((s, i) => {
          const reached = STAGES.indexOf(s) <= stageIndex || done;
          const active = mission.stage === s && !done;
          return (
            <li
              key={s}
              className={clsx(
                "flex items-center gap-3 py-1.5 text-[12.5px]",
                reached ? "text-white/80" : "text-white/30"
              )}
            >
              <span
                className={clsx(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]",
                  active
                    ? "bg-accent text-black"
                    : reached
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-white/[0.05] text-white/35"
                )}
              >
                {reached && !active ? "✓" : i + 1}
              </span>
              <span>{STAGE_META[s].label}</span>
            </li>
          );
        })}
      </ol>

      {done && (
        <div className="flex items-center gap-3 pt-1">
          <span className="text-[12.5px] text-white/65">
            {mission.deliverables.length} deliverable{mission.deliverables.length === 1 ? "" : "s"} ready
          </span>
          <button
            type="button"
            onClick={onOpenReceipt}
            className="ml-auto inline-flex items-center gap-1 text-[12.5px] text-white/85 transition hover:text-white"
          >
            Open receipt <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Receipt sheet (slide-over)
// ---------------------------------------------------------------------------

function ReceiptSheet({ receipt, onClose }: { receipt: MissionReceipt; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label={`Mission ${receipt.id}`}
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/45" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative ml-auto flex h-full w-full max-w-[640px] flex-col gap-5 overflow-y-auto bg-[#0c0e13] px-6 py-6 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[11px] text-white/40">{receipt.id}</span>
            <h2 className="line-clamp-2 text-[18px] font-semibold leading-snug text-white">
              {receipt.brief || "(empty brief)"}
            </h2>
            <span className="text-[12px] text-white/45">
              {receipt.mode} · {receipt.quality}
              {receipt.score != null && <> · score {receipt.score}/100</>}
              {receipt.elapsedMs != null && <> · {(receipt.elapsedMs / 1000).toFixed(1)}s</>}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-white/55 transition hover:bg-white/[0.05] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <section className="flex flex-col gap-2">
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-white/35">
            Deliverables
          </h3>
          {receipt.deliverables.length === 0 ? (
            <p className="text-[13px] text-white/45">No deliverables.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {receipt.deliverables.map((d) => (
                <DeliverableRow key={d.id} label={d.label} blurb={d.blurb} content={d.content} />
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-white/35">
            Trace
          </h3>
          <ul className="flex flex-col gap-1">
            {receipt.events.slice(-12).map((e, i) => (
              <li key={i} className="flex items-baseline gap-2 text-[12px]">
                <span className="text-white/35">{new Date(e.at).toLocaleTimeString("en-GB", { hour12: false })}</span>
                <span
                  className={clsx(
                    "shrink-0",
                    e.kind === "ok"
                      ? "text-emerald-300/80"
                      : e.kind === "warn"
                        ? "text-amber-300/80"
                        : e.kind === "err"
                          ? "text-rose-300/80"
                          : "text-white/45"
                  )}
                >
                  {e.tag}
                </span>
                <span className="min-w-0 flex-1 text-white/70">{e.message}</span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-auto flex flex-wrap items-center gap-3 pt-4">
          <Link
            to="/library"
            onClick={onClose}
            className="inline-flex items-center gap-1 text-[12.5px] text-white/55 transition hover:text-white"
          >
            <FileText className="h-3.5 w-3.5" /> Open in Library
          </Link>
        </footer>
      </aside>
    </div>
  );
}

function DeliverableRow({ label, blurb, content }: { label: string; blurb: string; content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl bg-white/[0.025] p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13.5px] font-medium text-white">{label}</span>
          <span className="line-clamp-1 text-[12px] text-white/50">{blurb}</span>
        </span>
        <ChevronDown
          className={clsx(
            "h-4 w-4 shrink-0 text-white/40 transition",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <pre className="mt-3 max-h-[260px] overflow-auto rounded-lg bg-black/40 p-3 text-[12px] leading-relaxed text-white/85">
          {content}
        </pre>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Chip select
// ---------------------------------------------------------------------------

function ChipSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1 text-[12px] text-white/65 transition hover:bg-white/[0.06]">
      <span className="text-white/40">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-white focus:outline-none"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#0c0e13]">
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

function formatRelative(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

