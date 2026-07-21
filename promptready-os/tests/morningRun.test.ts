/**
 * Morning Run · pipeline tests.
 *
 * syncGoogle() itself is swapped for a fake per test (it calls real
 * Google clients, which have nothing to talk to in Node) — everything
 * downstream of "a snapshot exists" runs for real: candidate
 * collection, drafting (via a stubbed Anthropic fetch), prepare(),
 * conflict detection, and the Operator's Read call.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/google/gmailClient", async () => {
  const actual = await vi.importActual<typeof import("@/services/google/gmailClient")>(
    "@/services/google/gmailClient"
  );
  return { ...actual, archiveMessage: vi.fn(async () => {}), unarchiveMessage: vi.fn(async () => {}) };
});

import { runMorningRun } from "@/services/morningRun/orchestrator";
import { useSourcesStore } from "@/store/sources";
import { useAiProviderStore } from "@/store/aiProvider";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import {
  useActionQueue,
  bootExecutors,
  GMAIL_SEND_EXECUTOR_ID,
  CALENDAR_MOVE_EXECUTOR_ID,
  GMAIL_ARCHIVE_EXECUTOR_ID
} from "@/services/executors";
import type { GmailMessage, GmailThread, CalendarEvent, WorkspaceSnapshot } from "@/services/google/types";
import type { BriefingItem } from "@/services/briefing/types";
import type { SyncResult } from "@/services/google/syncEngine";

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

function fakeSnapshot(): WorkspaceSnapshot {
  const staleThread = thread("t1", [msg({ id: "m1", date: NOW - 3 * DAY })]);
  const e1 = event({ id: "e1", summary: "Bridge call", startMs: NOW + 2 * 3600_000, endMs: NOW + 3 * 3600_000 });
  const e2 = event({ id: "e2", summary: "Müller demo", startMs: NOW + 2.5 * 3600_000, endMs: NOW + 3.5 * 3600_000 });
  return {
    syncedAt: NOW,
    selfEmail: "me@operator.center",
    messages: staleThread.messages,
    threads: [staleThread],
    events: [e1, e2],
    contacts: []
  };
}

function fakeBriefing(): BriefingItem[] {
  return [
    {
      id: "stale-customer-thread",
      detector: "stale-customer-thread",
      focus: "customers",
      priority: "high",
      confidence: 90,
      fact: "Hans Müller waiting 3 days",
      why: "",
      recommendation: "",
      verb: "open",
      evidence: []
    },
    {
      id: "calendar-conflict",
      detector: "calendar-conflict",
      focus: "calendar",
      priority: "high",
      confidence: 95,
      fact: "Two meetings overlap",
      why: "",
      recommendation: "",
      verb: "open",
      evidence: []
    }
  ];
}

/** Replace syncGoogle() with a fake that seeds the store directly —
 *  real Google clients have nothing to talk to under Node/no-window. */
function stubSyncGoogle(snapshot: WorkspaceSnapshot | null, briefing: BriefingItem[]) {
  useSourcesStore.setState((s) => ({
    syncGoogle: async (): Promise<SyncResult> => {
      useSourcesStore.setState({ snapshot, briefing });
      return { snapshot: snapshot as WorkspaceSnapshot, errors: [] };
    },
    google: { ...s.google, state: "connected" }
  }));
}

function anthropicResponse(text: string) {
  return {
    ok: true,
    json: async () => ({
      content: [{ type: "text", text }],
      usage: { input_tokens: 100, output_tokens: 20 }
    })
  };
}

beforeEach(() => {
  bootExecutors();
  useActionQueue.setState({ items: {}, order: [], log: [] });
  useSourcesStore.setState({
    google: {
      state: "disconnected",
      selfEmail: null,
      lastSyncMs: null,
      lastErrors: [],
      calendarWriteGranted: false,
      gmailModifyGranted: false
    },
    snapshot: null,
    briefing: [],
    panels: null
  });
  useAiProviderStore.setState({ anthropicKey: null });
  useOperatorMemoryStore.getState().reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runMorningRun · Load connectors", () => {
  it("skips honestly when Google isn't connected — no fake 'Ready'", async () => {
    const summary = await runMorningRun();
    expect(summary.skipped).toMatch(/not connected/i);
    expect(summary.draftsGenerated).toBe(0);
    expect(summary.actionsPrepared).toBe(0);
    expect(summary.operatorRead).toBeNull();
  });
});

describe("runMorningRun · full pipeline with AI key", () => {
  it("syncs, drafts, prepares both executors, and produces an Operator Read", async () => {
    stubSyncGoogle(fakeSnapshot(), fakeBriefing());
    useSourcesStore.setState((s) => ({ google: { ...s.google, calendarWriteGranted: true } }));
    useAiProviderStore.setState({ anthropicKey: "sk-ant-test" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => anthropicResponse("Thanks for reaching out, I will follow up shortly."))
    );

    const summary = await runMorningRun();

    expect(summary.skipped).toBeUndefined();
    expect(summary.draftsGenerated).toBe(1);
    expect(summary.actionsPrepared).toBe(2);
    expect(summary.executorCount).toBe(2);
    expect(summary.detectorsFired).toEqual(
      expect.arrayContaining(["stale-customer-thread", "calendar-conflict"])
    );
    expect(summary.aiTokens).toBeGreaterThan(0);
    expect(summary.operatorRead).toBe("Thanks for reaching out, I will follow up shortly.");

    const replyAction = useActionQueue.getState().items[`${GMAIL_SEND_EXECUTOR_ID}:hans@acme.de`];
    expect(replyAction.status).toBe("prepared");

    const moveAction = useActionQueue.getState().items[`${CALENDAR_MOVE_EXECUTOR_ID}:e2`];
    expect(moveAction.status).toBe("prepared");
  });

  it("never says a reply was sent — only prepared, since nothing executed", async () => {
    stubSyncGoogle(fakeSnapshot(), fakeBriefing());
    useAiProviderStore.setState({ anthropicKey: "sk-ant-test" });
    vi.stubGlobal("fetch", vi.fn(async () => anthropicResponse("Draft body here.")));

    await runMorningRun();
    const replyAction = useActionQueue.getState().items[`${GMAIL_SEND_EXECUTOR_ID}:hans@acme.de`];
    expect(replyAction.status).not.toBe("done");
    expect(replyAction.status).toBe("prepared");
  });
});

