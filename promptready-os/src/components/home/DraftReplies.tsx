"use client";

/**
 * Draft Replies · the P0 closed-loop UI.
 *
 * Rendered inside the Customer focus column. When the user clicks
 * "Draft N replies", we run the drafting service once per receipt
 * (limited to 4 to keep first-time cost low), render each draft
 * inline with Copy and "Open in Gmail" buttons, and the founder
 * sends through Gmail's own compose window. No Gmail Send scope.
 *
 * Honest fallbacks:
 *  * No Anthropic key → CTA: "Add an Anthropic API key in Settings".
 *  * Per-draft errors render with the error message; other drafts
 *    still succeed and render normally.
 */

import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, ExternalLink, Loader, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { useSourcesStore } from "@/store/sources";
import { useAiProviderStore } from "@/store/aiProvider";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import {
  buildGmailComposeUrl,
  draftReply
} from "@/services/drafting/draftReply";
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
        Sending happens in Gmail. Operator prepares the draft; you review and send.
        Operator does not have permission to send mail on your behalf.
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
      {state.kind === "drafted" && <DraftBody draft={state.draft} />}
    </li>
  );
}

function DraftBody({ draft }: { draft: DraftResponse }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft.body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore clipboard failure */
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11.5px] text-white/45">Subject · {draft.subject}</span>
      <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-sans text-[13px] leading-relaxed text-white/90">
        {draft.body}
      </pre>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copy}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition",
            copied ? "bg-emerald-500/[0.12] text-emerald-200" : "bg-white/[0.05] text-white/80 hover:bg-white/[0.08]"
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy body"}
        </button>
        <a
          href={buildGmailComposeUrl(draft)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11.5px] font-medium text-black transition hover:bg-white/90"
        >
          Open in Gmail <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
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
