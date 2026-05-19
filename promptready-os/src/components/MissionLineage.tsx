"use client";

import { ArrowDown, CheckCircle2, Circle, GitBranch, Rocket } from "lucide-react";
import { useMissionStore, type MissionReceipt } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";

/**
 * Mission Lineage · UX RESET 03.
 *
 * Read-only chain view computed from existing data:
 *
 *   Mission → Receipt → Approval → Export → Follow-up
 *
 * - Mission     · the receipt itself
 * - Receipt     · derived (deliverable count + stage)
 * - Approval    · any workflow run whose first step references this
 *                 mission (best-effort by timestamp proximity)
 * - Export      · whether any deliverable was downloaded (we can't
 *                 know that historically · we mark "available" instead)
 * - Follow-up   · the next history entry whose brief starts with
 *                 "Iterate on this …" or "Run a follow-up" referencing
 *                 a deliverable from this receipt
 *
 * No new data is invented · steps that can't be resolved render as
 * `pending` / `not yet`.
 */

interface Props {
  receipt: MissionReceipt;
}

export function MissionLineage({ receipt }: Props) {
  const history = useMissionStore((s) => s.history);
  const runs = useAtlasStore((s) => s.workflowRuns);

  // Approval · find a workflow run whose start time is within 5 minutes
  // of this receipt and whose steps reference at least one mission.
  const nearbyRun = runs.find(
    (r) =>
      Math.abs(r.startedAt - receipt.startedAt) < 5 * 60_000 &&
      r.steps.some((s) => s.kind === "mission")
  );
  const approvalState: "ok" | "warn" | "muted" = nearbyRun
    ? nearbyRun.status === "completed"
      ? "ok"
      : nearbyRun.status === "awaiting-approval"
        ? "warn"
        : "muted"
    : "muted";

  // Follow-up · next history entry that quotes any deliverable label.
  const firstDeliverableLabel = receipt.deliverables[0]?.label;
  const followUp = firstDeliverableLabel
    ? history.find(
        (m) =>
          m.id !== receipt.id &&
          m.startedAt > receipt.startedAt &&
          (m.brief.includes(`Iterate on this ${firstDeliverableLabel}`) ||
            m.brief.includes(`follow-up to mission ${receipt.id}`))
      )
    : undefined;

  const steps: Array<{
    label: string;
    detail: string;
    state: "ok" | "warn" | "muted" | "pending";
    Icon: typeof Rocket;
  }> = [
    {
      label: "Mission",
      detail: `${receipt.mode} · ${receipt.quality}`,
      state: "ok",
      Icon: Rocket
    },
    {
      label: "Receipt",
      detail: `${receipt.deliverables.length} deliverable${receipt.deliverables.length === 1 ? "" : "s"}${receipt.score != null ? ` · score ${receipt.score}/100` : ""}`,
      state: receipt.stage === "deliverable-ready" ? "ok" : "warn",
      Icon: CheckCircle2
    },
    {
      label: "Approval",
      detail: nearbyRun
        ? `${nearbyRun.id} · ${nearbyRun.status}`
        : "no workflow run linked",
      state: approvalState,
      Icon: GitBranch
    },
    {
      label: "Export",
      detail:
        receipt.deliverables.length > 0
          ? "deliverables available · download from this expand"
          : "no deliverables to export",
      state: receipt.deliverables.length > 0 ? "ok" : "muted",
      Icon: ArrowDown
    },
    {
      label: "Follow-up",
      detail: followUp
        ? `${followUp.id} · ${followUp.mode} · ${new Date(followUp.startedAt).toLocaleString()}`
        : "no follow-up dispatched yet",
      state: followUp ? "ok" : "pending",
      Icon: Rocket
    }
  ];

  return (
    <section className="mt-3 rounded-md border border-white/8 bg-white/[0.012] p-3">
      <header className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
          mission lineage
        </span>
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
          read-only · derived from local data
        </span>
      </header>

      <ol className="flex flex-col gap-1.5">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-stretch gap-2.5">
            <div className="flex flex-col items-center">
              <s.Icon
                className={
                  s.state === "ok"
                    ? "h-3.5 w-3.5 text-emerald-300"
                    : s.state === "warn"
                      ? "h-3.5 w-3.5 text-amber-300"
                      : s.state === "muted"
                        ? "h-3.5 w-3.5 text-white/35"
                        : "h-3.5 w-3.5 text-white/25"
                }
              />
              {i < steps.length - 1 && (
                <span className="my-0.5 w-px flex-1 bg-white/12" aria-hidden />
              )}
            </div>
            <div className="flex flex-1 items-center justify-between rounded border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]">
              <div className="flex flex-col">
                <span className="font-mono uppercase tracking-[0.18em] text-white/55">
                  {s.label}
                </span>
                <span className="text-white/75">{s.detail}</span>
              </div>
              <StatePill state={s.state} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StatePill({ state }: { state: "ok" | "warn" | "muted" | "pending" }) {
  const cls = {
    ok: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
    warn: "border-amber-400/30 bg-amber-500/[0.08] text-amber-200",
    muted: "border-white/10 bg-white/[0.03] text-white/55",
    pending: "border-white/10 bg-white/[0.03] text-white/45"
  }[state];
  const Icon = state === "ok" ? CheckCircle2 : Circle;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${cls}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {state}
    </span>
  );
}
