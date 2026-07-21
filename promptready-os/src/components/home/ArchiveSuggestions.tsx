"use client";

/**
 * Archive Suggestions · the one part of Silent Archive that isn't
 * silent. Most noise is confident enough to archive without ever
 * asking (see gmailArchiveExecutor); anything below that bar still
 * gets prepared, but through the exact same ActionApproval chrome as
 * every other action — never invisible, never auto-run just because
 * it looked similar. The evidence line is the same reason string that
 * ends up in the Timeline, so approving or declining here is an
 * informed decision, not a guess.
 */

import { useEffect, useMemo } from "react";
import { useSourcesStore } from "@/store/sources";
import {
  collectArchiveCandidates,
  SILENT_ARCHIVE_CONFIDENCE_THRESHOLD,
  type ArchiveCandidate
} from "@/services/drafting/archiveCandidates";
import { useActionQueue, GMAIL_ARCHIVE_EXECUTOR_ID } from "@/services/executors";
import { ActionApproval } from "@/components/executors/ActionApproval";

export function ArchiveSuggestions() {
  const snapshot = useSourcesStore((s) => s.snapshot);
  const gmailModifyGranted = useSourcesStore((s) => s.google.gmailModifyGranted);
  const prepare = useActionQueue((s) => s.prepare);
  const queueItems = useActionQueue((s) => s.items);

  const uncertain = useMemo(() => {
    if (!gmailModifyGranted) return [];
    return collectArchiveCandidates(snapshot).filter((c) => c.confidence < SILENT_ARCHIVE_CONFIDENCE_THRESHOLD);
  }, [snapshot, gmailModifyGranted]);

  // Fallback for when Morning Run hasn't prepared these yet — never
  // block on the pipeline having already run.
  useEffect(() => {
    if (!gmailModifyGranted) return;
    for (const c of uncertain) {
      const id = `${GMAIL_ARCHIVE_EXECUTOR_ID}:${c.messageId}`;
      if (queueItems[id]) continue;
      prepare({ id, executor: GMAIL_ARCHIVE_EXECUTOR_ID, params: c, confidence: c.confidence, forceApproval: true });
    }
  }, [uncertain, queueItems, gmailModifyGranted, prepare]);

  const pending = uncertain.filter((c) => {
    const q = queueItems[`${GMAIL_ARCHIVE_EXECUTOR_ID}:${c.messageId}`];
    return (
      !q ||
      q.status === "prepared" ||
      (q.status === "waiting_approval" && q.approvedAt == null) ||
      q.status === "cancelled" ||
      q.status === "failed"
    );
  });

  if (pending.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <span className="text-[15px] font-semibold text-white">
        {pending.length} message{pending.length === 1 ? "" : "s"} might be safe to archive
      </span>
      <p className="text-[12px] leading-relaxed text-white/45">
        These looked like noise, but Operator wasn&apos;t confident enough to archive them without asking —
        review the reason and decide.
      </p>
      <ul className="flex flex-col gap-3">
        {pending.map((c) => (
          <ArchiveSuggestionCard key={c.messageId} candidate={c} />
        ))}
      </ul>
    </section>
  );
}

function ArchiveSuggestionCard({ candidate }: { candidate: ArchiveCandidate }) {
  const id = `${GMAIL_ARCHIVE_EXECUTOR_ID}:${candidate.messageId}`;
  const action = useActionQueue((s) => s.items[id]);
  const approve = useActionQueue((s) => s.approve);
  const reject = useActionQueue((s) => s.reject);
  const undo = useActionQueue((s) => s.undo);
  const retry = useActionQueue((s) => s.retry);

  return (
    <li className="flex flex-col gap-2 rounded-xl bg-white/[0.018] p-3">
      <header className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] font-medium text-white">
          {candidate.subject || "(no subject)"}
        </span>
        <span className="truncate text-[11.5px] text-white/45">{candidate.fromName}</span>
      </header>
      <ActionApproval
        action={action}
        onApprove={() => approve(id)}
        onReject={() => reject(id)}
        onUndo={() => undo(id)}
        onRetry={() => retry(id)}
      >
        <p className="text-[12.5px] leading-relaxed text-white/70">{candidate.reason}</p>
      </ActionApproval>
    </li>
  );
}
