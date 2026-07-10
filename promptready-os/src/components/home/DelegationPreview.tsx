"use client";

/**
 * Delegation Preview · "I understood this as N actions."
 *
 * The visible half of the Delegation Engine: one sentence in, a short
 * list of real prepared actions out. Every row uses the exact same
 * generic <ActionApproval/> chrome as Draft Replies and Calendar
 * Conflicts — a silent, already-archived row shows its receipt the
 * same honest way a pending reply shows its Approve button. No
 * executor names, no JSON, no technical plan — only the summary, the
 * evidence, and a decision.
 */

import { useEffect, useMemo } from "react";
import { Check, X } from "lucide-react";
import { useDelegationStore } from "@/store/delegation";
import { useActionQueue } from "@/services/executors";
import { ActionApproval } from "@/components/executors/ActionApproval";
import type { DelegationPlan, PlannedAction } from "@/services/delegation/types";
import type { Action } from "@/services/executors/types";

export function DelegationPreview() {
  const status = useDelegationStore((s) => s.status);
  const plan = useDelegationStore((s) => s.plan);
  const error = useDelegationStore((s) => s.error);
  const dismiss = useDelegationStore((s) => s.dismiss);
  const approveAll = useDelegationStore((s) => s.approveAll);

  const items = useActionQueue((s) => s.items);
  const approve = useActionQueue((s) => s.approve);
  const reject = useActionQueue((s) => s.reject);
  const undo = useActionQueue((s) => s.undo);
  const retry = useActionQueue((s) => s.retry);

  const pendingCount = useMemo(() => {
    if (!plan) return 0;
    return plan.actions.filter((a) => isPending(items[a.queueId])).length;
  }, [plan, items]);

  // Esc closes the preview; Cmd/Ctrl+A approves everything still
  // pending in THIS plan — never every pending action on Home, and
  // never while the founder is typing somewhere else.
  useEffect(() => {
    if (status === "idle") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss();
        return;
      }
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";
      if (typing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && pendingCount > 1) {
        e.preventDefault();
        approveAll();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, dismiss, approveAll, pendingCount]);

  if (status === "idle") return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white/[0.025] p-5" aria-label="Delegated request">
      <header className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-[15px] font-medium text-white">{headline(status, plan, error)}</span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="shrink-0 rounded-full p-1.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {status === "interpreting" && <p className="text-[13px] text-white/55">Preparing…</p>}

      {plan && plan.actions.length > 0 && (
        <>
          {pendingCount > 1 && (
            <button
              type="button"
              onClick={approveAll}
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-[12px] font-semibold text-black transition hover:bg-white/90"
              title="Approve every action below · ⌘A"
            >
              <Check className="h-3.5 w-3.5" /> Approve all ({pendingCount})
            </button>
          )}
          <ul className="flex flex-col gap-2">
            {plan.actions.map((a) => (
              <li key={a.queueId} className="flex flex-col gap-1.5 rounded-lg bg-white/[0.018] p-3">
                <p className="text-[13px] font-medium text-white">{a.summary}</p>
                <ActionApproval
                  action={items[a.queueId]}
                  onApprove={() => approve(a.queueId)}
                  onReject={() => reject(a.queueId)}
                  onUndo={() => undo(a.queueId)}
                  onRetry={() => retry(a.queueId)}
                >
                  <EvidenceLine action={a} />
                </ActionApproval>
              </li>
            ))}
          </ul>
        </>
      )}

      {plan && plan.issues.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {plan.issues.map((issue, i) => (
            <li
              key={i}
              className="rounded-lg bg-amber-500/[0.06] px-3 py-2 text-[12.5px] leading-relaxed text-amber-200/85"
            >
              {issue.message}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="rounded-lg bg-rose-500/[0.08] px-3 py-2 text-[12.5px] text-rose-200">{error}</p>}
    </section>
  );
}

function isPending(item: Action | undefined): boolean {
  return (
    !item ||
    item.status === "prepared" ||
    item.status === "cancelled" ||
    (item.status === "waiting_approval" && item.approvedAt == null)
  );
}

function EvidenceLine({ action }: { action: PlannedAction }) {
  return (
    <p className="text-[12.5px] leading-relaxed text-white/60">
      {action.fact} — {action.why}
      {action.confidence != null && <span className="text-white/40"> · {action.confidence}% confidence</span>}
    </p>
  );
}

function headline(status: string, plan: DelegationPlan | null, error: string | null): string {
  if (error) return "Something went wrong preparing that.";
  if (status === "interpreting") return "Understanding that…";
  if (!plan) return "";
  const n = plan.actions.length;
  if (n === 0 && plan.issues.length > 0) return "I couldn't prepare anything from that.";
  if (n === 0) return "Nothing to do — you're already caught up.";
  return `I understood this as ${n} action${n === 1 ? "" : "s"}.`;
}
