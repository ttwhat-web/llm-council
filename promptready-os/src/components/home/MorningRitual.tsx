"use client";

/**
 * Morning Ritual · two experiences, not one.
 *
 *  🌅 First Morning — once per Google account, ever. Big. Cinematic.
 *     Genuine staged progress, then a ceremonial summary, then a
 *     shared-element dismissal that lands each real item onto the
 *     exact Home section it came from — never a disconnected cut to
 *     an unrelated screen.
 *
 *  ☀️ Daily Morning — every subsequent morning. A few seconds, over
 *     an already-visible, already-interactive Home. See
 *     DailyMorningBanner.tsx.
 *
 * Both are built entirely on the Morning Run pipeline that already
 * existed and the same `buildRitualSummaryItems` translation — no new
 * detection, no new AI call, no new category invented for either.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useSourcesStore } from "@/store/sources";
import { useMorningRunStore } from "@/store/morningRun";
import { useMorningRitualStore } from "@/store/morningRitual";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import { playReadyChime } from "@/services/audio/chime";
import { buildRitualSummaryItems, RITUAL_TARGET_DOM_ID, type RitualCategoryKey } from "@/services/morningRun/ritualSummary";
import { DailyMorningBanner } from "@/components/home/DailyMorningBanner";

function readFounderNameFallback(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem("operator.user.firstName");
    return v?.trim() || null;
  } catch {
    return null;
  }
}

export function MorningRitual() {
  const googleState = useSourcesStore((s) => s.google.state);
  const selfEmail = useSourcesStore((s) => s.google.selfEmail);
  const sourcesConnected = googleState === "connected" || googleState === "syncing" || googleState === "error";
  const hasSeenFirstMorning = useMorningRitualStore((s) => s.hasSeenFirstMorning(selfEmail));

  if (!sourcesConnected) return null;
  if (!hasSeenFirstMorning) return <FirstMorningRitual selfEmail={selfEmail} />;
  return <DailyMorningBanner selfEmail={selfEmail} />;
}

interface FlyingClone {
  key: RitualCategoryKey;
  color: string;
  label: string;
  style: React.CSSProperties;
}

function FirstMorningRitual({ selfEmail }: { selfEmail: string | null }) {
  const status = useMorningRunStore((s) => s.status);
  const stage = useMorningRunStore((s) => s.stage);
  const lastRun = useMorningRunStore((s) => s.lastRun);
  const run = useMorningRunStore((s) => s.run);
  const markFirstMorningSeen = useMorningRitualStore((s) => s.markFirstMorningSeen);
  const memoryFirstName = useOperatorMemoryStore((s) => s.memory.firstName);

  // Fire this ritual's own run the first time a source is connected —
  // the store's own "one run at a time" guard makes this safe even if
  // Home's separate staleness-triggered auto-run also fires.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void run();
  }, [run]);

  // Every distinct real stage label, in the order it actually happened.
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => {
    if (!stage) return;
    setHistory((h) => (h[h.length - 1] === stage ? h : [...h, stage]));
  }, [stage]);

  const settled = status === "completed" || status === "failed";

  // A soft, once-only cue the moment the ceremony has something to
  // show — best-effort, silently absent if the browser hasn't
  // unlocked audio yet. Never plays for an honest no-op skip.
  const chimedRef = useRef(false);
  useEffect(() => {
    if (settled && !lastRun?.skipped && !chimedRef.current) {
      chimedRef.current = true;
      playReadyChime();
    }
  }, [settled, lastRun]);

  const items = useMemo(() => (lastRun ? buildRitualSummaryItems(lastRun) : []), [lastRun]);
  const rowRefs = useRef<Partial<Record<RitualCategoryKey, HTMLLIElement | null>>>({});

  const [dismissing, setDismissing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [clones, setClones] = useState<FlyingClone[]>([]);

  // "Review Morning" doesn't just close the overlay — every item that
  // has a real matching Home section flies to that section's exact
  // position before the ceremony fades, so Home reads as the ritual's
  // continuation instead of a disconnected cut.
  const onReviewMorning = () => {
    markFirstMorningSeen(selfEmail);
    const flying: FlyingClone[] = [];
    for (const item of items) {
      const targetId = RITUAL_TARGET_DOM_ID[item.key];
      const rowEl = targetId ? rowRefs.current[item.key] : null;
      const targetEl = targetId ? document.getElementById(targetId) : null;
      if (!rowEl || !targetEl) continue;
      const from = rowEl.getBoundingClientRect();
      flying.push({
        key: item.key,
        color: item.color,
        label: item.label,
        style: {
          position: "fixed",
          top: from.top,
          left: from.left,
          width: from.width,
          transform: "translate(0px, 0px)",
          opacity: 1,
          transition: "transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 380ms ease-out"
        }
      });
    }
    setClones(flying);
    setDismissing(true);
    // One frame later, move every clone onto its real Home target and
    // fade it out — the FLIP technique, without a library.
    requestAnimationFrame(() => {
      setClones((prev) =>
        prev.map((c) => {
          const targetId = RITUAL_TARGET_DOM_ID[c.key];
          const rowEl = targetId ? rowRefs.current[c.key] : null;
          const targetEl = targetId ? document.getElementById(targetId) : null;
          if (!rowEl || !targetEl) return c;
          const from = rowEl.getBoundingClientRect();
          const to = targetEl.getBoundingClientRect();
          return {
            ...c,
            style: {
              ...c.style,
              transform: `translate(${to.left - from.left}px, ${to.top - from.top}px)`,
              opacity: 0
            }
          };
        })
      );
    });
    window.setTimeout(() => setDismissed(true), 460);
  };

  if (dismissed) return null;

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

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-graphite-950/95 backdrop-blur transition-opacity duration-300 ${dismissing ? "opacity-0" : "opacity-100"}`}
      >
        <div
          className={`flex w-full max-w-[480px] flex-col gap-6 rounded-3xl border border-white/8 bg-white/[0.018] p-8 shadow-glass transition-all duration-300 ${dismissing ? "scale-[0.98] opacity-0" : "scale-100 opacity-100"}`}
        >
          <header className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">operator</span>
            {founderFirstName && <p className="text-[13px] text-white/50">Good morning, {founderFirstName}.</p>}
            <h2 className="text-[24px] font-semibold leading-tight text-white">Your morning is prepared.</h2>
            <p className="text-[14px] leading-relaxed text-white/65">Here&apos;s what matters.</p>
          </header>

          {items.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {items.map((it) => (
                <li
                  key={it.key}
                  ref={(el) => {
                    rowRefs.current[it.key] = el;
                  }}
                  className="flex items-center gap-3"
                  style={clones.some((c) => c.key === it.key) ? { visibility: "hidden" } : undefined}
                >
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

          <div className="flex flex-col gap-3 pt-1">
            <p className="text-[14px] font-medium text-white/80">Ready?</p>
            <button
              type="button"
              onClick={onReviewMorning}
              className="inline-flex items-center justify-center rounded-xl bg-accent/90 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-glow transition hover:bg-accent"
            >
              Review Morning
            </button>
          </div>
        </div>
      </div>

      {clones.map((c) => (
        <div key={c.key} style={c.style} className="pointer-events-none flex items-center gap-3">
          <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${c.color}`} />
          <span className="text-[14.5px] text-white/85">{c.label}</span>
        </div>
      ))}
    </>
  );
}
