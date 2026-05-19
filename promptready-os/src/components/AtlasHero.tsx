"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Brain, Ear, Radio } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { readAuditLog } from "@/services/auditLog";

/**
 * AtlasHero · UX RESET 04.
 *
 * Compact three-pill banner mounted at the top of Atlas. Each pill is
 * gated by real local state · we only claim "online · listening · ready"
 * when the underlying condition is true.
 *
 *   · Operator Core online    · always true while the desktop renders
 *   · Atlas listening         · true when audit log has entries
 *   · Local brain ready       · true when brain.identity exists
 *
 * No false confidence · if a pill's condition is false, the pill is
 * dropped from the row.
 */

export function AtlasHero() {
  const identity = useBrainStore((s) => s.identity);
  const [auditCount, setAuditCount] = useState<number>(() => safeAuditCount());

  useEffect(() => {
    setAuditCount(safeAuditCount());
    const t = window.setInterval(() => setAuditCount(safeAuditCount()), 4000);
    return () => window.clearInterval(t);
  }, []);

  const core = true;
  const listening = auditCount > 0;
  const brain = !!identity;

  // Empty case · render a calm setup line rather than the hero.
  if (!core && !listening && !brain) return null;

  return (
    <section
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-accent/20 bg-accent/[0.03] px-3 py-2"
      aria-label="Operator Core status"
    >
      {core && (
        <Pill
          Icon={Radio}
          label="Operator Core"
          state="online"
          hint="desktop runtime active"
        />
      )}
      {listening && (
        <Pill
          Icon={Ear}
          label="Atlas"
          state="listening"
          hint={`${auditCount} audit event${auditCount === 1 ? "" : "s"} logged`}
        />
      )}
      {brain && (
        <Pill
          Icon={Brain}
          label="Local brain"
          state="ready"
          hint={`${identity?.name ?? "—"} · ${identity?.mode ?? "—"}`}
        />
      )}
    </section>
  );
}

function Pill({
  Icon,
  label,
  state,
  hint
}: {
  Icon: typeof Brain;
  label: string;
  state: string;
  hint: string;
}) {
  return (
    <div
      title={hint}
      className={clsx(
        "flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] px-2.5 py-1"
      )}
    >
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      <Icon className="h-3 w-3 text-emerald-300/80" />
      <span className="text-[11.5px] font-semibold text-white">{label}</span>
      <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-emerald-200/80">
        {state}
      </span>
    </div>
  );
}

function safeAuditCount(): number {
  try {
    return readAuditLog().length;
  } catch {
    return 0;
  }
}
