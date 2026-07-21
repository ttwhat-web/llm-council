"use client";

import clsx from "clsx";
import type { PlanTier } from "@/services/plan";

/**
 * Plan badge · Sprint I. Informational only — labels which tier a surface
 * belongs to. Existing users stay unlocked (no lockout); this is not a
 * gate, just a chip.
 */

const TONE: Record<PlanTier, string> = {
  core: "border-white/15 bg-white/[0.04] text-white/70",
  desk: "border-accent/40 bg-accent/[0.1] text-accent",
  elite: "border-amber-400/40 bg-amber-500/[0.1] text-amber-200"
};

const LABEL: Record<PlanTier, string> = { core: "CORE", desk: "DESK", elite: "ELITE" };

export function PlanBadge({ tier, className }: { tier: PlanTier; className?: string }) {
  return (
    <span
      title={`${LABEL[tier]} plan feature · unlocked for early access`}
      className={clsx(
        "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.18em]",
        TONE[tier],
        className
      )}
    >
      {LABEL[tier]}
    </span>
  );
}
