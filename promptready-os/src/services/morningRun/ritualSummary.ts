/**
 * Ritual summary items · the one real translation from a completed
 * MorningRunSummary into "what matters" lines, shared by both the
 * First Morning ceremony and the terse Daily Morning banner so they
 * never drift into two different opinions about the same run.
 *
 * Deliberately excludes any category Operator has no real source for
 * (world-news relevance, email-open tracking) — every line here maps
 * to a real, detector-backed count or flag on the summary itself.
 */

import type { MorningRunSummary } from "./types";

export type RitualCategoryKey = "replies" | "calendar" | "meeting" | "payment" | "archive";

export interface RitualSummaryItem {
  key: RitualCategoryKey;
  color: string;
  label: string;
}

/** DOM ids of the real Home sections each category's ceremony line
 *  can visually "land on" when the ritual dismisses. Categories with
 *  no single matching Home section (payment mail surfaces inside the
 *  Revenue panel, not its own card) are omitted on purpose. */
export const RITUAL_TARGET_DOM_ID: Partial<Record<RitualCategoryKey, string>> = {
  replies: "ritual-target-replies",
  calendar: "ritual-target-calendar",
  archive: "ritual-target-archive"
};

export function buildRitualSummaryItems(run: MorningRunSummary): RitualSummaryItem[] {
  const items: RitualSummaryItem[] = [];
  if (run.draftsGenerated > 0) {
    items.push({
      key: "replies",
      color: "bg-emerald-400",
      label: `${run.draftsGenerated} repl${run.draftsGenerated === 1 ? "y" : "ies"} ready to send`
    });
  }
  if (run.calendarConflictPrepared || run.detectorsFired.includes("calendar-conflict")) {
    items.push({ key: "calendar", color: "bg-amber-300", label: "A calendar conflict needs resolving" });
  }
  if (run.detectorsFired.includes("unprepared-meeting")) {
    items.push({ key: "meeting", color: "bg-amber-300", label: "A meeting has no prep notes yet" });
  }
  if (run.detectorsFired.includes("payment-keyword")) {
    items.push({ key: "payment", color: "bg-sky-300", label: "A payment-related email is waiting on you" });
  }
  if (run.archivedPrepared > 0) {
    items.push({
      key: "archive",
      color: "bg-white/40",
      label: `${run.archivedPrepared} piece${run.archivedPrepared === 1 ? "" : "s"} of inbox noise cleared`
    });
  }
  return items;
}

/** Whether anything in this run needs the founder's attention today —
 *  the daily banner's honest "risk" line depends on this, not on a
 *  fabricated risk score. */
export function ritualHasAttentionNeeded(run: MorningRunSummary): boolean {
  return (
    run.calendarConflictPrepared ||
    run.detectorsFired.includes("calendar-conflict") ||
    run.detectorsFired.includes("unprepared-meeting")
  );
}
