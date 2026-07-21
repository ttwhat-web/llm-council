/**
 * Delegation Engine · plan builder tests.
 *
 * delegate() is exercised directly against hand-built DelegationContext
 * objects (no store plumbing needed — the context is the exact same
 * seam draftReply()/buildDraftPrompt() already use), while the Action
 * Queue itself is the real store: every planned action must show up
 * there for real, with real statuses, receipts, and log entries.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/google/gmailClient", () => ({
  archiveMessage: vi.fn(async () => {}),
  unarchiveMessage: vi.fn(async () => {})
}));

vi.mock("@/services/drafting/draftReply", () => ({
  draftReply: vi.fn()
}));

import { delegate } from "@/services/delegation/buildPlan";
import { draftReply } from "@/services/drafting/draftReply";
import { useActionQueue, GMAIL_SEND_EXECUTOR_ID, CALENDAR_MOVE_EXECUTOR_ID, GMAIL_ARCHIVE_EXECUTOR_ID } from "@/services/executors";
import { registerExecutor, __clearRegistryForTests } from "@/services/executors/registry";
import { gmailSendExecutor } from "@/services/executors/gmailSendExecutor";
import { calendarMoveExecutor } from "@/services/executors/calendarMoveExecutor";
import { gmailArchiveExecutor } from "@/services/executors/gmailArchiveExecutor";
import { buildTimeline } from "@/services/executors/timeline";
import { EMPTY_MEMORY } from "@/services/operator/memorySeed";
import type { DelegationContext } from "@/services/delegation/types";
import type { GmailMessage, GmailThread, CalendarEvent, WorkspaceSnapshot } from "@/services/google/types";

const mockDraftReply = vi.mocked(draftReply);

const NOW = Date.UTC(2026, 5, 16, 8, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function msg(p: Partial<GmailMessage> & { id: string; date: number }): GmailMessage {
  return {
    id: p.id,
    threadId: p.threadId ?? `t-${p.id}`,
    date: p.date,
    fromName: p.fromName ?? "Hans Müller",
    fromAddress: (p.fromAddress ?? "hans@acme.de").toLowerCase(),
    toAddresses: p.toAddresses ?? ["me@operator.center"],
    subject: p.subject ?? "Tour package",
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

function event(p: Partial<CalendarEvent> & { id: string; startMs: number; endMs: number }): CalendarEvent {
  return {
    id: p.id,
    calendarId: p.calendarId ?? "primary",
    summary: p.summary ?? "Meeting",
    description: p.description ?? "",
    startMs: p.startMs,
    endMs: p.endMs,
    isAllDay: p.isAllDay ?? false,
    location: p.location ?? "",
    attendees: p.attendees ?? [],
    conferenceUrl: p.conferenceUrl
  };
}

function snap(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  return {
    syncedAt: NOW,
    selfEmail: "me@operator.center",
    messages: [],
    threads: [],
    events: [],
    contacts: [],
    ...overrides
  };
}

function ctx(overrides: Partial<DelegationContext> = {}): DelegationContext {
  return {
    snapshot: snap(),
    memory: { ...EMPTY_MEMORY, firstName: "Tunç" },
    anthropicKey: "fake-key",
    calendarWriteGranted: true,
    gmailModifyGranted: true,
    ...overrides
  };
}

function fakeDraft(customerEmail: string) {
  return {
    ok: true as const,
    draft: {
      to: customerEmail,
      subject: "Re: Tour package",
      body: "Following up — any update?",
      customerEmail,
      promptVersion: "v1",
      model: "test-model"
    }
  };
}

beforeEach(() => {
  __clearRegistryForTests();
  useActionQueue.getState().reset();
  registerExecutor(gmailSendExecutor);
  registerExecutor(calendarMoveExecutor);
  registerExecutor(gmailArchiveExecutor);
  mockDraftReply.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("delegate() · one-action delegation", () => {
  it("'Resolve tomorrow's calendar conflicts.' prepares exactly one calendar move", async () => {
    const e1 = event({ id: "e1", summary: "Bridge call", startMs: NOW + 2 * 3600_000, endMs: NOW + 3 * 3600_000 });
    const e2 = event({ id: "e2", summary: "Müller demo", startMs: NOW + 2.5 * 3600_000, endMs: NOW + 3.5 * 3600_000 });
    const plan = await delegate("Resolve tomorrow's calendar conflicts.", ctx({ snapshot: snap({ events: [e1, e2] }) }));

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0].kind).toBe("calendarMove");
    expect(plan.issues).toEqual([]);
    const item = useActionQueue.getState().get(plan.actions[0].queueId);
    expect(item?.status).toBe("prepared"); // gcal.move is pre-execute — never auto-runs
  });
});

describe("delegate() · multi-action and mixed-executor delegation", () => {
  it("'Handle my morning.' prepares a reply, a calendar move, and an archive together", async () => {
    mockDraftReply.mockResolvedValue(fakeDraft("hans@acme.de"));
    const staleThread = thread("t1", [msg({ id: "m1", date: NOW - 3 * DAY })]);
    const e1 = event({ id: "e1", summary: "Bridge call", startMs: NOW + 2 * 3600_000, endMs: NOW + 3 * 3600_000 });
    const e2 = event({ id: "e2", summary: "Müller demo", startMs: NOW + 2.5 * 3600_000, endMs: NOW + 3.5 * 3600_000 });
    const noiseMsg = msg({ id: "n1", date: NOW, fromAddress: "noreply@github.com", fromName: "GitHub", subject: "[repo] issue" });

    const plan = await delegate(
      "Handle my morning.",
      ctx({ snapshot: snap({ threads: [staleThread], events: [e1, e2], messages: [noiseMsg] }) })
    );

    expect(plan.issues).toEqual([]);
    expect(plan.actions.map((a) => a.kind).sort()).toEqual(["archive", "calendarMove", "reply"]);
  });

  it("'Reply to Hans and move the internal meeting.' prepares one Gmail action and one Calendar action", async () => {
    mockDraftReply.mockResolvedValue(fakeDraft("hans@acme.de"));
    const staleThread = thread("t1", [msg({ id: "m1", date: NOW - 3 * DAY, fromName: "Hans Müller", fromAddress: "hans@acme.de" })]);
    const internal = event({ id: "e1", summary: "Internal meeting", startMs: NOW + 2 * 3600_000, endMs: NOW + 3 * 3600_000 });
    const external = event({ id: "e2", summary: "Client call", startMs: NOW + 2.5 * 3600_000, endMs: NOW + 3.5 * 3600_000 });

    const plan = await delegate(
      "Reply to Hans and move the internal meeting.",
      ctx({ snapshot: snap({ threads: [staleThread], events: [internal, external] }) })
    );

    expect(plan.issues).toEqual([]);
    expect(plan.actions).toHaveLength(2);
    const reply = plan.actions.find((a) => a.kind === "reply");
    const move = plan.actions.find((a) => a.kind === "calendarMove");
    expect(reply?.queueId).toBe(`${GMAIL_SEND_EXECUTOR_ID}:hans@acme.de`);
    // The internal meeting was named directly, so IT is the one that moves.
    expect(move?.queueId).toBe(`${CALENDAR_MOVE_EXECUTOR_ID}:e1`);
  });
});

describe("delegate() · silent and approval-required actions together", () => {
  it("archives a high-confidence sender silently and a lower-confidence one only with approval", async () => {
    vi.useFakeTimers({ now: NOW });
    const strong = msg({ id: "n1", date: NOW, fromAddress: "noreply@github.com", subject: "[repo] issue" });
    const weak = msg({ id: "n2", date: NOW, fromAddress: "notifications@some-random-startup.com", subject: "Weekly digest" });

    const plan = await delegate("Take care of the low-risk inbox noise.", ctx({ snapshot: snap({ messages: [strong, weak] }) }));
    expect(plan.actions).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(50);

    const strongItem = useActionQueue.getState().get(`${GMAIL_ARCHIVE_EXECUTOR_ID}:n1`);
    const weakItem = useActionQueue.getState().get(`${GMAIL_ARCHIVE_EXECUTOR_ID}:n2`);
    expect(strongItem?.status).toBe("completed"); // silent — ran without asking
    expect(weakItem?.status).toBe("prepared"); // needs a real founder decision first
  });
});

describe("delegate() · unsupported executor", () => {
  it("says plainly that replying isn't available when gmail.send isn't registered", async () => {
    __clearRegistryForTests();
    registerExecutor(calendarMoveExecutor);
    registerExecutor(gmailArchiveExecutor);
    mockDraftReply.mockResolvedValue(fakeDraft("hans@acme.de"));

    const staleThread = thread("t1", [msg({ id: "m1", date: NOW - 3 * DAY })]);
    const plan = await delegate("Follow up with the customers who are waiting.", ctx({ snapshot: snap({ threads: [staleThread] }) }));

    expect(plan.actions).toEqual([]);
    expect(plan.issues.some((i) => i.kind === "unsupported-request" && /isn.t available/i.test(i.message))).toBe(true);
  });
});

describe("delegate() · missing permission", () => {
  it("says plainly that calendar write isn't granted, and prepares nothing", async () => {
    const e1 = event({ id: "e1", summary: "Bridge call", startMs: NOW + 2 * 3600_000, endMs: NOW + 3 * 3600_000 });
    const e2 = event({ id: "e2", summary: "Müller demo", startMs: NOW + 2.5 * 3600_000, endMs: NOW + 3.5 * 3600_000 });
    const plan = await delegate(
      "Resolve tomorrow's calendar conflicts.",
      ctx({ snapshot: snap({ events: [e1, e2] }), calendarWriteGranted: false })
    );
    expect(plan.actions).toEqual([]);
    expect(plan.issues).toEqual([{ kind: "missing-permission", message: expect.stringContaining("Calendar write isn't granted") }]);
  });
});

describe("delegate() · ambiguity", () => {
  it("refuses to guess between two people matching the same hint", async () => {
    const t1 = thread("t1", [msg({ id: "m1", date: NOW - 3 * DAY, fromName: "Hans Müller", fromAddress: "hans.mueller@acme.de" })]);
    const t2 = thread("t2", [msg({ id: "m2", date: NOW - 4 * DAY, fromName: "Hans Weber", fromAddress: "hans.weber@acme.de" })]);
    const plan = await delegate("Reply to Hans.", ctx({ snapshot: snap({ threads: [t1, t2] }) }));

    expect(plan.actions).toEqual([]);
    expect(plan.issues).toEqual([{ kind: "ambiguous-person", message: expect.stringContaining('More than one person matches "Hans"') }]);
    expect(mockDraftReply).not.toHaveBeenCalled();
  });
});

describe("delegate() · duplicate suppression", () => {
  it("naming the same person twice in one request only prepares one reply", async () => {
    mockDraftReply.mockResolvedValue(fakeDraft("hans@acme.de"));
    const staleThread = thread("t1", [msg({ id: "m1", date: NOW - 3 * DAY, fromName: "Hans Müller", fromAddress: "hans@acme.de" })]);
    const plan = await delegate("Reply to Hans and follow up with Hans.", ctx({ snapshot: snap({ threads: [staleThread] }) }));

    expect(plan.actions.filter((a) => a.kind === "reply")).toHaveLength(1);
    expect(mockDraftReply).toHaveBeenCalledTimes(1);
  });
});

describe("delegate() · partial success", () => {
  it("keeps the drafts that succeeded and reports the one that failed", async () => {
    mockDraftReply
      .mockResolvedValueOnce(fakeDraft("hans@acme.de"))
      .mockResolvedValueOnce({ ok: false, error: "Anthropic 500" });
    const t1 = thread("t1", [msg({ id: "m1", date: NOW - 6 * DAY, fromName: "Hans Müller", fromAddress: "hans@acme.de" })]);
    const t2 = thread("t2", [msg({ id: "m2", date: NOW - 5 * DAY, fromName: "Anna Klein", fromAddress: "anna@klein.de" })]);

    const plan = await delegate("Follow up with the customers who are waiting.", ctx({ snapshot: snap({ threads: [t1, t2] }) }));

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0].queueId).toBe(`${GMAIL_SEND_EXECUTOR_ID}:hans@acme.de`);
    expect(plan.issues).toEqual([
      { kind: "executor-failure", message: expect.stringContaining("Anna Klein") }
    ]);
  });
});

describe("delegate() · Company Brain evidence injection", () => {
  it("grounds the planned reply's evidence and the draft prompt with what Operator remembers", async () => {
    mockDraftReply.mockResolvedValue(fakeDraft("hans@acme.de"));
    const message = msg({ id: "m1", date: NOW - 3 * DAY, fromName: "Hans Müller", fromAddress: "hans@acme.de" });
    const staleThread = thread("t1", [message]);

    const plan = await delegate(
      "Reply to Hans.",
      ctx({
        snapshot: snap({ threads: [staleThread] }),
        companyBrainContext: {
          snapshot: snap({ messages: [message], threads: [staleThread] }),
          actionItems: {},
          actionLog: [],
          memory: { ...EMPTY_MEMORY, rememberThese: "Hans Müller prefers German." },
          candidates: {
            k1: {
              key: "k1",
              kind: "language",
              subjectLabel: "Hans Müller",
              text: "Hans Müller prefers German.",
              status: "saved",
              evidenceCount: 2,
              firstSeenAt: NOW - 10 * DAY,
              updatedAt: NOW - 10 * DAY
            }
          },
          noteOverrides: {},
          feedbackEvents: [],
          now: NOW
        }
      })
    );

    const reply = plan.actions.find((a) => a.kind === "reply");
    expect(reply?.why).toContain("Hans Müller prefers German.");
    expect(mockDraftReply).toHaveBeenCalledWith(
      expect.objectContaining({ companyBrainSummary: expect.stringContaining("Hans Müller prefers German.") }),
      "fake-key"
    );
  });

  it("never grounds anything when no Company Brain context is supplied — fully backward compatible", async () => {
    mockDraftReply.mockResolvedValue(fakeDraft("hans@acme.de"));
    const staleThread = thread("t1", [msg({ id: "m1", date: NOW - 3 * DAY, fromName: "Hans Müller", fromAddress: "hans@acme.de" })]);
    await delegate("Reply to Hans.", ctx({ snapshot: snap({ threads: [staleThread] }) }));
    expect(mockDraftReply).toHaveBeenCalledWith(expect.objectContaining({ companyBrainSummary: undefined }), "fake-key");
  });
});

describe("delegate() · receipts and Timeline creation", () => {
  it("a silently-archived action leaves a real receipt and a real Timeline entry", async () => {
    vi.useFakeTimers({ now: NOW });
    const strong = msg({ id: "n1", date: NOW, fromAddress: "noreply@github.com", subject: "[repo] issue" });
    const plan = await delegate("Take care of the low-risk inbox noise.", ctx({ snapshot: snap({ messages: [strong] }) }));
    await vi.advanceTimersByTimeAsync(50);

    const item = useActionQueue.getState().get(plan.actions[0].queueId);
    expect(item?.status).toBe("completed");
    expect(item?.receipt).toBeTruthy();

    const { log, items } = useActionQueue.getState();
    const timeline = buildTimeline(log, items);
    expect(timeline.some((t) => t.actionId === plan.actions[0].queueId && t.event === "completed")).toBe(true);
  });
});
