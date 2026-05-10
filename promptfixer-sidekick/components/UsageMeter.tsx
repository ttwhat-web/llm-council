"use client";

import clsx from "clsx";
import { Crown, ShieldCheck, Zap } from "lucide-react";
import type { BillingSnapshot } from "@/lib/billing";

/**
 * Compact daily-budget chip.
 *
 * Sources, in order of preference:
 *   1. `serverBilling` — the snapshot from `/api/billing/me`. Always
 *      authoritative when present (we don't trust localStorage for
 *      billing decisions).
 *   2. `billing` — the Phase-3 client-only snapshot. Used while the
 *      first server fetch is in flight, or when the API is offline.
 *
 * The chip displays a "Server verified" tick for `auth` source plans
 * and "Local preview" for `dev-override`.
 */

export interface ServerBillingMini {
  plan: "free" | "pro" | "team" | "enterprise";
  isPro: boolean;
  source: "auth" | "dev-override" | "default";
  quota: { used: number; limit: number; remaining: number; resetAt: string };
}

interface Props {
  billing: BillingSnapshot;
  serverBilling?: ServerBillingMini | null;
  onClick: () => void;
  compact?: boolean;
}

export function UsageMeter({ billing, serverBilling, onClick, compact }: Props) {
  // Pro / Team / Enterprise — show "unlimited" with verification badge.
  const effectivePro = serverBilling ? serverBilling.isPro : billing.tier === "pro";
  if (effectivePro) {
    const verified = serverBilling?.source === "auth";
    return (
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          "no-drag inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 transition hover:bg-accent/[0.16]",
          compact ? "text-[10px]" : "text-[11px]"
        )}
        title={verified ? "Server-verified Pro" : "Pro preview · click for plans"}
      >
        {verified ? (
          <ShieldCheck className="h-3 w-3 text-emerald-300" />
        ) : (
          <Crown className="h-3 w-3 text-accent" />
        )}
        <span className="font-medium text-accent">
          {serverBilling?.plan ? labelFor(serverBilling.plan) : "Pro"}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-accent/75">
          unlimited
        </span>
        {!verified && (
          <span className="hidden font-mono text-[9px] uppercase tracking-wider text-amber-300 md:inline">
            preview
          </span>
        )}
      </button>
    );
  }

  // Free path. Prefer the server quota if available; fall back to local.
  const used = serverBilling ? serverBilling.quota.used : billing.used;
  const limit = serverBilling ? serverBilling.quota.limit : billing.limit;
  const remaining = serverBilling
    ? serverBilling.quota.remaining
    : billing.remaining === Number.POSITIVE_INFINITY
      ? 0
      : billing.remaining;
  const atLimit = limit > 0 && used >= limit;
  const ratio = limit > 0 ? used / limit : 0;
  const tone: "ok" | "amber" | "rose" = atLimit ? "rose" : ratio >= 0.8 ? "amber" : "ok";

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
  const pct = limit > 0 ? Math.min(100, Math.round(ratio * 100)) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "no-drag inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 transition",
        wrapperCls,
        compact ? "text-[10px]" : "text-[11px]"
      )}
      title={atLimit ? "Daily free limit reached" : `${remaining} fixes left today`}
    >
      <Zap className={clsx("h-3 w-3", textCls)} />
      <span className={clsx("font-medium", textCls)}>
        {used}/{limit}
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
      {serverBilling && (
        <ShieldCheck className="ml-1 hidden h-3 w-3 text-emerald-300/70 md:inline" />
      )}
    </button>
  );
}

function labelFor(plan: "free" | "pro" | "team" | "enterprise"): string {
  switch (plan) {
    case "pro":
      return "Pro";
    case "team":
      return "Team";
    case "enterprise":
      return "Enterprise";
    default:
      return "Free";
  }
}