describe("runMorningRun · without an AI key", () => {
  it("still detects and prepares the calendar move, but generates zero drafts", async () => {
    stubSyncGoogle(fakeSnapshot(), fakeBriefing());
    useSourcesStore.setState((s) => ({ google: { ...s.google, calendarWriteGranted: true } }));
    // No anthropicKey set.

    const summary = await runMorningRun();
    expect(summary.draftsGenerated).toBe(0);
    expect(summary.actionsPrepared).toBe(1);
    expect(summary.executorCount).toBe(1);
    expect(summary.aiTokens).toBe(0);
    expect(summary.operatorRead).toBeNull();
    expect(useActionQueue.getState().items[`${CALENDAR_MOVE_EXECUTOR_ID}:e2`]?.status).toBe("prepared");
  });
});

describe("runMorningRun · Calendar write not granted", () => {
  it("detects the conflict but never prepares a move it already knows will fail on approval", async () => {
    stubSyncGoogle(fakeSnapshot(), fakeBriefing());
    // calendarWriteGranted stays false (default from beforeEach).
    const summary = await runMorningRun();
    expect(summary.actionsPrepared).toBe(0);
    // "detected" is honest (a conflict really was found); "prepared"
    // never happens, since approving it would be guaranteed to fail.
    expect(useActionQueue.getState().items[`${CALENDAR_MOVE_EXECUTOR_ID}:e2`]?.status).toBe("detected");
  });
});

describe("runMorningRun · Silent archive — confidence gates silent vs approval-required", () => {
  it("only silently completes the high-confidence noise message; the low-confidence one still needs approval", async () => {
    const snapshot = fakeSnapshot();
    const highConfidence = msg({
      id: "noise-high",
      threadId: "t-noise-high",
      date: NOW - DAY,
      fromAddress: "noreply@github.com",
      fromName: "GitHub",
      subject: "[repo] New issue opened"
    });
    const lowConfidence = msg({
      id: "noise-low",
      threadId: "t-noise-low",
      date: NOW - DAY,
      fromAddress: "notifications@some-random-startup.com",
      fromName: "Some Startup",
      subject: "Product update"
    });
    snapshot.messages = [...snapshot.messages, highConfidence, lowConfidence];
    stubSyncGoogle(snapshot, fakeBriefing());
    useSourcesStore.setState((s) => ({ google: { ...s.google, gmailModifyGranted: true } }));

    await runMorningRun();
    // prepare()'s auto-approve fires execute() without the orchestrator
    // awaiting it (same as every other silent action) — flush the
    // microtask queue so the real (mocked) archiveMessage() call
    // resolves before asserting the terminal status.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const highItem = useActionQueue.getState().items[`${GMAIL_ARCHIVE_EXECUTOR_ID}:noise-high`];
    expect(highItem.status).toBe("completed");
    expect(highItem.metadata?.silent).toBe(true);

    const lowItem = useActionQueue.getState().items[`${GMAIL_ARCHIVE_EXECUTOR_ID}:noise-low`];
    expect(lowItem.status).toBe("prepared");
    expect(lowItem.metadata?.silent).toBeUndefined();
  });

  it("never prepares an archive action before the gmail.modify scope is granted", async () => {
    const snapshot = fakeSnapshot();
    const noise = msg({
      id: "noise-high",
      threadId: "t-noise-high",
      date: NOW - DAY,
      fromAddress: "noreply@github.com",
      subject: "[repo] New issue opened"
    });
    snapshot.messages = [...snapshot.messages, noise];
    stubSyncGoogle(snapshot, fakeBriefing());
    // gmailModifyGranted stays false (default).

    await runMorningRun();
    expect(useActionQueue.getState().items[`${GMAIL_ARCHIVE_EXECUTOR_ID}:noise-high`]).toBeUndefined();
  });
});

describe("runMorningRun · re-runs never clobber a founder's decision", () => {
  it("a second run's prepare() doesn't reset an action already approved between runs", async () => {
    stubSyncGoogle(fakeSnapshot(), fakeBriefing());
    useSourcesStore.setState((s) => ({ google: { ...s.google, calendarWriteGranted: true } }));

    await runMorningRun();
    const id = `${CALENDAR_MOVE_EXECUTOR_ID}:e2`;
    expect(useActionQueue.getState().items[id].status).toBe("prepared");

    // Founder approves between runs.
    useActionQueue.getState().approve(id);
    expect(useActionQueue.getState().items[id].status).toBe("waiting_approval");
    expect(useActionQueue.getState().items[id].approvedAt).toBeGreaterThan(0);

    // Morning Run fires again (e.g. manual refresh) — must not reset it.
    await runMorningRun();
    expect(useActionQueue.getState().items[id].status).toBe("waiting_approval");
    expect(useActionQueue.getState().items[id].approvedAt).toBeGreaterThan(0);
  });
});
