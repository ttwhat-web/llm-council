"use client";

/**
 * Morning Complete · the emotional completion state, not a screen.
 *
 * Replaces the prepared-work section on Home once every action that
 * ever required a founder decision has resolved — relief instead of
 * a work list. No confetti, no badges, no streaks: one calm card,
 * real numbers only.
 */

import type { MorningCompleteSummary } from "@/services/executors";

export function MorningCompleteCard({ summary }: { summary: MorningCompleteSummary }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl bg-emerald-500/[0.06] px-5 py-4">
      <p className="text-[15px] font-medium text-emerald-100">Everything important has been reviewed.</p>
      <p className="text-[13px] text-emerald-100/75">
        {summary.totalResolved} approval{summary.totalResolved === 1 ? "" : "s"} completed.
      </p>
      {summary.byExecutor.length > 0 && (
        <ul className="flex flex-col gap-0.5 pt-1">
          {summary.byExecutor.map((e) => (
            <li key={e.executor} className="text-[13px] text-emerald-100/85">
              {e.label}: {e.completedCount}
            </li>
          ))}
        </ul>
      )}
      {summary.failedCount > 0 ? (
        <p className="pt-1 text-[12.5px] text-amber-200/85">
          {summary.failedCount} still need{summary.failedCount === 1 ? "s" : ""} attention.
        </p>
      ) : (
        <p className="pt-1 text-[13px] text-emerald-100/60">Nothing urgent remains. See you tomorrow.</p>
      )}
    </section>
  );
}
