"use client";

/**
 * Calendar Conflicts · the second executor, on Home.
 *
 * Same loop as DraftReplies: detect → prepare a suggested action →
 * approve → execute → undo/receipt, through the one generic Action
 * Queue. Approval chrome is <ActionApproval/> — entirely generic,
 * shared with Gmail. This component only supplies the calendar-
 * specific content (the conflict summary, the swap option).
 *
 * Honest fallbacks:
 *  * No Calendar write scope → says so plainly, points at Settings.
 *    Never prepares an action it already knows will fail.
 *  * Only the soonest conflict is surfaced (matches the briefing
 *    detector) — one clear decision, not a scheduling dashboard.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSourcesStore } from "@/store/sources";
import { findConflictPairs } from "@/services/briefing/detectors";
import { useActionQueue, CALENDAR_MOVE_EXECUTOR_ID } from "@/services/executors";
import { useMemoryCandidatesStore } from "@/store/memoryCandidates";
import { behaviorCandidateFromCalendarMove } from "@/services/memory/candidates";
import { ActionApproval } from "@/components/executors/ActionApproval";

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function CalendarConflicts() {
  const snapshot = useSourcesStore((s) => s.snapshot);
  const calendarWriteGranted = useSourcesStore((s) => s.google.calendarWriteGranted);
  const prepare = useActionQueue((s) => s.prepare);
  const approve = useActionQueue((s) => s.approve);
  const undo = useActionQueue((s) => s.undo);
  const retry = useActionQueue((s) => s.retry);
  const queueItems = useActionQueue((s) => s.items);
  const observeMemoryCandidate = useMemoryCandidatesStore((s) => s.observe);

  const [swapped, setSwapped] = useState(false);

  const conflict = useMemo(() => {
    if (!snapshot) return null;
    return findConflictPairs(snapshot.events, snapshot.syncedAt)[0] ?? null;
  }, [snapshot]);

  // All hooks stay unconditional (Rules of Hooks) — the missing-conflict
  // early return happens after every hook below has been declared.
  const staying = conflict ? (swapped ? conflict.b : conflict.a) : null;
  const moving = conflict ? (swapped ? conflict.a : conflict.b) : null;
  const newStartMs = staying ? staying.endMs : 0;
  const newEndMs = moving ? newStartMs + (moving.endMs - moving.startMs) : 0;
  const queueId = moving ? `${CALENDAR_MOVE_EXECUTOR_ID}:${moving.id}` : null;
  const item = queueId ? queueItems[queueId] : undefined;

  // Fallback for when Morning Run hasn't prepared this yet (or the
  // founder swapped which event moves, pointing at a fresh id) — never
  // block on the pipeline having already run.
  useEffect(() => {
    if (!queueId || !moving || item || !calendarWriteGranted) return;
    prepare({
      id: queueId,
      executor: CALENDAR_MOVE_EXECUTOR_ID,
      params: { eventId: moving.id, calendarId: moving.calendarId, summary: moving.summary, newStartMs, newEndMs }
    });
  }, [queueId, moving, item, calendarWriteGranted, newStartMs, newEndMs, prepare]);

  // Repeated behavior · a real move just executed. The store decides
  // whether this is the 2nd+ time this meeting title needed moving
  // before it's worth asking the founder.
  useEffect(() => {
    if (item?.status === "completed" && moving) {
      observeMemoryCandidate(behaviorCandidateFromCalendarMove({ summary: moving.summary }));
    }
  }, [item?.status, moving, observeMemoryCandidate]);

  if (!conflict || !staying || !moving || !queueId) return null;

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
      ) : (
        <ActionApproval
          action={item}
          onApprove={() => approve(queueId)}
          onUndo={() => undo(queueId)}
          onRetry={() => retry(queueId)}
        >
          <p className="text-[12.5px] leading-relaxed text-white/70">
            Suggested: move &quot;{moving.summary}&quot; to {fmtTime(newStartMs)}–{fmtTime(newEndMs)}, right
            after &quot;{staying.summary}&quot; ends.
          </p>
          <button
            type="button"
            onClick={() => setSwapped((v) => !v)}
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-[11.5px] text-white/80 transition hover:bg-white/[0.08]"
          >
            Move the other one instead
          </button>
        </ActionApproval>
      )}
    </section>
  );
}
