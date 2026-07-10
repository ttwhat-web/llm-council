"use client";

/**
 * Operator Timeline · work already performed, never planned work.
 *
 * Every row comes straight from the Action Queue's own log — real
 * timestamps, real evidence (receipts/errors), no cosmetic events.
 * This is how a founder checks "did Operator actually do something
 * before I got here" without asking.
 */

import { useCallback, useMemo } from "react";
import { History, Download } from "lucide-react";
import { useActionQueue, buildTimeline, type TimelineEntry } from "@/services/executors";

const MAX_SHOWN = 30;

export function TimelineCard() {
  const log = useActionQueue((s) => s.log);
  const items = useActionQueue((s) => s.items);
  const timeline = useMemo(() => buildTimeline(log, items), [log, items]);

  const onExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(timeline, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    el.href = url;
    el.download = `operator-timeline-${ts}.json`;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
    URL.revokeObjectURL(url);
  }, [timeline]);

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-white/[0.025] p-5">
      <header className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.15em] text-white/40">Timeline</span>
        <h2 className="text-[18px] font-semibold tracking-tight text-white">
          <History className="mr-2 inline h-4 w-4 -translate-y-px text-white/65" />
          What Operator actually did
        </h2>
        <p className="text-[12.5px] leading-relaxed text-white/55">
          Real events only, in order — never planned work, never a cosmetic timestamp.
        </p>
      </header>

      {timeline.length === 0 ? (
        <p className="rounded-lg bg-white/[0.02] px-3 py-2.5 text-[12.5px] text-white/45">
          Nothing yet — Operator hasn&apos;t prepared or executed anything on this device.
        </p>
      ) : (
        <ul className="flex flex-col">
          {timeline.slice(0, MAX_SHOWN).map((entry, i) => (
            <TimelineRow key={`${entry.actionId}-${entry.event}-${entry.at}`} entry={entry} first={i === 0} />
          ))}
        </ul>
      )}

      <footer className="flex items-center pt-1">
        <button
          type="button"
          onClick={onExport}
          disabled={timeline.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-[12.5px] font-medium text-white/85 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Export timeline ({timeline.length})
        </button>
      </footer>
    </section>
  );
}

function TimelineRow({ entry, first }: { entry: TimelineEntry; first: boolean }) {
  return (
    <li className={`flex items-baseline gap-3 py-1.5 ${first ? "" : "border-t border-white/[0.03]"}`}>
      <span className="shrink-0 text-[11.5px] tabular-nums text-white/40">{formatTimelineTime(entry.at)}</span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[12.5px] text-white/85">{entry.label}</span>
        {entry.evidence && <span className="truncate text-[11px] text-white/40">{entry.evidence}</span>}
      </span>
    </li>
  );
}

function formatTimelineTime(at: number): string {
  const date = new Date(at);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
