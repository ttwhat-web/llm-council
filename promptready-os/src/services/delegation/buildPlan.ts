/**
 * Delegation Engine · plan builder.
 *
 * Turns interpreted clauses into a typed DelegationPlan AND real
 * Action Queue records (detect() + prepare()) — the same queue, same
 * executors, same registry every other surface uses. This is the one
 * place natural language becomes execution-adjacent; it never calls
 * execute() or approve() itself (except the auto-approve that already
 * lives inside prepare() for silent executors) — a founder decision
 * always sits between "prepared" and "done", per the required lifecycle.
 *
 * Every planned action is verified against the real queue after
 * prepare() runs (verifyPrepared) — if the executor isn't actually
 * registered, nothing is silently claimed as planned; an honest
 * "unsupported" issue is surfaced instead (rules 3 and 5).
 */

import { useActionQueue, GMAIL_SEND_EXECUTOR_ID, CALENDAR_MOVE_EXECUTOR_ID, GMAIL_ARCHIVE_EXECUTOR_ID } from "@/services/executors";
import { collectCandidates, MAX_DRAFTS_PER_BATCH, type CustomerCandidate } from "@/services/drafting/candidates";
import { collectArchiveCandidates, SILENT_ARCHIVE_CONFIDENCE_THRESHOLD } from "@/services/drafting/archiveCandidates";
import { draftReply } from "@/services/drafting/draftReply";
import { getCompanyBrainResult, isResolvedBrainResult, renderCompanyBrainForPrompt } from "@/services/companyBrain/retrieve";
import { findConflictPairs, type ConflictPair } from "@/services/briefing/detectors";
import { interpretRequest, type DelegationClause } from "./interpret";
import type { DelegationContext, DelegationIssue, DelegationPlan, PlannedAction } from "./types";

function normalizeText(s: string): string {
  return s.trim().toLowerCase();
}

function matchesHint(value: string, hint: string): boolean {
  return normalizeText(value).includes(normalizeText(hint));
}

function matchesMeetingHint(pair: ConflictPair, hint: string): boolean {
  return matchesHint(pair.a.summary, hint) || matchesHint(pair.b.summary, hint);
}

/** True only when prepare() actually advanced the item past "detected"
 *  — detect() always creates that record regardless of whether the
 *  executor exists, so a truthy get() alone can't tell registered
 *  from unregistered. prepare() only moves it further when a real
 *  executor picked it up. */
function verifyPrepared(queueId: string): boolean {
  const item = useActionQueue.getState().get(queueId);
  return !!item && item.status !== "detected";
}

const UNAVAILABLE_MESSAGE: Record<"reply" | "calendarMove" | "archive", string> = {
  reply: "Sending replies isn't available right now — that capability isn't registered.",
  calendarMove: "Moving calendar events isn't available right now — that capability isn't registered.",
  archive: "Archiving mail isn't available right now — that capability isn't registered."
};

export async function delegate(text: string, ctx: DelegationContext): Promise<DelegationPlan> {
  const { clauses, unsupported } = interpretRequest(text);
  const issues: DelegationIssue[] = [];
  const actions: PlannedAction[] = [];
  const seenQueueIds = new Set<string>();

  if (unsupported) {
    issues.push({
      kind: "unsupported-request",
      message:
        "I don't know how to help with that yet — I can follow up with waiting customers, resolve calendar conflicts, or archive obvious inbox noise."
    });
    return { requestText: text, actions, issues };
  }

  if (!ctx.snapshot) {
    issues.push({ kind: "missing-source", message: "Nothing is connected yet — connect Google in Settings first." });
    return { requestText: text, actions, issues };
  }

  const followUpClauses = clauses.filter((c) => c.intent === "followUp");
  const conflictClauses = clauses.filter((c) => c.intent === "resolveConflicts");
  const wantsArchive = clauses.some((c) => c.intent === "archiveNoise");

  if (followUpClauses.length > 0) {
    await planFollowUps(followUpClauses, ctx, actions, issues, seenQueueIds);
  }
  if (conflictClauses.length > 0) {
    planConflicts(conflictClauses, ctx, actions, issues, seenQueueIds);
  }
  if (wantsArchive) {
    planArchive(ctx, actions, issues, seenQueueIds);
  }

  return { requestText: text, actions, issues };
}

