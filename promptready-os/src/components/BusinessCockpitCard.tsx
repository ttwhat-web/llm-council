"use client";

import clsx from "clsx";
import { Briefcase } from "lucide-react";
import { useAtlasStore } from "@/store/atlas";
import { useMissionStore } from "@/store/mission";
import { computeCostBoard, formatUsd } from "@/services/cost";

/**
 * Business Cockpit · operator overview tile grid.
 *
 * HONEST by design: tiles backed by a connected provider show real
 * local numbers; tiles with no provider yet show a dash and a
 * "planned" sub-label. We never fabricate a count for a planned item.
 *
 *   PLANNED · Leads · Waiting replies · Invoices · Shipments
 *   REAL    · Approvals (atlas workflowRuns) · Costs (cloud avoided)
 *             · Receipts (mission history)
 */

export function BusinessCockpitCard() {
  const workflowRuns = useAtlasStore((s) => s.workflowRuns);
  const history = useMissionStore((s) => s.history);

  const approvals = workflowRuns.filter((r) => r.status === "awaiting-approval").length;
  const costAvoided = formatUsd(computeCostBoard(history).estimatedCloudCostAvoidedUSD);
  const receipts = history.length;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Business Cockpit</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/45">
          mixed · real + planned
        </span>
      </header>

      <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Tile label="Leads" planned hint="email/WhatsApp planned" />
        <Tile label="Waiting replies" planned hint="email planned" />
        <Tile label="Invoices" planned hint="email planned" />
        <Tile label="Shipments" planned hint="manual notes / planned" />
        <Tile label="Approvals" value={String(approvals)} hint="workflow" />
        <Tile label="Costs" value={costAvoided} hint="cloud avoided (local)" />
        <Tile label="Receipts" value={String(receipts)} hint="archived" />
      </ul>

      <footer className="border-t border-white/6 pt-2 font-mono text-[9.5px] uppercase tracking-wider text-white/45">
        Planned channels show dashes until a provider connects. Approvals, costs and
        receipts are real local state.
      </footer>
    </section>
  );
}

function Tile({
  label,
  value,
  hint,
  planned
}: {
  label: string;
  value?: string;
  hint: string;
  planned?: boolean;
}) {
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-white/8 bg-white/[0.012] p-2.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </span>
      <span
        className={clsx(
          "font-mono text-[14px] tabular-nums",
          planned ? "text-white/40" : "text-emerald-200"
        )}
      >
        {planned ? "—" : value}
      </span>
      <span
        className={clsx(
          "font-mono text-[9.5px] uppercase tracking-wider",
          planned ? "text-white/35" : "text-white/40"
        )}
      >
        {hint}
      </span>
    </li>
  );
}
