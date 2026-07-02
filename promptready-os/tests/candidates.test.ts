import { describe, expect, it } from "vitest";
import { collectCandidates } from "@/services/drafting/candidates";
import type { GmailMessage, GmailThread, WorkspaceSnapshot } from "@/services/google/types";

const NOW = Date.UTC(2026, 5, 16, 8, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function msg(p: Partial<GmailMessage> & { id: string; date: number }): GmailMessage {
  return {
    id: p.id,
    threadId: p.threadId ?? `t-${p.id}`,
    date: p.date,
    fromName: p.fromName ?? "",
    fromAddress: (p.fromAddress ?? "someone@example.com").toLowerCase(),
    toAddresses: p.toAddresses ?? ["me@operator.center"],
    subject: p.subject ?? "",
    snippet: p.snippet ?? "",
    isFromMe: p.isFromMe ?? false,
    isInInbox: p.isInInbox ?? true,
    isUnread: p.isUnread ?? false,
    labels: p.labels ?? []
  };
}

function thread(id: string, msgs: GmailMessage[]): GmailThread {
  const subject = msgs.length > 0 ? msgs[msgs.length - 1].subject : "";
  return { id, subject, messages: msgs.map((m) => ({ ...m, threadId: id })) };
}

function snap(threads: GmailThread[]): WorkspaceSnapshot {
  return { syncedAt: NOW, selfEmail: "me@operator.center", messages: [], threads, events: [], contacts: [] };
}

describe("collectCandidates", () => {
  it("returns null-safe empty array with no snapshot", () => {
    expect(collectCandidates(null)).toEqual([]);
  });

  it("includes a thread whose last message is inbound and >=1 day old", () => {
    const t = thread("t1", [msg({ id: "m1", date: NOW - 3 * DAY, fromAddress: "hans@acme.de", fromName: "Hans" })]);
    const out = collectCandidates(snap([t]));
    expect(out).toHaveLength(1);
    expect(out[0].customerEmail).toBe("hans@acme.de");
    expect(out[0].daysSinceLastInbound).toBe(3);
  });

  it("excludes a thread whose last message is from me", () => {
    const t = thread("t1", [msg({ id: "m1", date: NOW - 3 * DAY, isFromMe: true })]);
    expect(collectCandidates(snap([t]))).toEqual([]);
  });

  it("excludes noise senders (no-reply prefixes, known automated domains)", () => {
    const t1 = thread("t1", [msg({ id: "m1", date: NOW - 3 * DAY, fromAddress: "noreply@service.com" })]);
    const t2 = thread("t2", [msg({ id: "m2", date: NOW - 3 * DAY, fromAddress: "someone@github.com" })]);
    expect(collectCandidates(snap([t1, t2]))).toEqual([]);
  });

  it("excludes messages inbound less than a day ago", () => {
    const t = thread("t1", [msg({ id: "m1", date: NOW - 3 * 60 * 60 * 1000, fromAddress: "hans@acme.de" })]);
    expect(collectCandidates(snap([t]))).toEqual([]);
  });

  it("sorts by longest-waiting customer first", () => {
    const t1 = thread("t1", [msg({ id: "m1", date: NOW - 2 * DAY, fromAddress: "a@x.com" })]);
    const t2 = thread("t2", [msg({ id: "m2", date: NOW - 6 * DAY, fromAddress: "b@x.com" })]);
    const out = collectCandidates(snap([t1, t2]));
    expect(out.map((c) => c.customerEmail)).toEqual(["b@x.com", "a@x.com"]);
  });
});