// ---------------------------------------------------------------------------
// Follow up with customers
// ---------------------------------------------------------------------------

async function planFollowUps(
  clauses: DelegationClause[],
  ctx: DelegationContext,
  actions: PlannedAction[],
  issues: DelegationIssue[],
  seenQueueIds: Set<string>
): Promise<void> {
  const candidates = collectCandidates(ctx.snapshot);
  const hints = clauses.map((c) => c.personHint).filter((h): h is string => !!h);

  let targets: CustomerCandidate[];
  if (hints.length === 0) {
    targets = candidates.slice(0, MAX_DRAFTS_PER_BATCH);
  } else {
    targets = [];
    for (const hint of hints) {
      const matches = candidates.filter((c) => matchesHint(c.customerName, hint) || matchesHint(c.customerEmail, hint));
      if (matches.length === 0) {
        issues.push({ kind: "person-not-found", message: `I couldn't find anyone named "${hint}" waiting on a reply.` });
        continue;
      }
      if (matches.length > 1) {
        issues.push({
          kind: "ambiguous-person",
          message: `More than one person matches "${hint}" — say a full name or email to be specific.`
        });
        continue;
      }
      targets.push(matches[0]);
    }
  }
  if (targets.length === 0) return;

  if (!ctx.anthropicKey) {
    issues.push({ kind: "missing-permission", message: "Drafting replies needs an Anthropic key — add one in Settings → AI Keys." });
    return;
  }

  const { detect, prepare } = useActionQueue.getState();
  const founderFirstName = ctx.memory.firstName?.trim() || null;

  for (const candidate of targets) {
    const queueId = `${GMAIL_SEND_EXECUTOR_ID}:${candidate.customerEmail}`;
    if (seenQueueIds.has(queueId)) continue; // duplicate suppression within this one request
    seenQueueIds.add(queueId);

    detect({
      id: queueId,
      executor: GMAIL_SEND_EXECUTOR_ID,
      title: `Reply to ${candidate.customerName}`,
      description: `Waiting ${candidate.daysSinceLastInbound}d`
    });

    const brainResult = ctx.companyBrainContext ? getCompanyBrainResult(candidate.customerEmail, ctx.companyBrainContext) : null;
    const grounded = brainResult && isResolvedBrainResult(brainResult) ? brainResult : null;
    const companyBrainSummary = grounded ? renderCompanyBrainForPrompt(grounded) : undefined;

    const result = await draftReply(
      { context: candidate, founderFirstName, intent: "follow-up", memory: ctx.memory, companyBrainSummary },
      ctx.anthropicKey
    );
    if (!result.ok) {
      issues.push({ kind: "executor-failure", message: `Couldn't draft a reply to ${candidate.customerName}: ${result.error}` });
      continue;
    }

    prepare({
      id: queueId,
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

    if (!verifyPrepared(queueId)) {
      issues.push({ kind: "unsupported-request", message: UNAVAILABLE_MESSAGE.reply });
      continue;
    }

    const days = candidate.daysSinceLastInbound;
    // Ground the "why" in what Operator actually remembers about this
    // person when there's something real to add — never a repeat of
    // the fact line above, and never present when there's nothing.
    const memoryFact = grounded?.memory[0]?.text;
    const why = memoryFact ? `No response has been sent since their last message · Remembers: ${memoryFact}` : "No response has been sent since their last message";

    actions.push({
      queueId,
      kind: "reply",
      summary: `Reply to ${candidate.customerName}`,
      fact: `Waiting ${days} day${days === 1 ? "" : "s"} for a reply`,
      why
    });
  }
}

// ---------------------------------------------------------------------------
// Resolve calendar conflicts
// ---------------------------------------------------------------------------

function planConflicts(
  clauses: DelegationClause[],
  ctx: DelegationContext,
  actions: PlannedAction[],
  issues: DelegationIssue[],
  seenQueueIds: Set<string>
): void {
  if (!ctx.calendarWriteGranted) {
    issues.push({ kind: "missing-permission", message: "Calendar write isn't granted — grant it in Settings to let me move events." });
    return;
  }

  const pairs = findConflictPairs(ctx.snapshot!.events, ctx.snapshot!.syncedAt);
  if (pairs.length === 0) return; // real state: nothing to resolve, not a failure

  const meetingHints = clauses.map((c) => c.meetingHint).filter((h): h is string => !!h);
  let targets: Array<{ pair: ConflictPair; hint?: string }>;

  if (meetingHints.length === 0) {
    targets = pairs.map((pair) => ({ pair }));
  } else {
    targets = [];
    for (const hint of meetingHints) {
      const matches = pairs.filter((p) => matchesMeetingHint(p, hint));
      if (matches.length === 0) {
        issues.push({ kind: "meeting-not-found", message: `I couldn't find a conflict involving "${hint}".` });
        continue;
      }
      if (matches.length > 1) {
        issues.push({ kind: "ambiguous-meeting", message: `More than one conflict matches "${hint}" — be more specific about which meeting.` });
        continue;
      }
      targets.push({ pair: matches[0], hint });
    }
  }
  if (targets.length === 0) return;

  const { detect, prepare } = useActionQueue.getState();

  for (const { pair, hint } of targets) {
    // Default: the later-starting event (b) moves. If the hint names
    // `a` specifically, the founder asked for that one to move instead.
    const hintNamesA = !!hint && matchesHint(pair.a.summary, hint) && !matchesHint(pair.b.summary, hint);
    const staying = hintNamesA ? pair.b : pair.a;
    const moving = hintNamesA ? pair.a : pair.b;

    const queueId = `${CALENDAR_MOVE_EXECUTOR_ID}:${moving.id}`;
    if (seenQueueIds.has(queueId)) continue;
    seenQueueIds.add(queueId);

    const newStartMs = staying.endMs;
    const newEndMs = newStartMs + (moving.endMs - moving.startMs);

    detect({
      id: queueId,
      executor: CALENDAR_MOVE_EXECUTOR_ID,
      title: `Resolve conflict: "${pair.a.summary}" / "${pair.b.summary}"`
    });
    prepare({
      id: queueId,
      executor: CALENDAR_MOVE_EXECUTOR_ID,
      params: { eventId: moving.id, calendarId: moving.calendarId, summary: moving.summary, newStartMs, newEndMs }
    });

    if (!verifyPrepared(queueId)) {
      issues.push({ kind: "unsupported-request", message: UNAVAILABLE_MESSAGE.calendarMove });
      continue;
    }

    actions.push({
      queueId,
      kind: "calendarMove",
      summary: `Move "${moving.summary}"`,
      fact: `Conflicts with "${staying.summary}" at the same time`,
      why: "Both are on your calendar at the same time — one has to move"
    });
  }
}

// ---------------------------------------------------------------------------
// Archive inbox noise
// ---------------------------------------------------------------------------

function planArchive(
  ctx: DelegationContext,
  actions: PlannedAction[],
  issues: DelegationIssue[],
  seenQueueIds: Set<string>
): void {
  if (!ctx.gmailModifyGranted) {
    issues.push({ kind: "missing-permission", message: "Silent archiving isn't granted — grant it in Settings to let me clean up obvious noise." });
    return;
  }

  const candidates = collectArchiveCandidates(ctx.snapshot);
  if (candidates.length === 0) return;

  const { detect, prepare } = useActionQueue.getState();

  for (const candidate of candidates) {
    const queueId = `${GMAIL_ARCHIVE_EXECUTOR_ID}:${candidate.messageId}`;
    if (seenQueueIds.has(queueId)) continue;
    seenQueueIds.add(queueId);

    detect({
      id: queueId,
      executor: GMAIL_ARCHIVE_EXECUTOR_ID,
      title: `Archive: ${candidate.subject || "(no subject)"}`,
      confidence: candidate.confidence
    });
    prepare({
      id: queueId,
      executor: GMAIL_ARCHIVE_EXECUTOR_ID,
      params: candidate,
      confidence: candidate.confidence,
      forceApproval: candidate.confidence < SILENT_ARCHIVE_CONFIDENCE_THRESHOLD
    });

    if (!verifyPrepared(queueId)) {
      issues.push({ kind: "unsupported-request", message: UNAVAILABLE_MESSAGE.archive });
      continue;
    }

    actions.push({
      queueId,
      kind: "archive",
      summary: `Archive "${candidate.subject || "(no subject)"}"`,
      fact: candidate.reason,
      why: "Matches the automated-noise pattern, not a real conversation",
      confidence: candidate.confidence
    });
  }
}
