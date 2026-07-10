"use client";

/**
 * ActionApproval · the one generic approval chrome for every executor.
 *
 * This is the piece the "No executor-specific UI" rule is actually
 * about: the status pill, the Approve/Undo/Retry buttons, the grace
 * countdown, the receipt/error line — all driven purely off the
 * queue's own generic Action fields (status, title, undoUntil,
 * receipt, error). It has no idea whether it's fronting a Gmail send
 * or a Calendar move or a future Browser task.
 *
 * What it does NOT own: the executor-specific preview/edit content
 * (an editable email body, a suggested meeting time). That's real
 * content a founder needs to review, not "implementation detail" —
 * removing it would make approval meaningless, not more generic. It's
 * passed in as `children`, rendered only while a decision is still
 * pending.
 */

import { useEffect, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { undoSecondsLeft } from "@/services/executors/actionQueue";
import type { Action } from "@/services/executors/types";

export interface ActionApprovalProps {
  action: Action | undefined;
  onApprove: () => void;
  onReject?: () => void;
  onUndo: () => void;
  onRetry?: () => void;
  children?: React.ReactNode;
}

export function ActionApproval({ action, onApprove, onReject, onUndo, onRetry, children }: ActionApprovalProps) {
  // Re-render every second while a grace window (pre- or post-execute) is counting down.
  const [, force] = useState(0);
  const inGraceWindow =
    (action?.status === "waiting_approval" || action?.status === "completed") && action.undoUntil != null;
  useEffect(() => {
    if (!inGraceWindow) return;
    const t = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [inGraceWindow]);

  const pendingDecision =
    !action ||
    action.status === "prepared" ||
    action.status === "cancelled" ||
    (action.status === "waiting_approval" && action.approvedAt == null);

  if (pendingDecision) {
    return (
      <div className="flex flex-col gap-2">
        {action?.status === "cancelled" && <ReceiptLine tone="muted">Not done — approve to try again.</ReceiptLine>}
        {children}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onApprove}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-[12px] font-semibold text-black transition hover:bg-white/90"
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </button>
          {onReject && (
            <button
              type="button"
              onClick={onReject}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-[11.5px] text-white/70 transition hover:bg-white/[0.08]"
            >
              Not now
            </button>
          )}
        </div>
      </div>
    );
  }

  // Approved, pre-execute grace window — nothing has happened yet.
  if (action!.status === "waiting_approval") {
    const left = undoSecondsLeft(action!);
    return (
      <ReceiptLine tone="amber">
        {action!.title} in {left}s…
        <button type="button" onClick={onUndo} className="ml-2 underline-offset-2 hover:underline">
          Undo
        </button>
      </ReceiptLine>
    );
  }

  if (action!.status === "executing") {
    return <ReceiptLine tone="amber">{action!.title}…</ReceiptLine>;
  }

  if (action!.status === "completed") {
    const canUndo = undoSecondsLeft(action!) > 0;
    return (
      <ReceiptLine tone="emerald">
        ✓ {action!.receipt ?? action!.title}
        {canUndo && (
          <button type="button" onClick={onUndo} className="ml-2 underline-offset-2 hover:underline">
            Undo
          </button>
        )}
      </ReceiptLine>
    );
  }

  if (action!.status === "failed") {
    return (
      <div className="flex flex-col gap-2">
        <ReceiptLine tone="rose">Failed · {action!.error}</ReceiptLine>
        {children}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-[11.5px] text-white/80 transition hover:bg-white/[0.08]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        )}
      </div>
    );
  }

  if (action!.status === "cancelled") {
    return <ReceiptLine tone="muted">Not done.</ReceiptLine>;
  }

  if (action!.status === "undone") {
    return <ReceiptLine tone="muted">Undone.</ReceiptLine>;
  }

  return null; // "detected" — nothing concrete to approve yet
}

export function ReceiptLine({
  tone,
  children
}: {
  tone: "emerald" | "amber" | "rose" | "muted";
  children: React.ReactNode;
}) {
  const cls = {
    emerald: "bg-emerald-500/[0.08] text-emerald-200",
    amber: "bg-amber-500/[0.08] text-amber-200",
    rose: "bg-rose-500/[0.08] text-rose-200",
    muted: "bg-white/[0.04] text-white/60"
  }[tone];
  return <p className={clsx("rounded-lg px-3 py-2 text-[12.5px]", cls)}>{children}</p>;
}
