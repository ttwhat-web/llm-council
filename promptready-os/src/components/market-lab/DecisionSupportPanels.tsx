"use client";

/**
 * Honest-by-default helpers shared by the Why Center / Trade Replay
 * / War Room surfaces.  Only NeedsSetupBanner is exported today —
 * additional decision-support panels (Watch Rules, Trade Journal,
 * Inbox, AI Risk Check) live in `marketBriefStore.ts` and will be
 * wired in once their evaluators ship.
 */

import { AlertTriangle } from "lucide-react";

export function NeedsSetupBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-1.5 rounded border border-amber-400/30 bg-amber-500/[0.05] px-2 py-1.5">
      <AlertTriangle className="mt-px h-3 w-3 shrink-0 text-amber-300" />
      <span className="min-w-0 text-[11px] leading-snug text-amber-100/85">{message}</span>
    </div>
  );
}
