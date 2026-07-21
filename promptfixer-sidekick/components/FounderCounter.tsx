"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { ShieldCheck } from "lucide-react";

/**
 * Live founder-lifetime counter chip.
 *
 * Reads /api/founder. Three visible states:
 *
 *   enabled + remaining   →  amber "X / 100 founder seats claimed"
 *   enabled + sold-out    →  rose  "Founder lifetime · sold out"
 *   disabled              →  hidden entirely
 *
 * `variant="cta"` adds the "Claim founder lifetime" link to /pricing
 * for hero / pricing use. `variant="badge"` is the slim chip for
 * UpgradeModal + nav.
 */

interface Snapshot {
  ok: boolean;
  enabled: boolean;
  cap: number;
  claimed: number;
  remaining: number;
  soldOut: boolean;
}

interface Props {
  variant?: "cta" | "badge";
  className?: string;
}

export function FounderCounter({ variant = "badge", className }: Props) {
  const [state, setState] = useState<Snapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/founder", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: Snapshot) => {
        if (!cancelled) setState(d);
      })
      .catch(() => {
        /* swallow — chip stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state || !state.enabled) return null;

  const labelClass = state.soldOut
    ? "border-rose-400/40 bg-rose-500/[0.08] text-rose-200"
    : "border-amber-400/35 bg-amber-500/[0.08] text-amber-200";
  const text = state.soldOut
    ? `Founder lifetime · sold out · ${state.cap}/${state.cap}`
    : `Founder lifetime · ${state.claimed}/${state.cap} claimed · ${state.remaining} left`;

  if (variant === "cta") {
    return (
      <div className={clsx("flex flex-wrap items-center gap-3", className)}>
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em]",
            labelClass
          )}
        >
          <ShieldCheck className="h-3 w-3" />
          {text}
        </span>
        {!state.soldOut && (
          <Link
            href="/pricing#founder-lifetime"
            className="inline-flex items-center gap-1 rounded-xl bg-amber-400/90 px-3 py-1.5 text-[12px] font-semibold text-black transition hover:bg-amber-300"
          >
            Claim founder lifetime →
          </Link>
        )}
      </div>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
        labelClass,
        className
      )}
    >
      <ShieldCheck className="h-3 w-3" />
      {text}
    </span>
  );
}
