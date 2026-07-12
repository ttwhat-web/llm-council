/**
 * Company Brain · retrieval facade.
 *
 * The single place that answers "what does Operator know about this
 * person or company" — by combining what already lives in Gmail,
 * Calendar, the Action Queue, Memory, and Founder Feedback. Nothing is
 * stored here and nothing is invented: every fact is read straight off
 * a real record, capped to what's actually relevant (rule 7), deduped,
 * and — when two active memory notes disagree — surfaced as a plain
 * conflict rather than silently picked for the founder.
 */

import type { GmailMessage } from "@/services/google/types";
import type { Action } from "@/services/executors/types";
import { GMAIL_SEND_EXECUTOR_ID } from "@/services/executors";
import { buildTimeline } from "@/services/executors/timeline";
import { collectCandidates } from "@/services/drafting/candidates";
import { deriveNotes, findContradictions, STALE_CONFIDENCE_THRESHOLD } from "@/services/memory/distillation";
import { resolveSubject } from "./resolveSubject";
import type { CompanyBrainContext, CompanyBrainFact, CompanyBrainResult, SubjectResolution } from "./types";
import { useSourcesStore } from "@/store/sources";
import { useActionQueue } from "@/services/executors";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import { useMemoryCandidatesStore } from "@/store/memoryCandidates";
import { useMemoryNotesStore } from "@/store/memoryNotes";
import { useFeedbackStore } from "@/store/feedback";

const MAX_FACTS_PER_SECTION = 5;

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function isTopicSubject(subjectKey: string): string | null {
  return subjectKey.startsWith("topic:") ? subjectKey.slice("topic:".length) : null;
}

function messageMentionsSubject(m: GmailMessage, subjectKey: string, topic: string | null): boolean {
  if (topic) return m.subject.toLowerCase().includes(topic) || m.snippet.toLowerCase().includes(topic);
  return m.fromAddress === subjectKey || m.toAddresses.includes(subjectKey);
}

function actionReferencesSubject(action: Action, subjectKey: string, displayName: string, topic: string | null): boolean {
  const params = action.params as { to?: string } | undefined;
  if (params?.to && normalize(params.to) === normalize(subjectKey)) return true;
  const needle = normalize(topic ?? displayName);
  if (!needle) return false;
  return normalize(`${action.title} ${action.description ?? ""}`).includes(needle);
}

/** Dedupe by normalized text (rule: duplicate merging), newest first,
 *  capped to keep this a relevant summary, not a history dump (rule 7). */
