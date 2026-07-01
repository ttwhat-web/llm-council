"use client";

/**
 * Draft Replies · the approve→send loop.
 *
 * Rendered inside the Customer focus column. "Draft N replies" runs
 * the drafting service once per stale thread (max 4). Each draft can
 * be edited, then Approved. Approve queues the send with a 30-second
 * undo window (see services/drafting/sendQueue.ts); after the window
 * the reply is sent through the founder's Gmail (gmail.send) and a
 * receipt is shown. One keystroke closes a thread the founder had
 * been avoiding — this is the ✓.
 *
 * Honest fallbacks:
 *  * No Anthropic key → CTA pointing at Settings → AI Keys.
 *  * Per-draft errors render inline; other drafts still succeed.
 *  * Send errors render with the message + an Approve & retry.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Loader, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { useSourcesStore } from "@/store/sources";
import { useAiProviderStore } from "@/store/aiProvider";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import { draftReply } from "@/services/drafting/draftReply";
import { useActionQueue, undoSecondsLeft, GMAIL_SEND_EXECUTOR_ID } from "@/services/executors";
import { recordMetric } from "@/store/metrics";
import { useBillingStore, computeTrialStatus } from "@/store/billing";
import type { DraftResponse } from "@/services/drafting/types";
import type { GmailMessage } from "@/services/google/types";

const MAX_DRAFTS_PER_BATCH = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

interface CustomerCandidate {
  customerName: string;
  customerEmail: string;
  threadMessages: GmailMessage[];
  daysSinceLastInbound: number;
  subject: string;
}

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
  const queueItems = useActionQueue((s) => s.items);

  const billingStartedAt = useBillingStore((s) => s.startedAt);
  const billingUpgraded = useBillingStore((s) => s.upgraded);
  const trialExpired = useMemo(
    () => !billingUpgraded && computeTrialStatus(billingStartedAt, billingUpgraded, Date.now()).isExpired,
    [billingStartedAt, billingUpgraded]
  );

  const batch = useMemo(() => candidates.slice(0, MAX_DRAFTS_PER_BATCH), [candidates]);

  // Which drafted replies are ready to approve but not yet queued/done.
  const drafted = batch.filter((c) => drafts[c.customerEmail]?.kind === "drafted");
  const pendingApproval = drafted.filter((c) => {
    const q = queueItems[`${GMAIL_SEND_EXECUTOR_ID}:${c.customerEmail}`];
    return !q || q.status === "undone" || q.status === "error";
  });
  // "Morning complete" when every drafted reply reached a terminal
  // state (sent or intentionally skipped) and nothing is left to do.
  const settled = drafted.filter((c) => {
    const q = queueItems[`${GMAIL_SEND_EXECUTOR_ID}:${c.customerEmail}`];
    return q?.status === "done" || q?.status === "undone";
  });
  const sentCount = drafted.filter(
    (c) => queueItems[`${GMAIL_SEND_EXECUTOR_ID}:${c.customerEmail}`]?.status === "done"
  ).length;
  const morningComplete = drafted.length > 0 && settled.length === drafted.length;

  const approveAll = useCallback(() => {
    for (const c of pendingApproval) {
      const state = drafts[c.customerEmail];
      if (state?.kind !== "drafted") continue;
      const actionId = `${GMAIL_SEND_EXECUTOR_ID}:${c.customerEmail}`;
      recordMetric(actionId, "approved");
      approve({
        id: actionId,
        executorId: GMAIL_SEND_EXECUTOR_ID,
        params: {
          to: state.draft.to,
          subject: state.draft.subject,
          body: state.draft.body,
          threadId: c.threadMessages[0]?.threadId
        }
      });
    }
  }, [approve, drafts, pendingApproval]);

  const draftAll = useCallback(async () => {
    if (!anthropicKey) return;
    if (candidates.length === 0) return;
    setBusy(true);
    const batch = candidates.slice(0, MAX_DRAFTS_PER_BATCH);
    setDrafts((d) => {
      const next = { ...d };
      for (const c of batch) next[c.customerEmail] = { kind: "drafting" };
      return next;
    });
    // Run serially to stay polite to the API on first run.
    for (const c of batch) {
      const result = await draftReply(
        {
          context: c,
          founderFirstName,
          intent: "follow-up",
          memory
        },
        anthropicKey
      );
      if (result.ok) recordMetric(`${GMAIL_SEND_EXECUTOR_ID}:${c.customerEmail}`, "generated");
      setDrafts((d) => ({
        ...d,
        [c.customerEmail]:
          result.ok
            ? { kind: "drafted", draft: result.draft }
            : { kind: "error", error: result.error }
      }));
    }
    setBusy(false);
  }, [anthropicKey, candidates, founderFirstName, memory]);

  // Auto-prepare on load · the work is ready before the founder asks.
  // Runs once per distinct candidate set; only when an AI key exists
  // and nothing has been drafted yet. This is what turns "click Draft"
  // into "it's already done" — fewer clicks, calmer morning.
  const autoDraftedRef = useRef<string>("");
  useEffect(() => {
    if (!anthropicKey || candidates.length === 0) return;
    const key = candidates.slice(0, MAX_DRAFTS_PER_BATCH).map((c) => c.customerEmail).join("|");
    if (autoDraftedRef.current === key) return;
    if (Object.keys(drafts).length > 0) return;
    autoDraftedRef.current = key;
    void draftAll();
  }, [anthropicKey, candidates, drafts, draftAll]);

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

      {morningComplete && (
        <div className="rounded-xl bg-emerald-500/[0.06] px-4 py-3">
          <p className="text-[14px] font-medium text-emerald-200">
            Morning complete.
          </p>
          <p className="text-[12.5px] text-emerald-200/70">
            {sentCount === 0
              ? "Nothing sent — you skipped them all."
              : `${sentCount} repl${sentCount === 1 ? "y" : "ies"} sent. Close the laptop.`}
          </p>
        </div>
      )}

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
        <DraftBody draft={state.draft} threadId={candidate.threadMessages[0]?.threadId} />
      )}
    </li>
  );
}

function DraftBody({ draft, threadId }: { draft: DraftResponse; threadId?: string }) {
  const [copied, setCopied] = useState(false);
  const [body, setBody] = useState(draft.body);
  const [editing, setEditing] = useState(false);

  const queueId = useMemo(() => `${GMAIL_SEND_EXECUTOR_ID}:${draft.customerEmail}`, [draft.customerEmail]);
  const sent = useActionQueue((s) => s.items[queueId]);
  const approve = useActionQueue((s) => s.approve);
  const undo = useActionQueue((s) => s.undo);

  // Metric · this draft was shown to the founder (once).
  useEffect(() => {
    recordMetric(queueId, "shown");
  }, [queueId]);

  // Metric · reflect the executor's terminal outcome (once each).
  useEffect(() => {
    if (sent?.status === "done") recordMetric(queueId, "sent");
    else if (sent?.status === "error") recordMetric(queueId, "failed");
    else if (sent?.status === "undone") recordMetric(queueId, "undone");
  }, [sent?.status, queueId]);

  // Re-render every second while in the undo window for the countdown.
  const [, force] = useState(0);
  useEffect(() => {
    if (sent?.status !== "queued") return;
    const t = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [sent?.status]);

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

  const onApprove = () => {
    recordMetric(queueId, "approved");
    approve({
      id: queueId,
      executorId: GMAIL_SEND_EXECUTOR_ID,
      params: { to: draft.to, subject: draft.subject, body, threadId }
    });
  };

  // Terminal / in-flight states replace the action row.
  if (sent?.status === "queued") {
    const left = undoSecondsLeft(sent);
    return (
      <div className="flex flex-col gap-2">
        <ReceiptLine tone="amber">
          Sending to {draft.to} in {left}s…
          <button
            type="button"
            onClick={() => undo(queueId)}
            className="ml-2 underline-offset-2 hover:underline"
          >
            Undo
          </button>
        </ReceiptLine>
      </div>
    );
  }
  if (sent?.status === "executing") {
    return <ReceiptLine tone="amber">Sending to {draft.to}…</ReceiptLine>;
  }
  if (sent?.status === "done") {
    return <ReceiptLine tone="emerald">✓ {sent.receipt ?? `Sent to ${draft.to}.`}</ReceiptLine>;
  }
  if (sent?.status === "undone") {
    return (
      <div className="flex flex-col gap-2">
        <ReceiptLine tone="muted">Not sent. The draft is below if you want to try again.</ReceiptLine>
        <DraftEditor body={body} editing={editing} onEdit={onEditBody} subject={draft.subject} />
        <ApproveRow onApprove={onApprove} onCopy={copy} copied={copied} onEditToggle={() => setEditing((v) => !v)} />
      </div>
    );
  }
  if (sent?.status === "error") {
    return (
      <div className="flex flex-col gap-2">
        <ReceiptLine tone="rose">Send failed · {sent.error}</ReceiptLine>
        <ApproveRow onApprove={onApprove} onCopy={copy} copied={copied} onEditToggle={() => setEditing((v) => !v)} retry />
      </div>
    );
  }

  // Default · drafted, not yet approved.
  return (
    <div className="flex flex-col gap-2">
      <DraftEditor body={body} editing={editing} onEdit={onEditBody} subject={draft.subject} />
      <ApproveRow onApprove={onApprove} onCopy={copy} copied={copied} onEditToggle={() => setEditing((v) => !v)} />
    </div>
  );
}

function DraftEditor({
  body,
  subject,
  editing,
  onEdit
}: {
  body: string;
  subject: string;
  editing: boolean;
  onEdit: (v: string) => void;
}) {
  return (
    <>
      <span className="text-[11.5px] text-white/45">Subject · {subject}</span>
      {editing ? (
        <textarea
          value={body}
          onChange={(e) => onEdit(e.target.value)}
          rows={5}
          className="min-h-[120px] w-full resize-y rounded-lg bg-black/30 p-3 text-[13px] leading-relaxed text-white focus:outline-none"
        />
      ) : (
        <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-sans text-[13px] leading-relaxed text-white/90">
          {body}
        </pre>
      )}
    </>
  );
}

function ApproveRow({
  onApprove,
  onCopy,
  copied,
  onEditToggle,
  retry
}: {
  onApprove: () => void;
  onCopy: () => void;
  copied: boolean;
  onEditToggle: () => void;
  retry?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onApprove}
        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-[12px] font-semibold text-black transition hover:bg-white/90"
      >
        <Check className="h-3.5 w-3.5" /> {retry ? "Approve & retry" : "Approve & send"}
      </button>
      <button
        type="button"
        onClick={onEditToggle}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-[11.5px] text-white/80 transition hover:bg-white/[0.08]"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onCopy}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] transition",
          copied ? "bg-emerald-500/[0.12] text-emerald-200" : "bg-white/[0.05] text-white/80 hover:bg-white/[0.08]"
        )}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function ReceiptLine({
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

// ---------------------------------------------------------------------------
// Candidate selection · same heuristic as the customers panel
// ---------------------------------------------------------------------------

function collectCandidates(
  snapshot: ReturnType<typeof useSourcesStore.getState>["snapshot"]
): CustomerCandidate[] {
  if (!snapshot) return [];
  const now = snapshot.syncedAt;
  const out: CustomerCandidate[] = [];
  for (const t of snapshot.threads) {
    const msgs = t.messages;
    if (msgs.length === 0) continue;
    const last = msgs[msgs.length - 1];
    if (last.isFromMe) continue;
    if (isNoise(last.fromAddress)) continue;
    const days = Math.max(0, Math.floor((now - last.date) / DAY_MS));
    if (days < 1) continue;
    out.push({
      customerName: last.fromName || last.fromAddress,
      customerEmail: last.fromAddress,
      threadMessages: msgs,
      daysSinceLastInbound: days,
      subject: t.subject || last.subject
    });
  }
  return out.sort((a, b) => b.daysSinceLastInbound - a.daysSinceLastInbound);
}

const NOISE_PREFIXES = ["noreply", "no-reply", "donotreply", "do-not-reply", "notifications"];
const NOISE_DOMAINS = new Set([
  "google.com",
  "googlemail.com",
  "youtube.com",
  "linkedin.com",
  "github.com"
]);

function isNoise(addr: string): boolean {
  const a = addr.trim().toLowerCase();
  if (!a) return true;
  const [local, domain] = a.split("@");
  if (NOISE_PREFIXES.some((p) => (local ?? "").startsWith(p))) return true;
  if (NOISE_DOMAINS.has(domain ?? "")) return true;
  return false;
}

function readFounderName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem("operator.user.firstName");
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}
