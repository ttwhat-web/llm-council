"use client";

/**
 * Draft Replies · the approve→send loop, through the generic Action
 * Queue. "Draft N replies" runs the drafting service once per stale
 * thread (max 4). Each draft can be edited, then Approved — approval
 * chrome is <ActionApproval/>, the same generic component Calendar
 * uses. This file only supplies the Gmail-specific content: the
 * editable subject/body, Copy.
 *
 * Honest fallbacks:
 *  * No Anthropic key → CTA pointing at Settings → AI Keys.
 *  * Per-draft errors render inline; other drafts still succeed.
 *  * Send failures render with the message + a generic Retry.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader, RefreshCw } from "lucide-react";
import { useSourcesStore } from "@/store/sources";
import { useAiProviderStore } from "@/store/aiProvider";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import { draftReply } from "@/services/drafting/draftReply";
import {
  collectCandidates,
  readFounderName,
  MAX_DRAFTS_PER_BATCH,
  type CustomerCandidate
} from "@/services/drafting/candidates";
import { useActionQueue, GMAIL_SEND_EXECUTOR_ID } from "@/services/executors";
import { recordMetric } from "@/store/metrics";
import { useBillingStore, computeTrialStatus } from "@/store/billing";
import { FeedbackPrompt } from "@/components/home/FeedbackPrompt";
import { ActionApproval } from "@/components/executors/ActionApproval";
import type { DraftResponse } from "@/services/drafting/types";

type DraftState =
  | { kind: "idle" }
  | { kind: "drafting" }
  | { kind: "drafted"; draft: DraftResponse }
  | { kind: "error"; error: string };

export function DraftReplies() {
  const snapshot = useSourcesStore((s) => s.snapshot);
  const anthropicKey = useAiProviderStore((s) => s.anthropicKey);
  const memory = useOperatorMemoryStore((s) => s.memory);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [busy, setBusy] = useState(false);

  const candidates = useMemo(() => collectCandidates(snapshot), [snapshot]);
  // Prefer the memory's firstName when set; otherwise fall back to
  // the legacy localStorage value so existing users don't lose their
  // greeting after this commit.
  const founderFirstName = memory.firstName?.trim() || readFounderName();

  const approve = useActionQueue((s) => s.approve);
  const prepare = useActionQueue((s) => s.prepare);
  const queueItems = useActionQueue((s) => s.items);

  const billingStartedAt = useBillingStore((s) => s.startedAt);
  const billingUpgraded = useBillingStore((s) => s.upgraded);
  const trialExpired = useMemo(
    () => !billingUpgraded && computeTrialStatus(billingStartedAt, billingUpgraded, Date.now()).isExpired,
    [billingStartedAt, billingUpgraded]
  );

  const batch = useMemo(() => candidates.slice(0, MAX_DRAFTS_PER_BATCH), [candidates]);

  // Which drafted replies still need a founder decision — not yet
  // approved, and not already resolved.
  const drafted = batch.filter((c) => drafts[c.customerEmail]?.kind === "drafted");
  const pendingApproval = drafted.filter((c) => {
    const q = queueItems[`${GMAIL_SEND_EXECUTOR_ID}:${c.customerEmail}`];
    return (
      !q ||
      q.status === "prepared" ||
      (q.status === "waiting_approval" && q.approvedAt == null) ||
      q.status === "cancelled" ||
      q.status === "failed"
    );
  });
  const approveAll = useCallback(() => {
    for (const c of pendingApproval) {
      const state = drafts[c.customerEmail];
      if (state?.kind !== "drafted") continue;
      const actionId = `${GMAIL_SEND_EXECUTOR_ID}:${c.customerEmail}`;
      recordMetric(actionId, "approved");
      approve(actionId);
    }
  }, [approve, drafts, pendingApproval]);

  // Draft (or re-draft) a specific set of candidates, then register
  // each success as a "prepared" queue entry — the same call Morning
  // Run makes, so the queue stays the one source of truth regardless
  // of whether the pipeline or this manual path produced the draft.
  const draftSpecific = useCallback(
    async (list: CustomerCandidate[]) => {
      if (!anthropicKey || list.length === 0) return;
      setBusy(true);
      setDrafts((d) => {
        const next = { ...d };
        for (const c of list) next[c.customerEmail] = { kind: "drafting" };
        return next;
      });
      // Run serially to stay polite to the API on first run.
      for (const c of list) {
        const result = await draftReply(
          { context: c, founderFirstName, intent: "follow-up", memory },
          anthropicKey
        );
        if (result.ok) {
          const actionId = `${GMAIL_SEND_EXECUTOR_ID}:${c.customerEmail}`;
          recordMetric(actionId, "generated");
          prepare({
            id: actionId,
            executor: GMAIL_SEND_EXECUTOR_ID,
            params: {
              to: result.draft.to,
              subject: result.draft.subject,
              body: result.draft.body,
              threadId: c.threadMessages[0]?.threadId,
              promptVersion: result.draft.promptVersion,
              model: result.draft.model
            }
          });
        }
        setDrafts((d) => ({
          ...d,
          [c.customerEmail]: result.ok
            ? { kind: "drafted", draft: result.draft }
            : { kind: "error", error: result.error }
        }));
      }
      setBusy(false);
    },
    [anthropicKey, founderFirstName, memory, prepare]
  );

  const draftAll = useCallback(() => draftSpecific(batch), [draftSpecific, batch]);

  // Hydrate from whatever Morning Run already prepared, then draft
  // only what's genuinely missing — zero duplicate AI calls when the
  // pipeline already ran before the founder opened Home. Runs once
  // per distinct batch.
  const autoRunRef = useRef<string>("");
  useEffect(() => {
    if (batch.length === 0) return;
    const key = batch.map((c) => c.customerEmail).join("|");
    if (autoRunRef.current === key) return;

    const hydrated: Array<[string, DraftState]> = [];
    const missing: CustomerCandidate[] = [];
    for (const c of batch) {
      if (drafts[c.customerEmail]) continue; // already local (drafted/drafting/error)
      const params = queueItems[`${GMAIL_SEND_EXECUTOR_ID}:${c.customerEmail}`]?.params as
        | { to?: string; subject?: string; body?: string; promptVersion?: string; model?: string }
        | undefined;
      if (params?.to && params.subject && params.body) {
        hydrated.push([
          c.customerEmail,
          {
            kind: "drafted",
            draft: {
              to: params.to,
              subject: params.subject,
              body: params.body,
              customerEmail: c.customerEmail,
              promptVersion: params.promptVersion ?? "unknown",
              model: params.model ?? "unknown"
            }
          }
        ]);
      } else if (anthropicKey) {
        missing.push(c);
      }
    }
    if (hydrated.length === 0 && missing.length === 0) return;

    autoRunRef.current = key;
    if (hydrated.length > 0) {
      setDrafts((d) => {
        const next = { ...d };
        for (const [email, state] of hydrated) next[email] = state;
        return next;
      });
    }
    if (missing.length > 0) void draftSpecific(missing);
  }, [batch, drafts, queueItems, anthropicKey, draftSpecific]);

  if (candidates.length === 0) return null;

  if (trialExpired) return <TrialEndedCard count={batch.length} />;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold text-white">
          {busy
            ? "Preparing your replies…"
            : pendingApproval.length > 0
              ? `${pendingApproval.length} ${pendingApproval.length === 1 ? "reply is" : "replies are"} ready to send`
              : "Replies"}
        </span>
        <div className="flex items-center gap-2">
          {pendingApproval.length > 1 && (
            <button
              type="button"
              onClick={approveAll}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-[12px] font-semibold text-black transition hover:bg-white/90"
              title="Approve and send every reply below (30-second undo on each)"
            >
              <Check className="h-3.5 w-3.5" /> Approve all ({pendingApproval.length})
            </button>
          )}
          <button
            type="button"
            onClick={draftAll}
            disabled={busy || !anthropicKey}
            title={anthropicKey ? "Re-draft all replies" : "Add an Anthropic API key in Settings to enable drafts."}
            aria-label="Re-draft replies"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-white/70 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      {!anthropicKey && (
        <div className="rounded-lg bg-amber-500/[0.06] px-3 py-2 text-[12.5px] text-amber-200/85">
          The deterministic engine surfaced these customers. To generate replies,
          add an Anthropic API key in{" "}
          <Link to="/settings" className="underline-offset-2 hover:underline">
            Settings → AI Keys
          </Link>
          . Keys stay on this device.
        </div>
      )}

      <p className="text-[12px] leading-relaxed text-white/45">
        Approve sends the reply through your Gmail. Nothing leaves for 30 seconds —
        one tap on Undo cancels it. Every send is shown here with a receipt.
      </p>

      <ul className="flex flex-col gap-3">
        {candidates.slice(0, MAX_DRAFTS_PER_BATCH).map((c) => {
          const state = drafts[c.customerEmail] ?? { kind: "idle" };
          return (
            <DraftCard key={c.customerEmail} candidate={c} state={state} />
          );
        })}
      </ul>
    </section>
  );
}

function TrialEndedCard({ count }: { count: number }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl bg-amber-500/[0.06] px-4 py-3.5">
      <p className="text-[14px] font-medium text-amber-100">
        {count} repl{count === 1 ? "y is" : "ies are"} ready, but your trial has ended.
      </p>
      <p className="text-[12.5px] leading-relaxed text-amber-100/70">
        Operator can still read your inbox — sending is a paid feature.
        Upgrade to keep the drafts flowing.
      </p>
      <Link
        to="/settings"
        className="self-start text-[13px] font-medium text-white transition hover:text-white/80"
      >
        ▸ Upgrade in Settings
      </Link>
    </section>
  );
}

function DraftCard({
  candidate,
  state
}: {
  candidate: CustomerCandidate;
  state: DraftState;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl bg-white/[0.018] p-3">
      <header className="flex min-w-0 items-baseline justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-medium text-white">{candidate.customerName}</span>
          <span className="truncate text-[11.5px] text-white/45">
            {candidate.customerEmail} · {candidate.daysSinceLastInbound}d
          </span>
        </span>
      </header>
      {state.kind === "idle" && (
        <p className="text-[12px] text-white/40">Press &quot;Draft N replies&quot; to generate.</p>
      )}
      {state.kind === "drafting" && (
        <p className="flex items-center gap-2 text-[12.5px] text-white/55">
          <Loader className="h-3 w-3 animate-spin" /> Drafting…
        </p>
      )}
      {state.kind === "error" && (
        <p className="rounded bg-rose-500/[0.06] px-2 py-1.5 text-[12px] text-rose-200">
          {state.error}
        </p>
      )}
      {state.kind === "drafted" && (
        <DraftBody
          draft={state.draft}
          threadId={candidate.threadMessages[0]?.threadId}
          customerName={candidate.customerName}
        />
      )}
    </li>
  );
}

function DraftBody({
  draft,
  threadId,
  customerName
}: {
  draft: DraftResponse;
  threadId?: string;
  customerName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [body, setBody] = useState(draft.body);
  const [editing, setEditing] = useState(false);

  const queueId = useMemo(() => `${GMAIL_SEND_EXECUTOR_ID}:${draft.customerEmail}`, [draft.customerEmail]);
  const action = useActionQueue((s) => s.items[queueId]);
  const approve = useActionQueue((s) => s.approve);
  const undo = useActionQueue((s) => s.undo);
  const retry = useActionQueue((s) => s.retry);
  const updateParams = useActionQueue((s) => s.updateParams);
  const markWaitingApproval = useActionQueue((s) => s.markWaitingApproval);

  // Metric · this draft was shown to the founder (once) — and the
  // queue's own honest "a founder actually saw this" transition.
  useEffect(() => {
    recordMetric(queueId, "shown");
    markWaitingApproval(queueId);
  }, [queueId, markWaitingApproval]);

  // Metric · reflect the executor's terminal outcome (once each).
  useEffect(() => {
    if (action?.status === "completed") recordMetric(queueId, "sent");
    else if (action?.status === "failed") recordMetric(queueId, "failed");
    else if (action?.status === "cancelled") recordMetric(queueId, "undone");
  }, [action?.status, queueId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore clipboard failure */
    }
  };

  const onEditBody = (v: string) => {
    // Metric · the founder changed the draft (once). This is the signal
    // that decides the KPI: an edited draft is NOT an approval-without-edit.
    if (v !== draft.body) recordMetric(queueId, "edited");
    setBody(v);
  };

  const syncedParams = () => ({
    to: draft.to,
    subject: draft.subject,
    body,
    threadId,
    promptVersion: draft.promptVersion,
    model: draft.model
  });

  const onApprove = () => {
    recordMetric(queueId, "approved");
    // Sync any local edits into the queue's own record before it
    // becomes the thing that actually executes.
    updateParams(queueId, syncedParams());
    approve(queueId);
  };

  const onRetry = () => {
    updateParams(queueId, syncedParams());
    retry(queueId);
  };

  const editableContent = (
    <>
      <span className="text-[11.5px] text-white/45">Subject · {draft.subject}</span>
      {editing ? (
        <textarea
          value={body}
          onChange={(e) => onEditBody(e.target.value)}
          rows={5}
          className="min-h-[120px] w-full resize-y rounded-lg bg-black/30 p-3 text-[13px] leading-relaxed text-white focus:outline-none"
        />
      ) : (
        <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-sans text-[13px] leading-relaxed text-white/90">
          {body}
        </pre>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-[11.5px] text-white/80 transition hover:bg-white/[0.08]"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={copy}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] transition ${
            copied ? "bg-emerald-500/[0.12] text-emerald-200" : "bg-white/[0.05] text-white/80 hover:bg-white/[0.08]"
          }`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-2">
      <ActionApproval action={action} onApprove={onApprove} onUndo={() => undo(queueId)} onRetry={onRetry}>
        {editableContent}
      </ActionApproval>
      {action?.status === "completed" && (
        <FeedbackPrompt
          actionId={queueId}
          promptVersion={draft.promptVersion}
          model={draft.model}
          originalBody={draft.body}
          finalBody={body}
          subjectLabel={customerName}
          subjectKey={draft.customerEmail}
        />
      )}
    </div>
  );
}