function rankAndCap(facts: CompanyBrainFact[]): CompanyBrainFact[] {
  const seen = new Set<string>();
  const deduped = facts.filter((f) => {
    const key = normalize(f.text);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  deduped.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  return deduped.slice(0, MAX_FACTS_PER_SECTION);
}

export function getCompanyBrainResult(
  query: string,
  ctx: CompanyBrainContext
): CompanyBrainResult | Exclude<SubjectResolution, { kind: "resolved" }> {
  const resolution = resolveSubject(query, ctx.snapshot, ctx.now);
  if (resolution.kind !== "resolved") return resolution;
  return buildResult(resolution.subjectKey, resolution.displayName, ctx);
}

function buildResult(subjectKey: string, displayName: string, ctx: CompanyBrainContext): CompanyBrainResult {
  const topic = isTopicSubject(subjectKey);
  const snapshot = ctx.snapshot;

  // --- Email ---------------------------------------------------------
  const matchingMessages = (snapshot?.messages ?? [])
    .filter((m) => messageMentionsSubject(m, subjectKey, topic))
    .sort((a, b) => b.date - a.date);

  const lastContact: CompanyBrainFact | null = matchingMessages[0]
    ? {
        text: `${matchingMessages[0].isFromMe ? "You wrote" : "They wrote"}: "${matchingMessages[0].subject || "(no subject)"}"`,
        source: "email",
        at: matchingMessages[0].date
      }
    : null;

  // --- Action Queue + Timeline (pending / decisions / attention) ------
  const subjectActions = Object.values(ctx.actionItems).filter((a) => actionReferencesSubject(a, subjectKey, displayName, topic));
  const subjectActionIds = new Set(subjectActions.map((a) => a.id));

  const pending: CompanyBrainFact[] = subjectActions
    .filter((a) => a.status === "prepared" || a.status === "waiting_approval")
    .map((a) => ({ text: a.title, source: "queue" as const, at: a.createdAt }));

  // Real Timeline receipts, not a re-derivation of the Action Queue's
  // own fields — same tested labels/evidence a founder already sees.
  const subjectTimeline = buildTimeline(ctx.actionLog, ctx.actionItems).filter((t) => subjectActionIds.has(t.actionId));

  const recentDecisions: CompanyBrainFact[] = subjectTimeline
    .filter((t) => t.event === "completed" || t.event === "undone")
    .map((t) => ({ text: t.evidence ?? t.label, source: "queue" as const, at: t.at }));

  const attentionFromActions: CompanyBrainFact[] = subjectTimeline
    .filter((t) => t.event === "failed")
    .map((t) => ({ text: t.evidence ? `${t.label} — ${t.evidence}` : t.label, source: "queue" as const, at: t.at }));

  // Founder corrections on this subject's actions — real, explicit
  // feedback, never inferred.
  const feedbackFacts: CompanyBrainFact[] = ctx.feedbackEvents
    .filter((f) => subjectActionIds.has(f.actionId) && f.rating === "not_usable" && f.correction)
    .map((f) => ({ text: `Founder correction: ${f.correction}`, source: "feedback" as const, at: f.at }));

  // A real customer thread waiting on a reply that hasn't even been
  // prepared yet — only meaningful for a real email subject.
  const overdueCandidate = topic ? undefined : collectCandidates(snapshot).find((c) => normalize(c.customerEmail) === normalize(subjectKey));
  const hasReplyAction = subjectActions.some((a) => a.id === `${GMAIL_SEND_EXECUTOR_ID}:${subjectKey}`);
  if (overdueCandidate && !hasReplyAction) {
    attentionFromActions.push({
      text: `Waiting ${overdueCandidate.daysSinceLastInbound} day${overdueCandidate.daysSinceLastInbound === 1 ? "" : "s"} for a reply — nothing prepared yet.`,
      source: "email"
    });
  }

  // --- Memory ----------------------------------------------------------
  const notes = deriveNotes(ctx.memory, ctx.candidates, ctx.noteOverrides, ctx.now).filter(
    (n) => n.status === "active" && n.subjectLabel && normalize(n.subjectLabel) === normalize(displayName)
  );
  const memory: CompanyBrainFact[] = notes.map((n) => ({ text: n.text, source: "memory" as const, at: n.lastReinforcedAt }));
  const staleMemoryFacts: CompanyBrainFact[] = notes
    .filter((n) => n.confidence < STALE_CONFIDENCE_THRESHOLD)
    .map((n) => ({ text: `"${n.text}" hasn't been reinforced in a while (confidence ${n.confidence}%).`, source: "memory" as const, at: n.lastReinforcedAt }));

  const conflicts = findContradictions(notes)
    .map((c) => ({
      a: { text: c.remember.text, source: "memory" as const, at: c.remember.lastReinforcedAt },
      b: { text: c.avoid.text, source: "memory" as const, at: c.avoid.lastReinforcedAt },
      note: `Operator has both a "remember" and an "avoid" note about ${c.subjectLabel} — worth checking these don't conflict.`
    }));

  const attention = rankAndCap([...attentionFromActions, ...staleMemoryFacts]);

  // --- Recommendation — grounded only, never forced -------------------
  const recommendation = buildRecommendation(pending, lastContact, overdueCandidate);

  // --- Who -------------------------------------------------------------
  const who = buildWho(displayName, topic, matchingMessages);

  const hasEvidence =
    !!lastContact || pending.length > 0 || memory.length > 0 || recentDecisions.length > 0 || attention.length > 0;

  return {
    subjectKey,
    displayName,
    who,
    lastContact,
    pending: rankAndCap(pending),
    memory: rankAndCap(memory),
    recentDecisions: rankAndCap([...recentDecisions, ...feedbackFacts]),
    attention,
    recommendation,
    conflicts,
    hasEvidence
  };
}

function buildRecommendation(
  pending: CompanyBrainFact[],
  lastContact: CompanyBrainFact | null,
  overdueCandidate: { daysSinceLastInbound: number } | undefined
): CompanyBrainResult["recommendation"] {
  if (pending.length > 0) {
    return { text: "There's already a prepared action for this — review it when ready.", evidence: [pending[0]] };
  }
  if (overdueCandidate && lastContact) {
    const days = overdueCandidate.daysSinceLastInbound;
    return {
      text: `Send a follow-up — it's been ${days} day${days === 1 ? "" : "s"} since they last wrote.`,
      evidence: [lastContact]
    };
  }
  return null;
}

function buildWho(displayName: string, topic: string | null, matchingMessages: GmailMessage[]): string {
  if (topic) {
    return matchingMessages.length > 0
      ? `Mentioned across ${matchingMessages.length} email${matchingMessages.length === 1 ? "" : "s"}`
      : "Mentioned on your calendar";
  }
  if (matchingMessages.length === 0) return `${displayName} · no email history yet`;
  const earliest = matchingMessages[matchingMessages.length - 1].date;
  return `${displayName} · ${matchingMessages.length} email${matchingMessages.length === 1 ? "" : "s"} since ${new Date(earliest).toLocaleDateString()}`;
}

/** True only for a real resolved brief — ambiguous/not-found both carry
 *  a `kind` discriminant that a resolved CompanyBrainResult never has. */
export function isResolvedBrainResult(
  result: ReturnType<typeof getCompanyBrainResult>
): result is CompanyBrainResult {
  return !("kind" in result);
}

/**
 * Plain-language block for splicing into an AI prompt (drafting,
 * Operator's Read) — never a technical label, only business context.
 * Empty string when there's genuinely nothing real to say, so callers
 * can interpolate unconditionally without polluting the prompt.
 */
export function renderCompanyBrainForPrompt(result: CompanyBrainResult): string {
  if (!result.hasEvidence) return "";
  const lines: string[] = [`What you know about ${result.displayName}:`, `  ${result.who}`];
  if (result.lastContact) lines.push(`  Last contact: ${result.lastContact.text}`);
  if (result.pending.length > 0) lines.push(`  Already pending: ${result.pending.map((f) => f.text).join("; ")}`);
  if (result.memory.length > 0) lines.push(`  Remembered: ${result.memory.map((f) => f.text).join("; ")}`);
  if (result.recentDecisions.length > 0) {
    lines.push(`  Recent decisions: ${result.recentDecisions.map((f) => f.text).join("; ")}`);
  }
  if (result.attention.length > 0) lines.push(`  Needs attention: ${result.attention.map((f) => f.text).join("; ")}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Composition helper — the only place this file touches the stores.
// Safe to call from anywhere (React or not), same convention as
// operatorMemory's readMemoryNow() / distillation's getActiveMemoryView().
// ---------------------------------------------------------------------------

export function getActiveCompanyBrainContext(now: number = Date.now()): CompanyBrainContext {
  return {
    snapshot: useSourcesStore.getState().snapshot,
    actionItems: useActionQueue.getState().items,
    actionLog: useActionQueue.getState().log,
    memory: useOperatorMemoryStore.getState().memory,
    candidates: useMemoryCandidatesStore.getState().candidates,
    noteOverrides: useMemoryNotesStore.getState().overrides,
    feedbackEvents: useFeedbackStore.getState().events,
    now
  };
}
