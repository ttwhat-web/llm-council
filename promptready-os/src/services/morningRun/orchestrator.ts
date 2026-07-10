/**
 * Morning Run · the pipeline, not a screen.
 *
 *   Load connectors → Sync Gmail → Sync Calendar → Load Memory →
 *   Detect opportunities → Prioritize → Generate drafts →
 *   Prepare executor actions → Produce Operator Read → Ready.
 *
 * Home doesn't change shape because of this file — it renders exactly
 * what it already rendered (DraftReplies, CalendarConflicts, the
 * Operator's Read line). What changes is WHO does the preparation:
 * one reusable orchestrator instead of three components each doing
 * their own sync/draft/read on mount. Trigger-agnostic on purpose —
 * this function has no idea whether it was called by a mount effect,
 * a manual refresh button, a future cron, or a mobile app opening.
 * Never say "I handled" here — only "prepared", "reviewed", "found",
 * "noticed", because nothing this pipeline does actually sends
 * anything; sending only happens when the founder approves.
 */

import { useSourcesStore } from "@/store/sources";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import { useAiProviderStore } from "@/store/aiProvider";
import {
  useActionQueue,
  GMAIL_SEND_EXECUTOR_ID,
  CALENDAR_MOVE_EXECUTOR_ID,
  GMAIL_ARCHIVE_EXECUTOR_ID
} from "@/services/executors";
import { collectCandidates, readFounderName, MAX_DRAFTS_PER_BATCH } from "@/services/drafting/candidates";
import {
  collectArchiveCandidates,
  SILENT_ARCHIVE_CONFIDENCE_THRESHOLD
} from "@/services/drafting/archiveCandidates";
import { draftReply } from "@/services/drafting/draftReply";
import { findConflictPairs } from "@/services/briefing/detectors";
import { fetchOperatorRead } from "@/services/briefing/operatorRead";
import { emptyMorningRunSummary, type MorningRunSummary } from "./types";

