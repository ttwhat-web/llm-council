"use client";

/**
 * Morning Ritual · the first "Operator worked while you weren't
 * looking" moment.
 *
 * Built entirely on the Morning Run pipeline that already existed —
 * this component adds no new detection, no new AI call, no new
 * category. It only makes the real work visible: genuine staged
 * progress (from the orchestrator's own onStage callback, so a label
 * only ever appears once that stage's real work is actually running),
 * then a ceremonial summary built strictly from real, detector-backed
 * counts (`lastRun.draftsGenerated`, `.archivedPrepared`,
 * `.calendarConflictPrepared`, `.detectorsFired`).
 *
 * Two categories the founder-facing spec imagined — world-news
 * relevance ("OpenAI announced something") and email-open tracking
 * ("Hans opened your proposal") — have no real data source anywhere
 * in Operator today, so they're not here. Faking either would violate
 * the one rule this whole product is built on: never invent evidence.
 *
 * Shown once — the first time Gmail + Calendar connect
 * (`useMorningRitualStore`) — then never again. "Review Morning"
 * dismisses the overlay onto the exact same Home underneath
 * (DraftReplies / CalendarConflicts / MorningCompleteCard), already
 * populated by the same run this overlay just showed.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useSourcesStore } from "@/store/sources";
import { useMorningRunStore } from "@/store/morningRun";
import { useMorningRitualStore } from "@/store/morningRitual";
import { useOperatorMemoryStore } from "@/store/operatorMemory";

function readFounderNameFallback(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem("operator.user.firstName");
    return v?.trim() || null;
  } catch {
    return null;
  }
}

interface SummaryItem {
  color: string;
  label: string;
}

export function MorningRitual() {
  const googleState = useSourcesStore((s) => s.google.state);
  const sourcesConnected = googleState === "connected" || googleState === "syncing" || googleState === "error";

  const seen = useMorningRitualStore((s) => s.seen);
  const markSeen = useMorningRitualStore((s) => s.markSeen);

  const status = useMorningRunStore((s) => s.status);
  const stage = useMorningRunStore((s) => s.stage);
  const lastRun = useMorningRunStore((s) => s.lastRun);
  const run = useMorningRunStore((s) => s.run);

  const memoryFirstName = useOperatorMemoryStore((s) => s.memory.firstName);

  // Fire the ritual's own run the first time a source is connected —
  // the store's own "one run at a time" guard makes this safe even if
  // Home's separate staleness-triggered auto-run also fires.
  const startedRef = useRef(false);
  useEffect(() => {
    if (seen || !sourcesConnected || startedRef.current) return;
    startedRef.current = true;
    void run();
  }, [seen, sourcesConnected, run]);

  // Every distinct real stage label, in the order it actually happened.
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => {
    if (!stage) return;
    setHistory((h) => (h[h.length - 1] === stage ? h : [...h, stage]));
  }, [stage]);

  if (seen || !sourcesConnected || !startedRef.current) return null;

  const settled = status === "completed" || status === "failed";

  if (!settled) {
    if (history.length === 0) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-graphite-950/95 backdrop-blur">
        <div className="flex w-full max-w-[440px] flex-col gap-5 px-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">operator</span>
          <ol className="flex flex-col gap-2.5">
            {history.map((label, i) => {
              const active = i === history.length - 1;
              return (
                <li key={`${label}-${i}`} className="flex items-center gap-3">
                  {active ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />
                  ) : (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  )}
                  <span className={active ? "text-[15px] text-white" : "text-[14px] text-white/40"}>{label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    );
  }

  // Nothing was actually connected long enough to say anything real —
  // don't stage a ceremony over an honest no-op.
  if (lastRun?.skipped) return null;

  const founderFirstName = memoryFirstName?.trim() || readFounderNameFallback();
  const greeting = founderFirstName ? `Good morning, ${founderFirstName}.` : "Good morning.";

  const items: SummaryItem[] = [];
  if (lastRun) {
    if (lastRun.draftsGenerated > 0) {
      items.push({
        color: "bg-emerald-400",
        label: `${lastRun.draftsGenerated} repl${lastRun.draftsGenerated === 1 ? "y" : "ies"} ready to send`
      });
    }
    if (lastRun.calendarConflictPrepared || lastRun.detectorsFired.includes("calendar-conflict")) {
      items.push({ color: "bg-amber-300", label: "A calendar conflict needs resolving" });
    }
    if (lastRun.detectorsFired.includes("unprepared-meeting")) {
      items.push({ color: "bg-amber-300", label: "A meeting has no prep notes yet" });
    }
    if (lastRun.detectorsFired.includes("payment-keyword")) {
      items.push({ color: "bg-sky-300", label: "A payment-related email is waiting on you" });
    }
    if (lastRun.archivedPrepared > 0) {
      items.push({
        color: "bg-white/40",
        label: `${lastRun.archivedPrepared} piece${lastRun.archivedPrepared === 1 ? "" : "s"} of inbox noise cleared`
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-graphite-950/95 backdrop-blur">
      <div className="flex w-full max-w-[480px] flex-col gap-6 rounded-3xl border border-white/8 bg-white/[0.018] p-8 shadow-glass">
        <header className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">operator</span>
          <h2 className="text-[24px] font-semibold leading-tight text-white">{greeting}</h2>
          <p className="text-[14px] leading-relaxed text-white/65">I reviewed your morning. Here&apos;s what matters.</p>
        </header>

        {items.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-3">
                <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${it.color}`} />
                <span className="text-[14.5px] text-white/85">{it.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] leading-relaxed text-white/55">
            Nothing urgent this morning — I looked at your inbox and calendar and it&apos;s clear.
          </p>
        )}

        {lastRun?.operatorRead && (
          <p className="text-[13px] italic leading-relaxed text-white/50">{lastRun.operatorRead}</p>
        )}

        <button
          type="button"
          onClick={markSeen}
          className="inline-flex items-center justify-center rounded-xl bg-accent/90 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-glow transition hover:bg-accent"
        >
          Review Morning
        </button>
      </div>
    </div>
  );
}
