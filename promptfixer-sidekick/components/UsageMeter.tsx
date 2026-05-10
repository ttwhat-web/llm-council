"use client";

import clsx from "clsx";
import { Crown, Zap } from "lucide-react";
import type { BillingSnapshot } from "@/lib/billing";

/**
 * Compact daily-budget chip.
 *
 * Free: "X / 10 today" with a thin progress bar that turns amber
 *       at 80% and rose at 100%.
 * Pro:  "Pro · unlimited" with a Crown glyph.
 *
 * Click → opens the upgrade modal (caller-supplied callback). The chip
 * is always interactive so users on Pro can also use it as the "manage
 * plan" entry point.
 */

interface Props {
  billing: BillingSnapshot;
  onClick: () => void;
  compact?: boolean;
}

export function UsageMeter({ billing, onClick, compact }: Props) {
  if (billing.tier === "pro") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          "no-drag inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 transition hover:bg-accent/[0.16]",
          compact ? "text-[10px]" : "text-[11px]"
        )}
        title="Pro Preview · click for plans"
      >
        <Crown className="h-3 w-3 text-accent" />
        <span className="font-medium text-accent">Pro</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-accent/75">
          unlimited
        </span>
      </button>
    );
  }

  const pct = Math.min(100, Math.round((billing.used / Math.max(1, billing.limit)) * 100));
  const tone =
    billing.atLimit
      ? "rose"
      : billing.used / billing.limit >= 0.8
        ? "amber"
        : "ok";
  const wrapperCls = {
    rose: "border-rose-400/40 bg-rose-500/10 hover:bg-rose-500/[0.16]",
    amber: "border-amber-400/35 bg-amber-500/10 hover:bg-amber-500/[0.15]",
    ok: "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
  }[tone];
  const textCls = {
    rose: "text-rose-200",
    amber: "text-amber-200",
    ok: "text-white/80"
  }[tone];
  const barCls = {
    rose: "bg-rose-400",
    amber: "bg-amber-400",
    ok: "bg-accent"
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "no-drag inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 transition",
        wrapperCls,
        compact ? "text-[10px]" : "text-[11px]"
      )}
      title={billing.atLimit ? "Daily free limit reached" : `${billing.remaining} fixes left today`}
    >
      <Zap className={clsx("h-3 w-3", textCls)} />
      <span className={clsx("font-medium", textCls)}>
        {billing.used}/{billing.limit}
      </span>
      <span className="hidden font-mono text-[9px] uppercase tracking-wider text-white/45 md:inline">
        today
      </span>
      <span className="ml-1 h-1 w-10 overflow-hidden rounded-full bg-white/10">
        <span
          className={clsx("block h-full transition-all", barCls)}
          style={{ width: `${pct}%` }}
        />
      </span>
    </button>
  );
}
