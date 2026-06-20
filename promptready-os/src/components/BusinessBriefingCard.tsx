"use client";

import clsx from "clsx";
import { Briefcase } from "lucide-react";
import { useAtlasStore } from "@/store/atlas";
import { useMissionStore } from "@/store/mission";
import { computeCostBoard, formatUsd } from "@/services/cost";

/**
 * Business briefing · operator overview tile grid.
 *
 * HONEST by design: tiles backed by a connected provider show real
 * local numbers; tiles with no provider yet show a dash and a
 * "needs setup" sub-label. We never fabricate a count.
 */

export function BusinessBriefingCard() {
  const workflowRuns = useAtlasStore((s) => s.workflowRuns);
  const history = useMissionStore((s) => s.history);

  const approvals = workflowRuns.filter((r) => r.status === "awaiting-approval").length;
  const costAvoided = formatUsd(computeCostBoard(history).estimatedCloudCostAvoidedUSD);
  const receipts = history.length;

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white/[0.025] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-accent" />
          <span className="text-[14px] font-semibold text-white">Business briefing</span>
        </div>
        <span className="text-[11px] text-white/45">real + setup needed</span>
      </header>

      <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Tile label="Leads" needsSetup hint="email source needed" />
        <Tile label="Waiting replies" needsSetup hint="email source needed" />
        <Tile label="Invoices" needsSetup hint="email source needed" />
        <Tile label="Shipments" needsSetup hint="manual notes for now" />
        <Tile label="Approvals" value={String(approvals)} hint="workflow" />
        <Tile label="Costs" value={costAvoided} hint="cloud avoided (local)" />
        <Tile label="Receipts" value={String(receipts)} hint="archived" />
      </ul>

      <footer className="text-[11px] text-white/45">
        Channels show dashes until a source connects. Approvals, costs and receipts are real local state.
      </footer>
    </section>
  );
}

function Tile({
  label,
  value,
  hint,
  needsSetup
}: {
  label: string;
  value?: string;
  hint: string;
  needsSetup?: boolean;
}) {
  return (
    <li className="flex flex-col gap-1 rounded-xl bg-white/[0.018] p-3">
      <span className="text-[11px] text-white/55">{label}</span>
      <span
        className={clsx(
          "text-[16px] tabular-nums",
          needsSetup ? "text-white/40" : "text-emerald-200"
        )}
      >
        {needsSetup ? "—" : value}
      </span>
      <span className={clsx("text-[10.5px]", needsSetup ? "text-white/35" : "text-white/40")}>
        {hint}
      </span>
    </li>
  );
}
