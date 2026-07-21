"use client";

/**
 * Daily Morning · every morning after the first.
 *
 * A few seconds, not a scene. Home is already visible and interactive
 * underneath — this is a toast, not a takeover. Riding the exact same
 * Morning Run pipeline and auto-trigger Home already has (no new
 * "when should I run" logic here); this component only decides
 * whether today's completed run deserves a one-line acknowledgement,
 * and never repeats it twice in the same calendar day for the same
 * account.
 */

import { useEffect, useRef, useState } from "react";
import { useMorningRunStore } from "@/store/morningRun";
import { useMorningRitualStore, localDateKey } from "@/store/morningRitual";
import { playReadyChime } from "@/services/audio/chime";
import { ritualHasAttentionNeeded } from "@/services/morningRun/ritualSummary";

const VISIBLE_MS = 5000;

export function DailyMorningBanner({ selfEmail }: { selfEmail: string | null }) {
  const status = useMorningRunStore((s) => s.status);
  const lastRun = useMorningRunStore((s) => s.lastRun);
  const hasSeenToday = useMorningRitualStore((s) =>
    s.hasSeenDailyBannerToday(selfEmail, localDateKey(new Date()))
  );
  const firstMorningDateKey = useMorningRitualStore((s) => s.firstMorningSeenDateKey(selfEmail));
  const markShown = useMorningRitualStore((s) => s.markDailyBannerShown);

  const [phase, setPhase] = useState<"hidden" | "shown" | "leaving">("hidden");
  const firedRef = useRef(false);
  // A "completed" status can be leftover from the run that just
  // powered First Morning, inherited the instant this component
  // mounts (switching over from the ceremony). That's not a new
  // morning — only react to a completion this component watched
  // happen (running → completed) while it was actually mounted.
  const sawRunningRef = useRef(false);
  useEffect(() => {
    if (status === "running") sawRunningRef.current = true;
  }, [status]);

  // Timers live in refs, cleared only on real unmount — NOT as this
  // effect's own cleanup. markShown() below flips `hasSeenToday`,
  // which is one of this effect's dependencies: if the cleanup were
  // tied to this effect, React's re-run-on-dependency-change would
  // fire that cleanup immediately after scheduling, cancelling both
  // timers before they ever ran. `firedRef` already makes the body
  // itself a true one-shot, so this effect deliberately owns no
  // teardown of its own.
  const leaveTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (leaveTimerRef.current != null) window.clearTimeout(leaveTimerRef.current);
      if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (firedRef.current) return;
    if (status !== "completed") return;
    if (!sawRunningRef.current) return;
    if (!lastRun || lastRun.skipped) return;
    const today = localDateKey(new Date());
    if (hasSeenToday) return;
    // Never double up with the ceremony that just ran today.
    if (firstMorningDateKey === today) return;
    firedRef.current = true;
    markShown(selfEmail, today);
    setPhase("shown");
    playReadyChime();
    leaveTimerRef.current = window.setTimeout(() => setPhase("leaving"), VISIBLE_MS);
    hideTimerRef.current = window.setTimeout(() => setPhase("hidden"), VISIBLE_MS + 260);
  }, [status, lastRun, hasSeenToday, firstMorningDateKey, markShown, selfEmail]);

  if (phase === "hidden" || !lastRun) return null;

  const lines: string[] = [];
  if (lastRun.draftsGenerated > 0) {
    lines.push(`${lastRun.draftsGenerated} repl${lastRun.draftsGenerated === 1 ? "y" : "ies"} prepared.`);
  }
  lines.push(ritualHasAttentionNeeded(lastRun) ? "1 meeting needs attention." : "No urgent risks.");

  return (
    <div
      role="status"
      aria-label="Daily morning summary"
      className="pointer-events-none fixed left-1/2 top-6 z-50 w-full max-w-[360px] -translate-x-1/2"
    >
      <div
        className={`flex flex-col gap-1 rounded-2xl border border-white/8 bg-graphite-900/95 px-5 py-4 shadow-glass backdrop-blur transition-all duration-300 ${
          phase === "leaving" ? "-translate-y-1 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <p className="text-[14px] font-semibold text-white">Good morning.</p>
        {lines.map((l, i) => (
          <p key={i} className="text-[13px] text-white/70">
            {l}
          </p>
        ))}
        <p className="pt-1 text-[12px] text-white/45">Ready when you are.</p>
      </div>
    </div>
  );
}
