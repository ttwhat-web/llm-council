"use client";

/**
 * Calendar Conflicts · the second executor, on Home.
 *
 * Same loop as DraftReplies: detect → prepare a suggested action →
 * approve → execute → undo/receipt. Proves the orchestrator isn't
 * email-shaped — Calendar is a distinct executor behind the same
 * approve → 30s-undo → receipt spine.
 *
 * Honest fallbacks:
 *  * No Calendar write scope → says so plainly, points at Settings.
 *    Never queues an action it already knows will fail.
 *  * Only the soonest conflict is surfaced (matches the briefing
 *    detector) — one clear decision, not a scheduling dashboard.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { useSourcesStore } from "@/store/sources";
import { findConflictPairs } from "@/services/briefing/detectors";
import { useActionQueue, undoSecondsLeft, CALENDAR_MOVE_EXECUTOR_ID } from "@/services/executors";
import { ReceiptLine } from "@/components/home/DraftControls";

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function CalendarConflicts() {
  const snapshot = useSourcesStore((s) => s.snapshot);
  const calendarWriteGranted = useSourcesStore((s) => s.google.calendarWriteGranted);
  const approve = useActionQueue((s) => s.approve);
  const undo = useActionQueue((s) => s.undo);
  const queueItems = useActionQueue((s) => s.items);

  const [swapped, setSwapped] = useState(false);
  // Re-render every second while a move is in its undo window.
  const [, force] = useState(0);

  const conflict = useMemo(() => {
    if (!snapshot) return null;
    return findConflictPairs(snapshot.events, snapshot.syncedAt)[0] ?? null;
  }, [snapshot]);

  if (!conflict) return null;

  const staying = swapped ? conflict.b : conflict.a;
  const moving = swapped ? conflict.a : conflict.b;
  const duration = moving.endMs - moving.startMs;
  const newStartMs = staying.endMs;
  const newEndMs = newStartMs + duration;

  const queueId = `${CALENDAR_MOVE_EXECUTOR_ID}:${moving.id}`;
  const item = queueItems[queueId];

  useEffect(() => {
    if (item?.status !== "queued") return;
    const t = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [item?.status]);

  const onApprove = () => {
    approve({
      id: queueId,
      executorId: CALENDAR_MOVE_EXECUTOR_ID,
      params: {
        eventId: moving.id,
        calendarId: moving.calendarId,
        summary: moving.summary,
        newStartMs,
        newEndMs
      }
    });
  };

  return (
    <section className="flex flex-col gap-2 rounded-xl bg-white/[0.018] p-4">
      <p className="text-[13px] font-medium text-white">
        {fmtTime(conflict.a.startMs)} — two meetings overlap: &quot;{conflict.a.summary}&quot; and &quot;
        {conflict.b.summary}&quot;.
      </p>

      {!calendarWriteGranted ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[12.5px] leading-relaxed text-amber-200/85">
            Requires Calendar write permission.
          </p>
          <Link
            to="/settings"
            className="self-start text-[12.5px] font-medium text-white transition hover:text-white/80"
          >
            ▸ Grant it in Settings
          </Link>
        </div>
      ) : item?.status === "queued" ? (
        <ReceiptLine tone="amber">
          Moving &quot;{moving.summary}&quot; to {fmtTime(newStartMs)} in {undoSecondsLeft(item)}s…
          <button type="button" onClick={() => undo(queueId)} className="ml-2 underline-offset-2 hover:underline">
            Undo
          </button>
        </ReceiptLine>
      ) : item?.status === "executing" ? (
        <ReceiptLine tone="amber">Moving &quot;{moving.summary}&quot;…</ReceiptLine>
      ) : item?.status === "done" ? (
        <ReceiptLine tone="emerald">✓ {item.receipt ?? `Moved to ${fmtTime(newStartMs)}.`}</ReceiptLine>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[12.5px] leading-relaxed text-white/70">
            Suggested: move &quot;{moving.summary}&quot; to {fmtTime(newStartMs)}–{fmtTime(newEndMs)}, right
            after &quot;{staying.summary}&quot; ends.
            {item?.status === "error" && (
              <span className="ml-1 text-rose-200">Failed last time · {item.error}</span>
            )}
            {item?.status === "undone" && <span className="ml-1 text-white/45">Not moved.</span>}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onApprove}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-[12px] font-semibold text-black transition hover:bg-white/90"
            >
              <Check className="h-3.5 w-3.5" /> Approve move
            </button>
            <button
              type="button"
              onClick={() => setSwapped((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-[11.5px] text-white/80 transition hover:bg-white/[0.08]"
            >
              Move the other one instead
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
