"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, ShieldOff, X } from "lucide-react";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";

/**
 * Workspace recovery · Phase 17.
 *
 * On boot, if the mission store hydrated with a `current` receipt that
 * never finished (e.g. the window closed mid-flight), or if there's a
 * recorded recovery checkpoint, surface a non-modal banner offering:
 *
 *   · Resume     · revive the in-flight receipt and keep working
 *   · Discard    · cancel the receipt (records "cancelled" event)
 *   · Dismiss    · leave it alone for now
 *
 * Banner auto-disappears after 8s of inactivity so it never blocks
 * the user's view.
 */

export function RecoveryBanner() {
  const current = useMissionStore((s) => s.current);
  const recovery = useAtlasStore((s) => s.recovery);
  const cancel = useMissionStore((s) => s.cancel);
  const setRecovery = useAtlasStore((s) => s.setRecovery);
  const clearRecovery = useAtlasStore((s) => s.clearRecovery);

  const [dismissed, setDismissed] = useState(false);
  const [resumed, setResumed] = useState(false);

  // Record a recovery checkpoint whenever a mission begins. This way
  // we know on next boot that the session had work in progress.
  useEffect(() => {
    if (current && current.stage !== "deliverable-ready" && current.stage !== "idle") {
      setRecovery({
        savedAt: Date.now(),
        hadInFlightMission: true,
        inFlightMissionId: current.id,
        inFlightStage: current.stage
      });
    }
  }, [current, setRecovery]);

  // Clear checkpoint when a mission finishes cleanly.
  useEffect(() => {
    if (current?.stage === "deliverable-ready") {
      clearRecovery();
    }
  }, [current, clearRecovery]);

  if (dismissed) return null;

  // Only show on boot if there's an unfinished mission OR a stale
  // checkpoint that doesn't match the current mission (i.e. the
  // session ended before completion).
  const showForCurrent =
    current && current.stage !== "deliverable-ready" && current.stage !== "idle";
  const showForCheckpoint =
    !current && recovery?.hadInFlightMission && recovery.inFlightMissionId;

  if (!showForCurrent && !showForCheckpoint) return null;

  const stage = current?.stage ?? recovery?.inFlightStage ?? "unknown";
  const id = current?.id ?? recovery?.inFlightMissionId ?? "—";

  const onResume = () => {
    setResumed(true);
    // Resuming means the operator acknowledges the in-flight state.
    // We don't auto-rerun (no fake execution). They can cancel + redispatch.
  };

  const onDiscard = () => {
    if (current) cancel();
    clearRecovery();
    setDismissed(true);
  };

  const onSafeMode = () => {
    // Safe mode: cancel current mission, clear workflow runs, leave
    // brain identity + receipts intact. Designed for "the app boots
    // but immediately crashes" — strips down to the bare brain.
    if (current) cancel();
    useAtlasStore.setState({
      workflowRuns: [],
      recovery: null
    });
    clearRecovery();
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 z-50 flex w-[min(560px,90vw)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/[0.08] px-4 py-2.5 shadow-glass backdrop-blur"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-200" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-amber-200/85">
          recover last workspace?
        </span>
        <span className="truncate text-[12px] text-white/90">
          {resumed
            ? `Working on ${id} · stage ${stage}. Cancel and redispatch when ready.`
            : `Mission ${id} stopped mid-flight at stage ${stage}. Resume or discard?`}
        </span>
      </div>
      {!resumed && (
        <button
          type="button"
          onClick={onResume}
          className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-2 py-1 text-[11px] font-semibold text-white shadow-glow hover:bg-accent"
        >
          <RotateCcw className="h-3 w-3" /> Resume
        </button>
      )}
      <button
        type="button"
        onClick={onSafeMode}
        title="Clear workflow runs · keep brain + receipts"
        className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/[0.08] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-200 hover:bg-amber-500/[0.12]"
      >
        <ShieldOff className="h-3 w-3" /> safe mode
      </button>
      <button
        type="button"
        onClick={onDiscard}
        className="inline-flex items-center gap-1 rounded-md border border-rose-400/30 bg-rose-500/[0.08] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-rose-200 hover:bg-rose-500/[0.12]"
      >
        discard
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded p-0.5 text-white/55 hover:bg-white/[0.06] hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