export async function runMorningRun(): Promise<MorningRunSummary> {
  const startedAt = Date.now();

  // Stage · Load connectors.
  const sources = useSourcesStore.getState();
  const connectionState = sources.google.state;
  if (connectionState === "disconnected" || connectionState === "needs-auth") {
    return emptyMorningRunSummary(startedAt, "Google not connected — nothing to review yet.");
  }

  // Stage · Sync Gmail + Sync Calendar (one call covers both, and
  // rebuilds the detector-based briefing + panels internally).
  const errors: string[] = [];
  try {
    await sources.syncGoogle();
  } catch (e) {
    errors.push(`Sync failed: ${(e as Error).message}`);
  }

  const synced = useSourcesStore.getState();
  const snapshot = synced.snapshot;
  const briefing = synced.briefing;
  if (!snapshot) {
    return { ...emptyMorningRunSummary(startedAt, "No workspace snapshot yet."), errors };
  }

  // Stage · Load Memory.
  const memory = useOperatorMemoryStore.getState().memory;
  const anthropicKey = useAiProviderStore.getState().anthropicKey;

  // Stage · Detect opportunities (already run by syncGoogle → buildBriefing)
  // + Prioritize (buildBriefing already sorts high-priority-first).
  const detectorsFired = Array.from(new Set(briefing.map((b) => b.detector)));

  // Stage · Detect opportunities → Generate drafts (replies, overdue
  // threads, waiting customers). Every candidate is detected first
  // (a real, logged "detected" state) so the funnel is honest even
  // when drafting fails or there's no AI key to draft with.
  const candidates = collectCandidates(snapshot).slice(0, MAX_DRAFTS_PER_BATCH);
  const founderFirstName = memory.firstName?.trim() || readFounderName();
  let draftsGenerated = 0;
  let aiTokens = 0;
  let aiLatencyMs = 0;
  const detect = useActionQueue.getState().detect;
  const prepare = useActionQueue.getState().prepare;
  const touchedExecutors = new Set<string>();
  const replyDetectorMatch = briefing.find(
    (b) => b.detector === "stale-customer-thread" || b.detector === "unanswered-email"
  );

  for (const candidate of candidates) {
    detect({
      id: `${GMAIL_SEND_EXECUTOR_ID}:${candidate.customerEmail}`,
      executor: GMAIL_SEND_EXECUTOR_ID,
      title: `Reply to ${candidate.customerName}`,
      description: `Waiting ${candidate.daysSinceLastInbound}d`,
      confidence: replyDetectorMatch?.confidence,
      priority: replyDetectorMatch?.priority
    });
  }

  if (anthropicKey) {
    for (const candidate of candidates) {
      const before = Date.now();
      const result = await draftReply(
        { context: candidate, founderFirstName, intent: "follow-up", memory },
        anthropicKey
      );
      aiLatencyMs += Date.now() - before;
      if (!result.ok) {
        errors.push(`Draft for ${candidate.customerEmail}: ${result.error}`);
        continue;
      }
      draftsGenerated++;
      if (result.usage) aiTokens += result.usage.inputTokens + result.usage.outputTokens;

      // Stage · Prepare executor actions — already in the queue,
      // waiting for approval, before the founder ever looks at Home.
      prepare({
        id: `${GMAIL_SEND_EXECUTOR_ID}:${candidate.customerEmail}`,
        executor: GMAIL_SEND_EXECUTOR_ID,
        params: {
          to: result.draft.to,
          subject: result.draft.subject,
          body: result.draft.body,
          threadId: candidate.threadMessages[0]?.threadId,
          promptVersion: result.draft.promptVersion,
          model: result.draft.model
        }
      });
      touchedExecutors.add(GMAIL_SEND_EXECUTOR_ID);
    }
  }

  // Stage · Prepare a calendar move for the soonest conflict, only
  // when Operator can actually write it — never prepare an action
  // that's guaranteed to fail on approval.
  const conflict = findConflictPairs(snapshot.events, snapshot.syncedAt)[0] ?? null;
  if (conflict) {
    const calendarConflictMatch = briefing.find((b) => b.detector === "calendar-conflict");
    detect({
      id: `${CALENDAR_MOVE_EXECUTOR_ID}:${conflict.b.id}`,
      executor: CALENDAR_MOVE_EXECUTOR_ID,
      title: `Resolve conflict: "${conflict.a.summary}" / "${conflict.b.summary}"`,
      confidence: calendarConflictMatch?.confidence,
      priority: calendarConflictMatch?.priority
    });
  }
  if (conflict && synced.google.calendarWriteGranted) {
    const staying = conflict.a;
    const moving = conflict.b;
    const newStartMs = staying.endMs;
    const newEndMs = newStartMs + (moving.endMs - moving.startMs);
    prepare({
      id: `${CALENDAR_MOVE_EXECUTOR_ID}:${moving.id}`,
      executor: CALENDAR_MOVE_EXECUTOR_ID,
      params: {
        eventId: moving.id,
        calendarId: moving.calendarId,
        summary: moving.summary,
        newStartMs,
        newEndMs
      }
    });
    touchedExecutors.add(CALENDAR_MOVE_EXECUTOR_ID);
  }

  const calendarActionPrepared = !!conflict && synced.google.calendarWriteGranted;

  // Stage · Archive obvious inbox noise. Only ever prepared once the
  // founder has granted the separate gmail.modify scope; never prepare
  // an action guaranteed to fail, same rule as Calendar write above.
  // Only candidates with multiple independent signals confirming
  // they're safe (>=95 confidence) run silently — anything less still
  // requires the founder's approval, same as any other action.
  let archivedPrepared = 0;
  if (synced.google.gmailModifyGranted) {
    for (const candidate of collectArchiveCandidates(snapshot)) {
      const id = `${GMAIL_ARCHIVE_EXECUTOR_ID}:${candidate.messageId}`;
      detect({
        id,
        executor: GMAIL_ARCHIVE_EXECUTOR_ID,
        title: `Archive: ${candidate.subject || "(no subject)"}`,
        description: candidate.reason,
        confidence: candidate.confidence
      });
      prepare({
        id,
        executor: GMAIL_ARCHIVE_EXECUTOR_ID,
        params: candidate,
        confidence: candidate.confidence,
        forceApproval: candidate.confidence < SILENT_ARCHIVE_CONFIDENCE_THRESHOLD
      });
      touchedExecutors.add(GMAIL_ARCHIVE_EXECUTOR_ID);
      archivedPrepared++;
    }
  }

  const actionsPrepared = draftsGenerated + (calendarActionPrepared ? 1 : 0) + archivedPrepared;

  // Stage · Produce Operator Read — the completed-run summary, in the
  // founder's voice, using only real counts and honest verbs.
  let operatorRead: string | null = null;
  if (anthropicKey && briefing.length > 0) {
    const overdueThreads = Math.max(0, collectCandidates(snapshot).length - draftsGenerated);
    const before = Date.now();
    const readResult = await fetchOperatorRead(briefing, memory, anthropicKey, {
      repliesReady: draftsGenerated,
      conflictsNeedingApproval: conflict ? 1 : 0,
      overdueThreads
    });
    aiLatencyMs += Date.now() - before;
    if (readResult.ok) {
      operatorRead = readResult.text;
      if (readResult.usage) aiTokens += readResult.usage.inputTokens + readResult.usage.outputTokens;
    } else if (readResult.error !== "no-key" && readResult.error !== "no-items") {
      errors.push(`Operator's read: ${readResult.error}`);
    }
  }

  // Stage · Ready.
  return {
    startedAt,
    durationMs: Date.now() - startedAt,
    detectorsFired,
    draftsGenerated,
    actionsPrepared,
    executorCount: touchedExecutors.size,
    aiTokens,
    aiLatencyMs,
    errors,
    operatorRead
  };
}
