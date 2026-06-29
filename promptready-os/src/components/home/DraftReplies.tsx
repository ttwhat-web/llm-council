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

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Loader, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { useSourcesStore } from "@/store/sources";
import { useAiProviderStore } from "@/store/aiProvider";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import { draftReply } from "@/services/drafting/draftReply";
import { useSendQueueStore, undoSecondsLeft } from "@/services/drafting/sendQueue";
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

  if (candidates.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 pt-2">
      <header className="flex items-baseline justify-between gap-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-white/30">
          Drafts
        </span>
        <button
          type="button"
          onClick={draftAll}
          disabled={busy || !anthropicKey}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[11.5px] font-medium text-white/85 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
          title={
            anthropicKey
              ? `Draft ${Math.min(candidates.length, MAX_DRAFTS_PER_BATCH)} replies`
              : "Add an Anthropic API key in Settings to enable drafts."
          }
        >
          {busy ? <Loader className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {busy ? "Drafting…" : `Draft ${Math.min(candidates.length, MAX_DRAFTS_PER_BATCH)} replies`}
        </button>
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

  const queueId = useMemo(() => `send-${draft.customerEmail}`, [draft.customerEmail]);
  const sent = useSendQueueStore((s) => s.items[queueId]);
  const approve = useSendQueueStore((s) => s.approve);
  const undo = useSendQueueStore((s) => s.undo);

  // Re-render every second while in the undo window for the countdown.
  const [, force] = useState(0);
  useEffect(() => {
    if (sent?.status !== "sending") return;
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

  const onApprove = () => {
    approve({
      id: queueId,
      to: draft.to,
      subject: draft.subject,
      body,
      threadId
    });
  };

  // Terminal / in-flight states replace the action row.
  if (sent?.status === "sending") {
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
  if (sent?.status === "sent") {
    return <ReceiptLine tone="emerald">✓ Sent to {draft.to}.</ReceiptLine>;
  }
  if (sent?.status === "undone") {
    return (
      <div className="flex flex-col gap-2">
        <ReceiptLine tone="muted">Not sent. The draft is below if you want to try again.</ReceiptLine>
        <DraftEditor body={body} editing={editing} onEdit={setBody} subject={draft.subject} />
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
      <DraftEditor body={body} editing={editing} onEdit={setBody} subject={draft.subject} />
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
